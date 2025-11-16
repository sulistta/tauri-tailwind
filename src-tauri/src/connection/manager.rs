use crate::connection::error::ConnectionError;
use crate::logging::{Logger, LogCategory};
use crate::whatsapp::WhatsAppClient;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};

/// Represents the current state of the WhatsApp connection
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum ConnectionState {
    Uninitialized,
    Initializing,
    Connected { phone_number: String },
    Disconnected,
    Error { message: String },
}

/// Additional state data that doesn't affect the core connection state
#[derive(Debug, Clone, Default)]
struct StateMetadata {
    qr_code: Option<String>,
}

/// Recovery state tracking
#[derive(Debug, Clone)]
struct RecoveryState {
    attempt_count: u32,
    last_attempt_time: Option<std::time::Instant>,
    is_recovering: bool,
}

impl Default for RecoveryState {
    fn default() -> Self {
        Self {
            attempt_count: 0,
            last_attempt_time: None,
            is_recovering: false,
        }
    }
}

/// Result returned from initialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitializationResult {
    pub state: ConnectionState,
    pub has_session: bool,
    pub requires_qr: bool,
}

/// Manages the WhatsApp connection lifecycle and state
pub struct ConnectionManager {
    client: Arc<Mutex<Option<WhatsAppClient>>>,
    state: Arc<Mutex<ConnectionState>>,
    metadata: Arc<Mutex<StateMetadata>>,
    recovery_state: Arc<Mutex<RecoveryState>>,
    initialization_lock: Arc<Mutex<()>>,
    session_cache: Arc<Mutex<Option<bool>>>,
    app_handle: AppHandle,
    logger: Arc<Logger>,
}

impl ConnectionManager {
    /// Create a new ConnectionManager instance
    pub fn new(app_handle: AppHandle, logger: Arc<Logger>) -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
            state: Arc::new(Mutex::new(ConnectionState::Uninitialized)),
            metadata: Arc::new(Mutex::new(StateMetadata::default())),
            recovery_state: Arc::new(Mutex::new(RecoveryState::default())),
            initialization_lock: Arc::new(Mutex::new(())),
            session_cache: Arc::new(Mutex::new(None)),
            app_handle,
            logger,
        }
    }

    /// Initialize the connection with session check - idempotent operation
    /// This method checks for an existing session and initializes the client if needed
    /// 
    /// Concurrent initialization requests are serialized using a mutex with a 30-second timeout.
    /// If the timeout is exceeded, the request is rejected with a clear error message.
    pub async fn initialize(&self) -> Result<InitializationResult, String> {
        // Try to acquire initialization lock with timeout to prevent concurrent initialization
        // This ensures only one initialization can proceed at a time
        let _lock = match timeout(Duration::from_secs(30), self.initialization_lock.lock()).await
        {
            Ok(lock) => {
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "Acquired initialization lock".to_string(),
                    )
                    .await;
                lock
            }
            Err(_) => {
                let error = ConnectionError::InitializationBlocked {
                    duration_seconds: 30,
                };
                
                self.logger
                    .error(
                        LogCategory::WhatsApp,
                        error.technical_message(),
                    )
                    .await;
                
                // Emit error event to frontend
                let _ = self.app_handle.emit("whatsapp_error", serde_json::json!({
                    "error": error.clone(),
                    "message": error.user_message(),
                    "category": error.category(),
                    "timestamp": chrono::Utc::now().timestamp_millis(),
                }));
                
                return Err(error.user_message());
            }
        };

        // Check current state - if already initialized or initializing, return early
        let current_state = self.get_state().await;
        match current_state {
            ConnectionState::Initializing => {
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "Initialization already in progress, returning current state".to_string(),
                    )
                    .await;
                return Ok(InitializationResult {
                    state: current_state,
                    has_session: self.has_session().await,
                    requires_qr: !self.has_session().await,
                });
            }
            ConnectionState::Connected { .. } => {
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "Already connected, skipping initialization".to_string(),
                    )
                    .await;
                return Ok(InitializationResult {
                    state: current_state,
                    has_session: true,
                    requires_qr: false,
                });
            }
            _ => {
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "Proceeding with initialization".to_string(),
                    )
                    .await;
            }
        }

        // Set state to initializing
        self.set_state(ConnectionState::Initializing).await;

        self.logger
            .debug(LogCategory::WhatsApp, "Initializing connection".to_string())
            .await;

        // Check for existing session
        let has_session = self.check_session().await;

        // Get or create client
        let mut client_guard = self.client.lock().await;
        let client = if let Some(existing_client) = client_guard.as_ref() {
            // Check if existing client is still running
            if existing_client.is_running().await {
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "Using existing WhatsApp client".to_string(),
                    )
                    .await;
                existing_client
            } else {
                // Client exists but not running, create new one
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "Creating new WhatsApp client".to_string(),
                    )
                    .await;
                let new_client = WhatsAppClient::new(self.app_handle.clone());
                *client_guard = Some(new_client);
                client_guard.as_ref().unwrap()
            }
        } else {
            // No client exists, create new one
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Creating new WhatsApp client".to_string(),
                )
                .await;
            let new_client = WhatsAppClient::new(self.app_handle.clone());
            *client_guard = Some(new_client);
            client_guard.as_ref().unwrap()
        };

        // Initialize the client with timeout to prevent hanging
        let init_result = match timeout(Duration::from_secs(30), client.initialize()).await {
            Ok(result) => result,
            Err(_) => {
                drop(client_guard);
                
                let error = ConnectionError::InitializationTimeout {
                    duration_seconds: 30,
                };
                
                self.logger
                    .error(
                        LogCategory::WhatsApp,
                        error.technical_message(),
                    )
                    .await;

                self.set_state_with_error(ConnectionState::Error {
                    message: error.user_message(),
                }, &error)
                .await;
                
                // Lock will be automatically released when _lock goes out of scope
                return Err(error.user_message());
            }
        };

        match init_result {
            Ok(_) => {
                drop(client_guard);

                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        "WhatsApp client initialized successfully".to_string(),
                    )
                    .await;

                // If no session exists, we'll wait for QR code
                if !has_session {
                    self.set_state(ConnectionState::Disconnected).await;
                }

                // Lock will be automatically released when _lock goes out of scope
                Ok(InitializationResult {
                    state: self.get_state().await,
                    has_session,
                    requires_qr: !has_session,
                })
            }
            Err(e) => {
                drop(client_guard);

                let error = ConnectionError::InitializationFailed {
                    message: e.clone(),
                    recoverable: true,
                };
                
                self.logger
                    .error(
                        LogCategory::WhatsApp,
                        error.technical_message(),
                    )
                    .await;

                self.set_state_with_error(ConnectionState::Error {
                    message: error.user_message(),
                }, &error)
                .await;

                // Lock will be automatically released when _lock goes out of scope
                Err(error.user_message())
            }
        }
    }

    /// Get the current connection state without side effects
    pub async fn get_state(&self) -> ConnectionState {
        let state = self.state.lock().await;
        state.clone()
    }

    /// Connect or reconnect to WhatsApp
    /// This method ensures the client is initialized before attempting connection
    /// 
    /// If initialization is in progress, this method will wait for it to complete
    /// before attempting to connect.
    pub async fn connect(&self) -> Result<(), String> {
        self.logger
            .debug(LogCategory::WhatsApp, "Connect requested".to_string())
            .await;

        // Reset recovery state on manual connect
        self.reset_recovery().await;

        // Check if initialization is in progress
        if self.is_initializing().await {
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Initialization in progress, waiting for completion".to_string(),
                )
                .await;
            
            // Wait a bit for initialization to complete
            tokio::time::sleep(Duration::from_millis(500)).await;
            
            // Check again
            if self.is_initializing().await {
                let error = ConnectionError::InitializationInProgress;
                self.logger
                    .warning(
                        LogCategory::WhatsApp,
                        error.technical_message(),
                    )
                    .await;
                return Err(error.user_message());
            }
        }

        // Ensure client is initialized
        let client_guard = self.client.lock().await;
        if client_guard.is_none() {
            drop(client_guard);
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Client not initialized, initializing first".to_string(),
                )
                .await;
            self.initialize().await?;
            return Ok(());
        }

        let client = client_guard.as_ref().unwrap();

        // Check if client is running
        if !client.is_running().await {
            drop(client_guard);
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Client not running, restarting".to_string(),
                )
                .await;

            // Restart the client with timeout
            let client_guard = self.client.lock().await;
            if let Some(client) = client_guard.as_ref() {
                match timeout(Duration::from_secs(30), client.restart()).await {
                    Ok(Ok(_)) => {
                        self.logger
                            .info(
                                LogCategory::WhatsApp,
                                "WhatsApp client restarted successfully".to_string(),
                            )
                            .await;
                        Ok(())
                    }
                    Ok(Err(e)) => {
                        let error = ConnectionError::InitializationFailed {
                            message: e,
                            recoverable: true,
                        };
                        self.logger
                            .error(
                                LogCategory::WhatsApp,
                                error.technical_message(),
                            )
                            .await;
                        self.set_state_with_error(ConnectionState::Error {
                            message: error.user_message(),
                        }, &error)
                        .await;
                        Err(error.user_message())
                    }
                    Err(_) => {
                        let error = ConnectionError::ConnectionTimeout {
                            duration_seconds: 30,
                        };
                        self.logger
                            .error(
                                LogCategory::WhatsApp,
                                error.technical_message(),
                            )
                            .await;
                        self.set_state_with_error(ConnectionState::Error {
                            message: error.user_message(),
                        }, &error)
                        .await;
                        Err(error.user_message())
                    }
                }
            } else {
                let error = ConnectionError::ProcessNotRunning;
                self.logger
                    .error(
                        LogCategory::WhatsApp,
                        error.technical_message(),
                    )
                    .await;
                Err(error.user_message())
            }
        } else {
            drop(client_guard);
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Client already running".to_string(),
                )
                .await;
            Ok(())
        }
    }

    /// Disconnect from WhatsApp gracefully
    /// 
    /// This method will wait if initialization is in progress to avoid
    /// race conditions between initialization and disconnection.
    pub async fn disconnect(&self) -> Result<(), String> {
        // Check if initialization is in progress
        if self.is_initializing().await {
            self.logger
                .warning(
                    LogCategory::WhatsApp,
                    "Cannot disconnect: initialization is in progress. Waiting for initialization to complete.".to_string(),
                )
                .await;
            
            // Wait for initialization to complete (with timeout)
            let mut attempts = 0;
            while self.is_initializing().await && attempts < 10 {
                tokio::time::sleep(Duration::from_millis(500)).await;
                attempts += 1;
            }
            
            if self.is_initializing().await {
                let error = ConnectionError::InitializationInProgress;
                return Err(error.user_message());
            }
        }

        self.logger
            .info(LogCategory::WhatsApp, "Disconnecting".to_string())
            .await;

        let mut client_guard = self.client.lock().await;
        if let Some(client) = client_guard.take() {
            // Kill the process
            drop(client);
            self.set_state(ConnectionState::Disconnected).await;
            self.logger
                .info(
                    LogCategory::WhatsApp,
                    "Disconnected successfully".to_string(),
                )
                .await;
            Ok(())
        } else {
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "No client to disconnect".to_string(),
                )
                .await;
            self.set_state(ConnectionState::Disconnected).await;
            Ok(())
        }
    }

    /// Check if a session exists (uses cached result)
    pub async fn has_session(&self) -> bool {
        let cache = self.session_cache.lock().await;
        if let Some(cached) = *cache {
            return cached;
        }
        drop(cache);

        // Cache miss, check session
        self.check_session().await
    }

    /// Get a reference to the WhatsApp client for sending commands
    pub async fn get_client(&self) -> Option<Arc<Mutex<Option<WhatsAppClient>>>> {
        let client_guard = self.client.lock().await;
        if client_guard.is_some() {
            Some(self.client.clone())
        } else {
            None
        }
    }

    /// Attempt automatic recovery with exponential backoff
    /// Returns true if recovery should be attempted, false if max attempts reached or already recovering
    pub async fn attempt_recovery(&self, max_attempts: u32) -> Result<bool, String> {
        let mut recovery = self.recovery_state.lock().await;

        // Check if already recovering
        if recovery.is_recovering {
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Recovery already in progress".to_string(),
                )
                .await;
            return Ok(false);
        }

        // Check if max attempts reached
        if recovery.attempt_count >= max_attempts {
            let error = ConnectionError::RecoveryFailed {
                attempts: recovery.attempt_count,
                last_error: "Maximum recovery attempts reached".to_string(),
            };
            
            self.logger
                .warning(
                    LogCategory::WhatsApp,
                    error.technical_message(),
                )
                .await;
            
            // Emit recovery failed event with error details
            let _ = self.app_handle.emit("whatsapp_recovery_failed", serde_json::json!({
                "error": error.clone(),
                "message": error.user_message(),
                "attempts": recovery.attempt_count,
                "max_attempts": max_attempts,
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }));
            
            return Ok(false);
        }

        // Check if we need to wait for backoff
        if let Some(last_attempt) = recovery.last_attempt_time {
            let backoff_duration = self.calculate_backoff_duration(recovery.attempt_count);
            let elapsed = last_attempt.elapsed();
            
            if elapsed < backoff_duration {
                let remaining = backoff_duration - elapsed;
                self.logger
                    .debug(
                        LogCategory::WhatsApp,
                        format!("Backoff in progress, {} seconds remaining", remaining.as_secs()),
                    )
                    .await;
                return Ok(false);
            }
        }

        // Start recovery attempt
        recovery.is_recovering = true;
        recovery.attempt_count += 1;
        recovery.last_attempt_time = Some(std::time::Instant::now());
        
        let attempt_num = recovery.attempt_count;
        drop(recovery);

        self.logger
            .info(
                LogCategory::WhatsApp,
                format!("Starting recovery attempt {}/{}", attempt_num, max_attempts),
            )
            .await;

        // Emit recovery started event
        let _ = self.app_handle.emit("whatsapp_recovery_started", serde_json::json!({
            "attempt": attempt_num,
            "max_attempts": max_attempts,
            "timestamp": chrono::Utc::now().timestamp_millis(),
        }));

        // Attempt to reconnect
        let result = self.connect().await;

        // Update recovery state
        let mut recovery = self.recovery_state.lock().await;
        recovery.is_recovering = false;

        match result {
            Ok(_) => {
                self.logger
                    .info(
                        LogCategory::WhatsApp,
                        "Recovery successful".to_string(),
                    )
                    .await;
                
                // Reset recovery state on success
                recovery.attempt_count = 0;
                recovery.last_attempt_time = None;
                
                // Emit recovery success event
                let _ = self.app_handle.emit("whatsapp_recovery_success", serde_json::json!({
                    "attempts": attempt_num,
                    "timestamp": chrono::Utc::now().timestamp_millis(),
                }));
                
                Ok(true)
            }
            Err(e) => {
                self.logger
                    .warning(
                        LogCategory::WhatsApp,
                        format!("Recovery attempt {} failed: {}", attempt_num, e),
                    )
                    .await;
                
                // Emit recovery attempt failed event
                let _ = self.app_handle.emit("whatsapp_recovery_attempt_failed", serde_json::json!({
                    "attempt": attempt_num,
                    "max_attempts": max_attempts,
                    "error": e,
                    "timestamp": chrono::Utc::now().timestamp_millis(),
                }));
                
                Err(e)
            }
        }
    }

    /// Reset recovery state (called on manual connect or successful connection)
    pub async fn reset_recovery(&self) {
        let mut recovery = self.recovery_state.lock().await;
        recovery.attempt_count = 0;
        recovery.last_attempt_time = None;
        recovery.is_recovering = false;
        
        self.logger
            .debug(
                LogCategory::WhatsApp,
                "Recovery state reset".to_string(),
            )
            .await;
    }

    /// Get current recovery state information
    pub async fn get_recovery_info(&self) -> (u32, bool) {
        let recovery = self.recovery_state.lock().await;
        (recovery.attempt_count, recovery.is_recovering)
    }

    /// Check if initialization is in progress
    pub async fn is_initializing(&self) -> bool {
        let state = self.state.lock().await;
        matches!(*state, ConnectionState::Initializing)
    }

    /// Try to acquire the initialization lock without blocking
    /// Returns true if the lock is available (not held), false if it's currently held
    /// This is useful for checking if an initialization operation is in progress
    pub fn is_initialization_locked(&self) -> bool {
        self.initialization_lock.try_lock().is_err()
    }

    /// Update the connection state when events are received
    pub async fn handle_state_event(&self, event: &str, data: &serde_json::Value) {
        match event {
            "whatsapp_qr" => {
                // Store QR code and emit state change
                if let Some(qr_code) = data.get("qr").and_then(|q| q.as_str()) {
                    self.logger
                        .debug(
                            LogCategory::WhatsApp,
                            "QR code generated".to_string(),
                        )
                        .await;
                    
                    let mut metadata = self.metadata.lock().await;
                    metadata.qr_code = Some(qr_code.to_string());
                    drop(metadata);
                    
                    // Emit state change with QR code
                    self.emit_state_change_with_metadata().await;
                }
            }
            "whatsapp_ready" => {
                if let Some(phone_number) = data.get("phoneNumber").and_then(|p| p.as_str()) {
                    self.logger
                        .info(
                            LogCategory::WhatsApp,
                            format!("WhatsApp connected - {}", phone_number),
                        )
                        .await;
                    
                    // Clear QR code when connected
                    let mut metadata = self.metadata.lock().await;
                    metadata.qr_code = None;
                    drop(metadata);
                    
                    // Reset recovery state on successful connection
                    self.reset_recovery().await;
                    
                    self.set_state(ConnectionState::Connected {
                        phone_number: phone_number.to_string(),
                    })
                    .await;
                }
            }
            "whatsapp_disconnected" => {
                let reason = data.get("reason").and_then(|r| r.as_str()).map(|s| s.to_string());
                
                let error = ConnectionError::ConnectionLost { reason };
                self.logger
                    .warning(
                        LogCategory::WhatsApp,
                        error.technical_message(),
                    )
                    .await;
                
                // Clear QR code when disconnected
                let mut metadata = self.metadata.lock().await;
                metadata.qr_code = None;
                drop(metadata);
                
                self.set_state(ConnectionState::Disconnected).await;
            }
            "whatsapp_error" | "command_error" => {
                if let Some(error_msg) = data.get("message").and_then(|m| m.as_str()) {
                    let error = ConnectionError::Other {
                        message: error_msg.to_string(),
                    };
                    
                    self.logger
                        .error(
                            LogCategory::WhatsApp,
                            error.technical_message(),
                        )
                        .await;
                    
                    self.set_state_with_error(ConnectionState::Error {
                        message: error.user_message(),
                    }, &error)
                    .await;
                }
            }
            _ => {}
        }
    }
    
    /// Handle specific error types with recovery strategies
    pub async fn handle_error(&self, error: &ConnectionError) -> Result<(), String> {
        self.logger
            .error(
                LogCategory::WhatsApp,
                format!("Handling error: {}", error.technical_message()),
            )
            .await;
        
        // Emit error event to frontend
        let _ = self.app_handle.emit("whatsapp_error", serde_json::json!({
            "error": error.clone(),
            "message": error.user_message(),
            "category": error.category(),
            "recoverable": error.is_recoverable(),
            "timestamp": chrono::Utc::now().timestamp_millis(),
        }));
        
        // Apply recovery strategy based on error type
        if error.is_recoverable() {
            self.logger
                .info(
                    LogCategory::WhatsApp,
                    format!("Error is recoverable, attempting recovery: {}", error.category()),
                )
                .await;
            
            // Trigger recovery mechanism
            match self.attempt_recovery(3).await {
                Ok(true) => {
                    self.logger
                        .info(
                            LogCategory::WhatsApp,
                            "Recovery successful".to_string(),
                        )
                        .await;
                    Ok(())
                }
                Ok(false) => {
                    self.logger
                        .warning(
                            LogCategory::WhatsApp,
                            "Recovery not attempted or failed".to_string(),
                        )
                        .await;
                    Err(error.user_message())
                }
                Err(e) => {
                    self.logger
                        .error(
                            LogCategory::WhatsApp,
                            format!("Recovery failed: {}", e),
                        )
                        .await;
                    Err(e)
                }
            }
        } else {
            self.logger
                .warning(
                    LogCategory::WhatsApp,
                    format!("Error is not recoverable: {}", error.category()),
                )
                .await;
            Err(error.user_message())
        }
    }

    // Private helper methods

    /// Calculate backoff duration based on attempt count
    /// Uses exponential backoff: 2s, 4s, 8s, 16s, 30s (capped)
    fn calculate_backoff_duration(&self, attempt: u32) -> std::time::Duration {
        const INITIAL_DELAY_MS: u64 = 2000;
        const MAX_DELAY_MS: u64 = 30000;
        const BACKOFF_MULTIPLIER: u32 = 2;

        let delay_ms = INITIAL_DELAY_MS * (BACKOFF_MULTIPLIER.pow(attempt.saturating_sub(1)) as u64);
        let capped_delay_ms = delay_ms.min(MAX_DELAY_MS);
        
        std::time::Duration::from_millis(capped_delay_ms)
    }

    /// Check for existing session and update cache
    async fn check_session(&self) -> bool {
        self.logger
            .debug(
                LogCategory::WhatsApp,
                "Checking for existing session".to_string(),
            )
            .await;

        // Create a temporary client to check session
        let temp_client = WhatsAppClient::new(self.app_handle.clone());
        let exists = temp_client.check_session_exists().unwrap_or(false);

        // Update cache
        let mut cache = self.session_cache.lock().await;
        *cache = Some(exists);

        if exists {
            self.logger
                .debug(
                    LogCategory::WhatsApp,
                    "Existing session found".to_string(),
                )
                .await;
        } else {
            self.logger
                .debug(LogCategory::WhatsApp, "No existing session".to_string())
                .await;
        }

        exists
    }

    /// Set the connection state and emit event to frontend
    async fn set_state(&self, new_state: ConnectionState) {
        let mut state = self.state.lock().await;
        *state = new_state.clone();
        drop(state);

        // Emit consolidated state change event
        self.emit_state_change_with_metadata().await;
    }
    
    /// Set the connection state with error details and emit event to frontend
    async fn set_state_with_error(&self, new_state: ConnectionState, error: &ConnectionError) {
        let mut state = self.state.lock().await;
        *state = new_state.clone();
        drop(state);

        // Emit consolidated state change event with error details
        self.emit_state_change_with_error(error).await;
    }

    /// Emit consolidated state change event to frontend with all metadata
    async fn emit_state_change_with_metadata(&self) {
        let state = self.state.lock().await;
        let metadata = self.metadata.lock().await;
        
        let mut event_data = match state.clone() {
            ConnectionState::Uninitialized => serde_json::json!({
                "status": "uninitialized",
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
            ConnectionState::Initializing => serde_json::json!({
                "status": "initializing",
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
            ConnectionState::Connected { phone_number } => serde_json::json!({
                "status": "connected",
                "phone_number": phone_number,
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
            ConnectionState::Disconnected => serde_json::json!({
                "status": "disconnected",
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
            ConnectionState::Error { message } => serde_json::json!({
                "status": "error",
                "error": message,
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
        };
        
        // Add QR code if present
        if let Some(qr_code) = &metadata.qr_code {
            event_data["qr_code"] = serde_json::json!(qr_code);
        }
        
        drop(state);
        drop(metadata);

        let _ = self.app_handle.emit("whatsapp_state_changed", event_data);
    }
    
    /// Emit state change event with error details
    async fn emit_state_change_with_error(&self, error: &ConnectionError) {
        let state = self.state.lock().await;
        let metadata = self.metadata.lock().await;
        
        let mut event_data = match state.clone() {
            ConnectionState::Error { message } => serde_json::json!({
                "status": "error",
                "error": message,
                "error_details": {
                    "type": error.clone(),
                    "category": error.category(),
                    "recoverable": error.is_recoverable(),
                    "user_message": error.user_message(),
                    "technical_message": error.technical_message(),
                },
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
            _ => {
                // For non-error states, use standard emission
                drop(state);
                drop(metadata);
                self.emit_state_change_with_metadata().await;
                return;
            }
        };
        
        // Add QR code if present
        if let Some(qr_code) = &metadata.qr_code {
            event_data["qr_code"] = serde_json::json!(qr_code);
        }
        
        drop(state);
        drop(metadata);

        let _ = self.app_handle.emit("whatsapp_state_changed", event_data);
    }
}
