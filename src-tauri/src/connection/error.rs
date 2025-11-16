use serde::{Deserialize, Serialize};
use std::fmt;

/// Comprehensive error types for WhatsApp connection operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "details")]
pub enum ConnectionError {
    /// Client initialization failed
    InitializationFailed {
        message: String,
        recoverable: bool,
    },
    
    /// Initialization timeout - client didn't respond within expected time
    InitializationTimeout {
        duration_seconds: u64,
    },
    
    /// Initialization is already in progress
    InitializationInProgress,
    
    /// Initialization blocked by another long-running operation
    InitializationBlocked {
        duration_seconds: u64,
    },
    
    /// Node.js process failed to spawn
    ProcessSpawnFailed {
        message: String,
    },
    
    /// Node.js process died unexpectedly
    ProcessDied {
        exit_code: Option<i32>,
    },
    
    /// Node.js process is not running
    ProcessNotRunning,
    
    /// Session check failed
    SessionCheckFailed {
        message: String,
    },
    
    /// Connection timeout
    ConnectionTimeout {
        duration_seconds: u64,
    },
    
    /// Connection lost unexpectedly
    ConnectionLost {
        reason: Option<String>,
    },
    
    /// WhatsApp authentication failed
    AuthenticationFailed {
        reason: String,
    },
    
    /// QR code scan timeout
    QRCodeTimeout {
        duration_seconds: u64,
    },
    
    /// Command send failed
    CommandFailed {
        command: String,
        message: String,
    },
    
    /// Recovery failed after max attempts
    RecoveryFailed {
        attempts: u32,
        last_error: String,
    },
    
    /// Operation not allowed in current state
    InvalidState {
        current_state: String,
        required_state: String,
        operation: String,
    },
    
    /// Generic error with message
    Other {
        message: String,
    },
}

impl ConnectionError {
    /// Check if the error is recoverable through automatic retry
    pub fn is_recoverable(&self) -> bool {
        match self {
            ConnectionError::InitializationFailed { recoverable, .. } => *recoverable,
            ConnectionError::InitializationTimeout { .. } => true,
            ConnectionError::InitializationInProgress => false,
            ConnectionError::InitializationBlocked { .. } => false,
            ConnectionError::ProcessSpawnFailed { .. } => true,
            ConnectionError::ProcessDied { .. } => true,
            ConnectionError::ProcessNotRunning => true,
            ConnectionError::SessionCheckFailed { .. } => false,
            ConnectionError::ConnectionTimeout { .. } => true,
            ConnectionError::ConnectionLost { .. } => true,
            ConnectionError::AuthenticationFailed { .. } => false,
            ConnectionError::QRCodeTimeout { .. } => false,
            ConnectionError::CommandFailed { .. } => true,
            ConnectionError::RecoveryFailed { .. } => false,
            ConnectionError::InvalidState { .. } => false,
            ConnectionError::Other { .. } => false,
        }
    }
    
    /// Get user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            ConnectionError::InitializationFailed { message, .. } => {
                format!("Failed to initialize WhatsApp connection: {}", message)
            }
            ConnectionError::InitializationTimeout { duration_seconds } => {
                format!(
                    "Connection initialization timed out after {} seconds. Please check your internet connection and try again.",
                    duration_seconds
                )
            }
            ConnectionError::InitializationInProgress => {
                "Connection is already being initialized. Please wait for the current operation to complete.".to_string()
            }
            ConnectionError::InitializationBlocked { duration_seconds } => {
                format!(
                    "Another initialization has been running for over {} seconds. This may indicate a stuck process. Please restart the application.",
                    duration_seconds
                )
            }
            ConnectionError::ProcessSpawnFailed { message } => {
                format!(
                    "Failed to start WhatsApp service: {}. Please ensure Node.js is installed and try again.",
                    message
                )
            }
            ConnectionError::ProcessDied { exit_code } => {
                if let Some(code) = exit_code {
                    format!("WhatsApp service stopped unexpectedly with exit code {}. Attempting to reconnect...", code)
                } else {
                    "WhatsApp service stopped unexpectedly. Attempting to reconnect...".to_string()
                }
            }
            ConnectionError::ProcessNotRunning => {
                "WhatsApp service is not running. Please connect to continue.".to_string()
            }
            ConnectionError::SessionCheckFailed { message } => {
                format!("Failed to check for existing session: {}", message)
            }
            ConnectionError::ConnectionTimeout { duration_seconds } => {
                format!(
                    "Connection attempt timed out after {} seconds. Please check your internet connection and try again.",
                    duration_seconds
                )
            }
            ConnectionError::ConnectionLost { reason } => {
                if let Some(r) = reason {
                    format!("Connection to WhatsApp was lost: {}. Attempting to reconnect...", r)
                } else {
                    "Connection to WhatsApp was lost. Attempting to reconnect...".to_string()
                }
            }
            ConnectionError::AuthenticationFailed { reason } => {
                format!("WhatsApp authentication failed: {}. Please scan the QR code again.", reason)
            }
            ConnectionError::QRCodeTimeout { duration_seconds } => {
                format!(
                    "QR code expired after {} seconds. Please request a new QR code and scan it promptly.",
                    duration_seconds
                )
            }
            ConnectionError::CommandFailed { command, message } => {
                format!("Failed to execute '{}': {}", command, message)
            }
            ConnectionError::RecoveryFailed { attempts, last_error } => {
                format!(
                    "Failed to recover connection after {} attempts. Last error: {}. Please try connecting manually.",
                    attempts, last_error
                )
            }
            ConnectionError::InvalidState { current_state, required_state, operation } => {
                format!(
                    "Cannot {} while in '{}' state. Required state: '{}'.",
                    operation, current_state, required_state
                )
            }
            ConnectionError::Other { message } => message.clone(),
        }
    }
    
    /// Get technical error message for logging
    pub fn technical_message(&self) -> String {
        match self {
            ConnectionError::InitializationFailed { message, recoverable } => {
                format!("Initialization failed (recoverable: {}): {}", recoverable, message)
            }
            ConnectionError::InitializationTimeout { duration_seconds } => {
                format!("Initialization timeout after {}s", duration_seconds)
            }
            ConnectionError::InitializationInProgress => {
                "Initialization already in progress".to_string()
            }
            ConnectionError::InitializationBlocked { duration_seconds } => {
                format!("Initialization blocked by operation running for {}s", duration_seconds)
            }
            ConnectionError::ProcessSpawnFailed { message } => {
                format!("Process spawn failed: {}", message)
            }
            ConnectionError::ProcessDied { exit_code } => {
                format!("Process died with exit code: {:?}", exit_code)
            }
            ConnectionError::ProcessNotRunning => {
                "Process not running".to_string()
            }
            ConnectionError::SessionCheckFailed { message } => {
                format!("Session check failed: {}", message)
            }
            ConnectionError::ConnectionTimeout { duration_seconds } => {
                format!("Connection timeout after {}s", duration_seconds)
            }
            ConnectionError::ConnectionLost { reason } => {
                format!("Connection lost: {:?}", reason)
            }
            ConnectionError::AuthenticationFailed { reason } => {
                format!("Authentication failed: {}", reason)
            }
            ConnectionError::QRCodeTimeout { duration_seconds } => {
                format!("QR code timeout after {}s", duration_seconds)
            }
            ConnectionError::CommandFailed { command, message } => {
                format!("Command '{}' failed: {}", command, message)
            }
            ConnectionError::RecoveryFailed { attempts, last_error } => {
                format!("Recovery failed after {} attempts: {}", attempts, last_error)
            }
            ConnectionError::InvalidState { current_state, required_state, operation } => {
                format!(
                    "Invalid state for '{}': current={}, required={}",
                    operation, current_state, required_state
                )
            }
            ConnectionError::Other { message } => message.clone(),
        }
    }
    
    /// Get error category for logging
    pub fn category(&self) -> &'static str {
        match self {
            ConnectionError::InitializationFailed { .. }
            | ConnectionError::InitializationTimeout { .. }
            | ConnectionError::InitializationInProgress
            | ConnectionError::InitializationBlocked { .. } => "initialization",
            
            ConnectionError::ProcessSpawnFailed { .. }
            | ConnectionError::ProcessDied { .. }
            | ConnectionError::ProcessNotRunning => "process",
            
            ConnectionError::SessionCheckFailed { .. } => "session",
            
            ConnectionError::ConnectionTimeout { .. }
            | ConnectionError::ConnectionLost { .. } => "connection",
            
            ConnectionError::AuthenticationFailed { .. }
            | ConnectionError::QRCodeTimeout { .. } => "authentication",
            
            ConnectionError::CommandFailed { .. } => "command",
            
            ConnectionError::RecoveryFailed { .. } => "recovery",
            
            ConnectionError::InvalidState { .. } => "state",
            
            ConnectionError::Other { .. } => "general",
        }
    }
}

impl fmt::Display for ConnectionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.user_message())
    }
}

impl std::error::Error for ConnectionError {}

/// Convert ConnectionError to String for Tauri command results
impl From<ConnectionError> for String {
    fn from(error: ConnectionError) -> Self {
        error.user_message()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recoverable_errors() {
        assert!(ConnectionError::ProcessDied { exit_code: Some(1) }.is_recoverable());
        assert!(ConnectionError::ConnectionTimeout { duration_seconds: 30 }.is_recoverable());
        assert!(!ConnectionError::AuthenticationFailed { reason: "test".to_string() }.is_recoverable());
        assert!(!ConnectionError::InitializationInProgress.is_recoverable());
    }

    #[test]
    fn test_user_messages() {
        let error = ConnectionError::ProcessDied { exit_code: Some(1) };
        assert!(error.user_message().contains("stopped unexpectedly"));
        
        let error = ConnectionError::InitializationTimeout { duration_seconds: 30 };
        assert!(error.user_message().contains("30 seconds"));
    }

    #[test]
    fn test_error_categories() {
        assert_eq!(
            ConnectionError::InitializationFailed {
                message: "test".to_string(),
                recoverable: true
            }.category(),
            "initialization"
        );
        assert_eq!(
            ConnectionError::ProcessDied { exit_code: None }.category(),
            "process"
        );
        assert_eq!(
            ConnectionError::AuthenticationFailed { reason: "test".to_string() }.category(),
            "authentication"
        );
    }
}
