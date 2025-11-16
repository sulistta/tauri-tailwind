use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
struct NodeMessage {
    event: String,
    data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct NodeCommand {
    #[serde(rename = "type")]
    command_type: String,
    #[serde(flatten)]
    params: serde_json::Value,
}

pub struct WhatsAppClient {
    process: Arc<Mutex<Option<Child>>>,
    app_handle: AppHandle,
}

impl WhatsAppClient {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            app_handle,
        }
    }

    pub async fn initialize(&self) -> Result<(), String> {
        let mut process_guard = self.process.lock().await;

        // Check if process is already running (idempotency check - Task 2.2)
        if let Some(child) = process_guard.as_mut() {
            match child.try_wait() {
                Ok(None) => {
                    // Process is still running, return success immediately
                    return Ok(());
                }
                Ok(Some(_)) => {
                    // Process has exited, clean up before spawning new one
                    *process_guard = None;
                }
                Err(_) => {
                    // Error checking process status, attempt cleanup
                    let _ = child.kill().await;
                    *process_guard = None;
                }
            }
        }

        // Get the path to the Node.js script
        // In development, use the source path; in production, use resource_dir
        let node_script = if cfg!(debug_assertions) {
            // Development mode - Tauri runs from src-tauri directory
            let current = std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))?;

            // Check if we're already in src-tauri or in project root
            let script_path = if current.ends_with("src-tauri") {
                current.join("whatsapp-node").join("index.js")
            } else {
                current
                    .join("src-tauri")
                    .join("whatsapp-node")
                    .join("index.js")
            };
            script_path
        } else {
            // Production mode - use resource directory
            let resource_path = self
                .app_handle
                .path()
                .resource_dir()
                .map_err(|e| format!("Failed to get resource directory: {}", e))?;
            resource_path.join("whatsapp-node").join("index.js")
        };

        // Verify the script exists
        if !node_script.exists() {
            return Err(format!(
                "Node.js script not found at: {}",
                node_script.display()
            ));
        }

        // Spawn Node.js process
        let mut child = Command::new("node")
            .arg(&node_script)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| {
                format!(
                    "Failed to spawn Node.js process: {}. Script path: {}",
                    e,
                    node_script.display()
                )
            })?;

        // Get stdout for reading events
        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;

        // Get stderr for error logging
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

        // Store the process
        *process_guard = Some(child);
        drop(process_guard);

        // Start listening to stdout in a separate task
        let app_handle_stdout = self.app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if let Ok(message) = serde_json::from_str::<NodeMessage>(&line) {
                    Self::handle_node_message(app_handle_stdout.clone(), message);
                } else {
                    eprintln!("Failed to parse Node.js message: {}", line);
                }
            }
        });

        // Start listening to stderr in a separate task
        let app_handle_stderr = self.app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("Node.js stderr: {}", line);
                // Emit error events to frontend
                let _ = app_handle_stderr.emit(
                    "whatsapp_error",
                    serde_json::json!({
                        "message": "Node.js process error",
                        "error": line
                    }),
                );
            }
        });

        Ok(())
    }

    fn handle_node_message(app_handle: AppHandle, message: NodeMessage) {
        // Get logger from app state
        if let Some(state) = app_handle.try_state::<crate::commands::AppState>() {
            let logger = state.logger.clone();

            tokio::spawn(async move {
                match message.event.as_str() {
                    // New handlers for missing events (Task 2.1)
                    "client_initializing" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::WhatsApp,
                                "Client initializing".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("whatsapp_initializing", message.data);
                    }
                    "whatsapp_loading" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::WhatsApp,
                                "WhatsApp loading".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("whatsapp_loading", message.data);
                    }
                    // Existing handlers with updated logging levels (Task 2.3)
                    "whatsapp_qr" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::WhatsApp,
                                "QR code generated".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("whatsapp_qr", message.data);
                    }
                    "whatsapp_ready" => {
                        logger
                            .info(
                                crate::logging::LogCategory::WhatsApp,
                                "WhatsApp connected and ready".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("whatsapp_ready", message.data);
                    }
                    "whatsapp_disconnected" => {
                        logger
                            .info(
                                crate::logging::LogCategory::WhatsApp,
                                "WhatsApp disconnected".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("whatsapp_disconnected", message.data);
                    }
                    "whatsapp_message" => {
                        let _ = app_handle.emit("whatsapp_message", message.data);
                    }
                    "groups_result" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::WhatsApp,
                                "Groups fetched successfully".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("groups_response", message.data);
                    }
                    "members_result" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::WhatsApp,
                                "Members extracted successfully".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("members_response", message.data);
                    }
                    "addition_result" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::WhatsApp,
                                "Users added to group".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("addition_response", message.data);
                    }
                    "automation_progress" => {
                        let _ = app_handle.emit("automation_progress", message.data);
                    }
                    "automation_finished" => {
                        logger
                            .debug(
                                crate::logging::LogCategory::Automation,
                                "Automation finished".to_string(),
                            )
                            .await;
                        let _ = app_handle.emit("automation_finished", message.data);
                    }
                    "automation_error" => {
                        if let Some(error_msg) =
                            message.data.get("message").and_then(|m| m.as_str())
                        {
                            logger
                                .error(
                                    crate::logging::LogCategory::Automation,
                                    format!("Automation error: {}", error_msg),
                                )
                                .await;
                        }
                        let _ = app_handle.emit("automation_error", message.data);
                    }
                    "command_error" => {
                        if let Some(error_msg) =
                            message.data.get("message").and_then(|m| m.as_str())
                        {
                            logger
                                .error(
                                    crate::logging::LogCategory::WhatsApp,
                                    format!("Command error: {}", error_msg),
                                )
                                .await;
                        }
                        let _ = app_handle.emit("whatsapp_error", message.data);
                    }
                    // Changed unknown event logging from warning to debug (Task 2.1)
                    _ => {
                        logger
                            .debug(
                                crate::logging::LogCategory::General,
                                format!("Unknown event from Node.js: {}", message.event),
                            )
                            .await;
                    }
                }
            });
        } else {
            // Fallback if logger is not available
            match message.event.as_str() {
                "client_initializing" => {
                    let _ = app_handle.emit("whatsapp_initializing", message.data);
                }
                "whatsapp_loading" => {
                    let _ = app_handle.emit("whatsapp_loading", message.data);
                }
                "whatsapp_qr" => {
                    let _ = app_handle.emit("whatsapp_qr", message.data);
                }
                "whatsapp_ready" => {
                    let _ = app_handle.emit("whatsapp_ready", message.data);
                }
                "whatsapp_disconnected" => {
                    let _ = app_handle.emit("whatsapp_disconnected", message.data);
                }
                "whatsapp_message" => {
                    let _ = app_handle.emit("whatsapp_message", message.data);
                }
                "groups_result" => {
                    let _ = app_handle.emit("groups_response", message.data);
                }
                "members_result" => {
                    let _ = app_handle.emit("members_response", message.data);
                }
                "addition_result" => {
                    let _ = app_handle.emit("addition_response", message.data);
                }
                "automation_progress" => {
                    let _ = app_handle.emit("automation_progress", message.data);
                }
                "automation_finished" => {
                    let _ = app_handle.emit("automation_finished", message.data);
                }
                "automation_error" => {
                    let _ = app_handle.emit("automation_error", message.data);
                }
                "command_error" => {
                    let _ = app_handle.emit("whatsapp_error", message.data);
                }
                _ => {
                    // Changed from eprintln to debug-only output
                    #[cfg(debug_assertions)]
                    eprintln!("Unknown event from Node.js: {}", message.event);
                }
            }
        }
    }

    pub async fn send_command(&self, command: serde_json::Value) -> Result<(), String> {
        let mut process_guard = self.process.lock().await;

        if let Some(child) = process_guard.as_mut() {
            if let Some(stdin) = child.stdin.as_mut() {
                let command_json = serde_json::to_string(&command)
                    .map_err(|e| format!("Failed to serialize command: {}", e))?;

                stdin
                    .write_all(command_json.as_bytes())
                    .await
                    .map_err(|e| format!("Failed to write to stdin: {}", e))?;

                stdin
                    .write_all(b"\n")
                    .await
                    .map_err(|e| format!("Failed to write newline: {}", e))?;

                stdin
                    .flush()
                    .await
                    .map_err(|e| format!("Failed to flush stdin: {}", e))?;

                Ok(())
            } else {
                Err("Process stdin not available".to_string())
            }
        } else {
            Err("WhatsApp client not initialized".to_string())
        }
    }

    pub async fn is_running(&self) -> bool {
        let mut process_guard = self.process.lock().await;
        if let Some(child) = process_guard.as_mut() {
            matches!(child.try_wait(), Ok(None))
        } else {
            false
        }
    }

    pub async fn restart(&self) -> Result<(), String> {
        // Kill existing process
        let mut process_guard = self.process.lock().await;
        if let Some(mut child) = process_guard.take() {
            let _ = child.kill().await;
        }
        drop(process_guard);

        // Reinitialize
        self.initialize().await
    }

    pub fn check_session_exists(&self) -> Result<bool, String> {
        // Get the path to the session directory
        let session_path = if cfg!(debug_assertions) {
            // Development mode
            let current = std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))?;

            // Check if we're already in src-tauri or in project root
            if current.ends_with("src-tauri") {
                current.join("whatsapp-node").join("session")
            } else {
                current
                    .join("src-tauri")
                    .join("whatsapp-node")
                    .join("session")
            }
        } else {
            // Production mode - use resource directory
            let resource_path = self
                .app_handle
                .path()
                .resource_dir()
                .map_err(|e| format!("Failed to get resource directory: {}", e))?;
            resource_path.join("whatsapp-node").join("session")
        };

        // Check if session directory exists and contains session data
        if !session_path.exists() {
            return Ok(false);
        }

        // Check for session subdirectory (whatsapp-web.js creates a nested session folder)
        let session_data_path = session_path.join("session");
        if !session_data_path.exists() {
            return Ok(false);
        }

        // Check if the session directory has any files (indicating a saved session)
        match std::fs::read_dir(&session_data_path) {
            Ok(entries) => {
                // If there are any entries, we consider the session to exist
                Ok(entries.count() > 0)
            }
            Err(_) => Ok(false),
        }
    }
}
