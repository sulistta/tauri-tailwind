use crate::whatsapp::{GroupInfo, Participant, AdditionReport};
use crate::whatsapp::types::Automation;
use crate::automation::{storage, executor};
use crate::logging::{Logger, LogEntry, LogFilter, LogCategory};
use crate::connection::ConnectionManager;
use tauri::State;
use std::sync::Arc;

pub struct AppState {
    pub connection_manager: Arc<ConnectionManager>,
    pub logger: Arc<Logger>,
}

#[tauri::command]
pub async fn get_groups(
    state: State<'_, AppState>,
) -> Result<Vec<GroupInfo>, String> {
    state.logger.info(LogCategory::WhatsApp, "Fetching WhatsApp groups".to_string()).await;
    
    // Get client from ConnectionManager
    let client_arc = state.connection_manager.get_client().await;
    
    if let Some(client_arc) = client_arc {
        let client_guard = client_arc.lock().await;
        
        if let Some(client) = client_guard.as_ref() {
            // Send command to Node.js process
            let command = serde_json::json!({
                "type": "get_groups"
            });
            
            match client.send_command(command).await {
                Ok(_) => {
                    state.logger.info(LogCategory::WhatsApp, "Groups fetch command sent successfully".to_string()).await;
                    Ok(vec![])
                }
                Err(e) => {
                    state.logger.error(LogCategory::WhatsApp, format!("Failed to fetch groups: {}", e)).await;
                    Err(e)
                }
            }
        } else {
            state.logger.error(LogCategory::WhatsApp, "WhatsApp client not initialized".to_string()).await;
            Err("WhatsApp client not initialized".to_string())
        }
    } else {
        state.logger.error(LogCategory::WhatsApp, "WhatsApp client not initialized".to_string()).await;
        Err("WhatsApp client not initialized".to_string())
    }
}

#[tauri::command]
pub async fn extract_group_members(
    group_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Participant>, String> {
    state.logger.info(LogCategory::WhatsApp, format!("Extracting members from group: {}", group_id)).await;
    
    // Get client from ConnectionManager
    let client_arc = state.connection_manager.get_client().await;
    
    if let Some(client_arc) = client_arc {
        let client_guard = client_arc.lock().await;
        
        if let Some(client) = client_guard.as_ref() {
            let command = serde_json::json!({
                "type": "extract_members",
                "group_id": group_id
            });
            
            match client.send_command(command).await {
                Ok(_) => {
                    state.logger.info(LogCategory::WhatsApp, "Member extraction command sent successfully".to_string()).await;
                    Ok(vec![])
                }
                Err(e) => {
                    state.logger.error(LogCategory::WhatsApp, format!("Failed to extract members: {}", e)).await;
                    Err(e)
                }
            }
        } else {
            state.logger.error(LogCategory::WhatsApp, "WhatsApp client not initialized".to_string()).await;
            Err("WhatsApp client not initialized".to_string())
        }
    } else {
        state.logger.error(LogCategory::WhatsApp, "WhatsApp client not initialized".to_string()).await;
        Err("WhatsApp client not initialized".to_string())
    }
}

#[tauri::command]
pub async fn add_users_to_group(
    group_id: String,
    phone_numbers: Vec<String>,
    delay_seconds: u64,
    state: State<'_, AppState>,
) -> Result<AdditionReport, String> {
    state.logger.info(
        LogCategory::WhatsApp, 
        format!("Adding {} users to group {} with {}s delay", phone_numbers.len(), group_id, delay_seconds)
    ).await;
    
    // Get client from ConnectionManager
    let client_arc = state.connection_manager.get_client().await;
    
    if let Some(client_arc) = client_arc {
        let client_guard = client_arc.lock().await;
        
        if let Some(client) = client_guard.as_ref() {
            let command = serde_json::json!({
                "type": "add_to_group",
                "group_id": group_id,
                "numbers": phone_numbers,
                "delay": delay_seconds
            });
            
            match client.send_command(command).await {
                Ok(_) => {
                    state.logger.info(LogCategory::WhatsApp, "Bulk addition command sent successfully".to_string()).await;
                    Ok(AdditionReport {
                        successful: vec![],
                        failed: vec![],
                        total_processed: 0,
                    })
                }
                Err(e) => {
                    state.logger.error(LogCategory::WhatsApp, format!("Failed to add users to group: {}", e)).await;
                    Err(e)
                }
            }
        } else {
            state.logger.error(LogCategory::WhatsApp, "WhatsApp client not initialized".to_string()).await;
            Err("WhatsApp client not initialized".to_string())
        }
    } else {
        state.logger.error(LogCategory::WhatsApp, "WhatsApp client not initialized".to_string()).await;
        Err("WhatsApp client not initialized".to_string())
    }
}

// ============================================================================
// Automation Commands
// ============================================================================

#[tauri::command]
pub async fn create_automation(
    app_handle: tauri::AppHandle,
    automation: Automation,
    state: State<'_, AppState>,
) -> Result<String, String> {
    state.logger.info(LogCategory::Automation, format!("Creating automation: {}", automation.name)).await;
    
    // Validate automation
    if automation.name.trim().is_empty() {
        state.logger.error(LogCategory::Automation, "Automation name cannot be empty".to_string()).await;
        return Err("Automation name cannot be empty".to_string());
    }
    
    if automation.actions.is_empty() {
        state.logger.error(LogCategory::Automation, "Automation must have at least one action".to_string()).await;
        return Err("Automation must have at least one action".to_string());
    }
    
    // Save automation
    match storage::save_automation(&app_handle, automation.clone()).await {
        Ok(_) => {
            state.logger.info(LogCategory::Automation, format!("Automation '{}' created successfully", automation.name)).await;
            Ok(automation.id)
        }
        Err(e) => {
            state.logger.error(LogCategory::Automation, format!("Failed to create automation: {}", e)).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_automations(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<Automation>, String> {
    state.logger.info(LogCategory::Automation, "Fetching automations".to_string()).await;
    
    match storage::load_automations(&app_handle).await {
        Ok(automations) => {
            state.logger.info(LogCategory::Automation, format!("Loaded {} automations", automations.len())).await;
            Ok(automations)
        }
        Err(e) => {
            state.logger.error(LogCategory::Automation, format!("Failed to load automations: {}", e)).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn delete_automation(
    app_handle: tauri::AppHandle,
    automation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.logger.info(LogCategory::Automation, format!("Deleting automation: {}", automation_id)).await;
    
    match storage::delete_automation(&app_handle, &automation_id).await {
        Ok(_) => {
            state.logger.info(LogCategory::Automation, format!("Automation '{}' deleted successfully", automation_id)).await;
            Ok(())
        }
        Err(e) => {
            state.logger.error(LogCategory::Automation, format!("Failed to delete automation: {}", e)).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn toggle_automation(
    app_handle: tauri::AppHandle,
    automation_id: String,
    enabled: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.logger.info(
        LogCategory::Automation, 
        format!("Toggling automation '{}' to {}", automation_id, if enabled { "enabled" } else { "disabled" })
    ).await;
    
    match storage::toggle_automation(&app_handle, &automation_id, enabled).await {
        Ok(_) => {
            state.logger.info(LogCategory::Automation, format!("Automation '{}' toggled successfully", automation_id)).await;
            Ok(())
        }
        Err(e) => {
            state.logger.error(LogCategory::Automation, format!("Failed to toggle automation: {}", e)).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn execute_automation(
    app_handle: tauri::AppHandle,
    automation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.logger.info(LogCategory::Automation, format!("Executing automation: {}", automation_id)).await;
    
    // Load the specific automation
    let automations = storage::load_automations(&app_handle).await?;
    let automation = automations
        .iter()
        .find(|a| a.id == automation_id.clone())
        .cloned();
    
    let automation = match automation {
        Some(a) => a,
        None => {
            let err = format!("Automation with ID '{}' not found", automation_id);
            state.logger.error(LogCategory::Automation, err.clone()).await;
            return Err(err);
        }
    };
    
    // Get WhatsApp client from ConnectionManager
    let client_arc = state.connection_manager.get_client().await;
    
    if let Some(client_arc) = client_arc {
        let client_guard = client_arc.lock().await;
        let whatsapp_client = client_guard.as_ref();
        
        // Execute the automation
        match executor::execute_automation(&automation, &app_handle, whatsapp_client).await {
            Ok(_) => {
                state.logger.info(LogCategory::Automation, format!("Automation '{}' executed successfully", automation_id)).await;
                Ok(())
            }
            Err(e) => {
                state.logger.error(LogCategory::Automation, format!("Failed to execute automation: {}", e)).await;
                Err(e)
            }
        }
    } else {
        let err = "WhatsApp client not initialized".to_string();
        state.logger.error(LogCategory::Automation, err.clone()).await;
        Err(err)
    }
}

// ============================================================================
// Connection Management Commands (New Simplified API)
// ============================================================================

#[tauri::command]
pub async fn initialize_connection(
    state: State<'_, AppState>,
) -> Result<crate::connection::InitializationResult, String> {
    state.logger.debug(LogCategory::WhatsApp, "initialize_connection command called".to_string()).await;
    
    match state.connection_manager.initialize().await {
        Ok(result) => {
            state.logger.debug(
                LogCategory::WhatsApp, 
                format!("Connection initialized - has_session: {}, requires_qr: {}", result.has_session, result.requires_qr)
            ).await;
            Ok(result)
        }
        Err(e) => {
            state.logger.error(LogCategory::WhatsApp, format!("Failed to initialize connection: {}", e)).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn connect_whatsapp(
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.logger.debug(LogCategory::WhatsApp, "connect_whatsapp command called".to_string()).await;
    
    match state.connection_manager.connect().await {
        Ok(_) => {
            state.logger.debug(LogCategory::WhatsApp, "Connect command completed successfully".to_string()).await;
            Ok(())
        }
        Err(e) => {
            state.logger.error(LogCategory::WhatsApp, format!("Failed to connect: {}", e)).await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_connection_state(
    state: State<'_, AppState>,
) -> Result<crate::connection::ConnectionState, String> {
    let current_state = state.connection_manager.get_state().await;
    state.logger.debug(
        LogCategory::WhatsApp, 
        format!("get_connection_state command called - current state: {:?}", current_state)
    ).await;
    Ok(current_state)
}

#[tauri::command]
pub async fn attempt_connection_recovery(
    state: State<'_, AppState>,
    max_attempts: u32,
) -> Result<bool, String> {
    state.logger.debug(
        LogCategory::WhatsApp, 
        format!("attempt_connection_recovery command called - max_attempts: {}", max_attempts)
    ).await;
    
    state.connection_manager.attempt_recovery(max_attempts).await
}

#[tauri::command]
pub async fn get_recovery_info(
    state: State<'_, AppState>,
) -> Result<(u32, bool), String> {
    let info = state.connection_manager.get_recovery_info().await;
    state.logger.debug(
        LogCategory::WhatsApp, 
        format!("get_recovery_info command called - attempts: {}, is_recovering: {}", info.0, info.1)
    ).await;
    Ok(info)
}

#[tauri::command]
pub async fn is_initializing(
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let initializing = state.connection_manager.is_initializing().await;
    state.logger.debug(
        LogCategory::WhatsApp, 
        format!("is_initializing command called - result: {}", initializing)
    ).await;
    Ok(initializing)
}

#[tauri::command]
pub fn is_initialization_locked(
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let locked = state.connection_manager.is_initialization_locked();
    Ok(locked)
}

// ============================================================================
// Logging Commands
// ============================================================================

#[tauri::command]
pub async fn get_logs(
    filter: Option<LogFilter>,
    state: State<'_, AppState>,
) -> Result<Vec<LogEntry>, String> {
    Ok(state.logger.get_logs(filter).await)
}

#[tauri::command]
pub async fn clear_logs(
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.logger.clear().await;
    Ok(())
}

#[tauri::command]
pub async fn set_log_level(
    level: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    use crate::logging::logger::LogLevel;
    
    let log_level = match level.to_lowercase().as_str() {
        "debug" => LogLevel::Debug,
        "info" => LogLevel::Info,
        "warning" => LogLevel::Warning,
        "error" => LogLevel::Error,
        _ => return Err(format!("Invalid log level: {}. Valid levels are: debug, info, warning, error", level)),
    };
    
    state.logger.set_log_level(log_level).await;
    state.logger.info(
        LogCategory::General,
        format!("Log level changed to: {}", level)
    ).await;
    
    Ok(())
}

#[tauri::command]
pub async fn get_log_level(
    state: State<'_, AppState>,
) -> Result<String, String> {
    use crate::logging::logger::LogLevel;
    
    let level = state.logger.get_log_level().await;
    let level_str = match level {
        LogLevel::Debug => "debug",
        LogLevel::Info => "info",
        LogLevel::Warning => "warning",
        LogLevel::Error => "error",
    };
    
    Ok(level_str.to_string())
}
