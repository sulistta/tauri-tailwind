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
        
        // Check if process is already running
        if let Some(child) = process_guard.as_mut() {
            if let Ok(None) = child.try_wait() {
                return Ok(()); // Process is still running
            }
        }

        // Get the path to the Node.js script
        let resource_path = self.app_handle
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource directory: {}", e))?;
        
        let node_script = resource_path.join("whatsapp-node").join("index.js");

        // Spawn Node.js process
        let mut child = Command::new("node")
            .arg(node_script)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn Node.js process: {}", e))?;

        // Get stdout for reading events
        let stdout = child.stdout.take()
            .ok_or("Failed to capture stdout")?;

        // Store the process
        *process_guard = Some(child);
        drop(process_guard);

        // Start listening to stdout in a separate task
        let app_handle = self.app_handle.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if let Ok(message) = serde_json::from_str::<NodeMessage>(&line) {
                    Self::handle_node_message(app_handle.clone(), message);
                }
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
                    "whatsapp_qr" => {
                        logger.info(crate::logging::LogCategory::WhatsApp, "QR code generated".to_string()).await;
                        let _ = app_handle.emit("whatsapp_qr", message.data);
                    }
                    "whatsapp_ready" => {
                        logger.info(crate::logging::LogCategory::WhatsApp, "WhatsApp connected and ready".to_string()).await;
                        let _ = app_handle.emit("whatsapp_ready", message.data);
                    }
                    "whatsapp_disconnected" => {
                        logger.warning(crate::logging::LogCategory::WhatsApp, "WhatsApp disconnected".to_string()).await;
                        let _ = app_handle.emit("whatsapp_disconnected", message.data);
                    }
                    "whatsapp_message" => {
                        let _ = app_handle.emit("whatsapp_message", message.data);
                    }
                    "automation_progress" => {
                        let _ = app_handle.emit("automation_progress", message.data);
                    }
                    "automation_finished" => {
                        logger.info(crate::logging::LogCategory::Automation, "Automation finished".to_string()).await;
                        let _ = app_handle.emit("automation_finished", message.data);
                    }
                    "automation_error" => {
                        if let Some(error_msg) = message.data.get("message").and_then(|m| m.as_str()) {
                            logger.error(crate::logging::LogCategory::Automation, format!("Automation error: {}", error_msg)).await;
                        }
                        let _ = app_handle.emit("automation_error", message.data);
                    }
                    _ => {
                        logger.warning(crate::logging::LogCategory::General, format!("Unknown event from Node.js: {}", message.event)).await;
                    }
                }
            });
        } else {
            // Fallback if logger is not available
            match message.event.as_str() {
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
                "automation_progress" => {
                    let _ = app_handle.emit("automation_progress", message.data);
                }
                "automation_finished" => {
                    let _ = app_handle.emit("automation_finished", message.data);
                }
                "automation_error" => {
                    let _ = app_handle.emit("automation_error", message.data);
                }
                _ => {
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
                
                stdin.write_all(command_json.as_bytes()).await
                    .map_err(|e| format!("Failed to write to stdin: {}", e))?;
                
                stdin.write_all(b"\n").await
                    .map_err(|e| format!("Failed to write newline: {}", e))?;
                
                stdin.flush().await
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
}
