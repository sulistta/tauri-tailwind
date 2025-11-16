use crate::whatsapp::{WhatsAppClient, GroupInfo, Participant, AdditionReport};
use crate::whatsapp::types::Automation;
use crate::automation::{storage, executor};
use crate::logging::{Logger, LogEntry, LogFilter, LogCategory};
use tauri::State;
use tokio::sync::Mutex;
use std::sync::Arc;

pub struct AppState {
    pub whatsapp_client: Mutex<Option<WhatsAppClient>>,
    pub logger: Arc<Logger>,
}

#[tauri::command]
pub async fn initialize_whatsapp(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.logger.info(LogCategory::WhatsApp, "Initializing WhatsApp client".to_string()).await;
    
    let mut client_guard = state.whatsapp_client.lock().await;
    
    if client_guard.is_none() {
        let client = WhatsAppClient::new(app_handle.clone());
        match client.initialize().await {
            Ok(_) => {
                *client_guard = Some(client);
                state.logger.info(LogCategory::WhatsApp, "WhatsApp client initialized successfully".to_string()).await;
                Ok(())
            }
            Err(e) => {
                state.logger.error(LogCategory::WhatsApp, format!("Failed to initialize WhatsApp client: {}", e)).await;
                Err(e)
            }
        }
    } else {
        // Client already exists, just ensure it's running
        if let Some(client) = client_guard.as_ref() {
            if !client.is_running().await {
                match client.restart().await {
                    Ok(_) => {
                        state.logger.info(LogCategory::WhatsApp, "WhatsApp client restarted successfully".to_string()).await;
                        Ok(())
                    }
                    Err(e) => {
                        state.logger.error(LogCategory::WhatsApp, format!("Failed to restart WhatsApp client: {}", e)).await;
                        Err(e)
                    }
                }
            } else {
                state.logger.info(LogCategory::WhatsApp, "WhatsApp client already running".to_string()).await;
                Ok(())
            }
        } else {
            Ok(())
        }
    }
}

#[tauri::command]
pub async fn get_groups(
    state: State<'_, AppState>,
) -> Result<Vec<GroupInfo>, String> {
    state.logger.info(LogCategory::WhatsApp, "Fetching WhatsApp groups".to_string()).await;
    
    let client_guard = state.whatsapp_client.lock().await;
    
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
}

#[tauri::command]
pub async fn extract_group_members(
    group_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Participant>, String> {
    state.logger.info(LogCategory::WhatsApp, format!("Extracting members from group: {}", group_id)).await;
    
    let client_guard = state.whatsapp_client.lock().await;
    
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
    
    let client_guard = state.whatsapp_client.lock().await;
    
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
    
    // Get WhatsApp client
    let client_guard = state.whatsapp_client.lock().await;
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
