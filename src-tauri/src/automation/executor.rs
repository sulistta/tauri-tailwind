use crate::whatsapp::types::{Automation, AutomationAction, AutomationTrigger, MessageFilter};
use crate::whatsapp::WhatsAppClient;
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};
use tauri::path::BaseDirectory;
use tokio::time::{sleep, Duration};

/// Message event data received from WhatsApp
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct MessageEvent {
    pub from: String,
    pub body: String,
    pub timestamp: u64,
    pub is_group: bool,
}

/// Group join event data
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct GroupJoinEvent {
    pub group_id: String,
    pub participant: String,
}

/// Check if a trigger matches the given event
#[allow(dead_code)]
pub fn matches_trigger(trigger: &AutomationTrigger, event: &TriggerEvent) -> bool {
    match (trigger, event) {
        (AutomationTrigger::OnMessage { filter }, TriggerEvent::Message(msg)) => {
            matches_message_filter(filter.as_ref(), msg)
        }
        (AutomationTrigger::OnGroupJoin { group_id }, TriggerEvent::GroupJoin(join)) => {
            if let Some(target_group) = group_id {
                target_group == &join.group_id
            } else {
                true // Match any group join
            }
        }
        (AutomationTrigger::OnAppStart, TriggerEvent::AppStart) => true,
        _ => false,
    }
}

/// Check if a message matches the filter criteria
#[allow(dead_code)]
fn matches_message_filter(filter: Option<&MessageFilter>, msg: &MessageEvent) -> bool {
    if let Some(filter) = filter {
        // Check 'from' filter
        if let Some(from) = &filter.from {
            if !msg.from.contains(from) {
                return false;
            }
        }
        
        // Check 'contains' filter
        if let Some(contains) = &filter.contains {
            if !msg.body.to_lowercase().contains(&contains.to_lowercase()) {
                return false;
            }
        }
        
        true
    } else {
        true // No filter means match all messages
    }
}

/// Trigger event types
#[allow(dead_code)]
#[derive(Debug, Clone)]
pub enum TriggerEvent {
    Message(MessageEvent),
    GroupJoin(GroupJoinEvent),
    AppStart,
}

/// Execute an automation's actions
pub async fn execute_automation(
    automation: &Automation,
    app_handle: &AppHandle,
    whatsapp_client: Option<&WhatsAppClient>,
) -> Result<(), String> {
    if !automation.enabled {
        return Ok(());
    }
    
    for action in &automation.actions {
        if let Err(e) = execute_action(action, app_handle, whatsapp_client).await {
            // Emit error event
            let _ = app_handle.emit("automation_error", json!({
                "automation_id": automation.id,
                "automation_name": automation.name,
                "error": e,
            }));
            
            return Err(e);
        }
        
        // Apply delay if specified in action
        if let Some(delay) = get_action_delay(action) {
            sleep(Duration::from_secs(delay)).await;
        }
    }
    
    Ok(())
}

/// Execute a single automation action
async fn execute_action(
    action: &AutomationAction,
    app_handle: &AppHandle,
    whatsapp_client: Option<&WhatsAppClient>,
) -> Result<(), String> {
    match action {
        AutomationAction::SendMessage { to, message, delay } => {
            execute_send_message(to, message, whatsapp_client).await?;
            
            if let Some(delay_secs) = delay {
                sleep(Duration::from_secs(*delay_secs)).await;
            }
        }
        
        AutomationAction::ExtractInfo { group_id } => {
            execute_extract_info(group_id, whatsapp_client).await?;
        }
        
        AutomationAction::AddToGroup { group_id, numbers } => {
            execute_add_to_group(group_id, numbers, whatsapp_client).await?;
        }
        
        AutomationAction::SaveToList { list_name, data } => {
            execute_save_to_list(list_name, data, app_handle).await?;
        }
    }
    
    Ok(())
}

/// Execute send message action
async fn execute_send_message(
    to: &str,
    message: &str,
    whatsapp_client: Option<&WhatsAppClient>,
) -> Result<(), String> {
    let client = whatsapp_client.ok_or("WhatsApp client not available")?;
    
    let command = json!({
        "type": "send_message",
        "to": to,
        "message": message,
    });
    
    client.send_command(command).await?;
    Ok(())
}

/// Execute extract info action
async fn execute_extract_info(
    group_id: &str,
    whatsapp_client: Option<&WhatsAppClient>,
) -> Result<(), String> {
    let client = whatsapp_client.ok_or("WhatsApp client not available")?;
    
    let command = json!({
        "type": "extract_members",
        "group_id": group_id,
    });
    
    client.send_command(command).await?;
    Ok(())
}

/// Execute add to group action
async fn execute_add_to_group(
    group_id: &str,
    numbers: &[String],
    whatsapp_client: Option<&WhatsAppClient>,
) -> Result<(), String> {
    let client = whatsapp_client.ok_or("WhatsApp client not available")?;
    
    let command = json!({
        "type": "add_to_group",
        "group_id": group_id,
        "numbers": numbers,
        "delay": 3, // Default delay of 3 seconds
    });
    
    client.send_command(command).await?;
    Ok(())
}

/// Execute save to list action
async fn execute_save_to_list(
    list_name: &str,
    data: &serde_json::Value,
    app_handle: &AppHandle,
) -> Result<(), String> {
    use std::fs;
    
    let app_data_dir = app_handle
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let lists_dir = app_data_dir.join("lists");
    fs::create_dir_all(&lists_dir)
        .map_err(|e| format!("Failed to create lists directory: {}", e))?;
    
    let list_path = lists_dir.join(format!("{}.json", list_name));
    
    // Load existing list or create new
    let mut list_data: Vec<serde_json::Value> = if list_path.exists() {
        let content = fs::read_to_string(&list_path)
            .map_err(|e| format!("Failed to read list file: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| vec![])
    } else {
        vec![]
    };
    
    // Append new data
    list_data.push(data.clone());
    
    // Write back
    let content = serde_json::to_string_pretty(&list_data)
        .map_err(|e| format!("Failed to serialize list: {}", e))?;
    
    fs::write(&list_path, content)
        .map_err(|e| format!("Failed to write list file: {}", e))?;
    
    Ok(())
}

/// Get delay from action if it has one
fn get_action_delay(action: &AutomationAction) -> Option<u64> {
    match action {
        AutomationAction::SendMessage { delay, .. } => *delay,
        _ => None,
    }
}

/// Automation executor that manages running automations
#[allow(dead_code)]
pub struct AutomationExecutor {
    app_handle: AppHandle,
}

#[allow(dead_code)]
impl AutomationExecutor {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }
    
    /// Process a trigger event and execute matching automations
    pub async fn process_event(
        &self,
        event: TriggerEvent,
        automations: &[Automation],
        _whatsapp_client: Option<&WhatsAppClient>,
    ) -> Result<(), String> {
        for automation in automations {
            if matches_trigger(&automation.trigger, &event) {
                // Execute automation in background
                let automation_clone = automation.clone();
                let app_handle_clone = self.app_handle.clone();
                
                tokio::spawn(async move {
                    // Note: We can't pass the client directly due to lifetime issues
                    // In a real implementation, we'd use a shared state or message passing
                    if let Err(e) = execute_automation(&automation_clone, &app_handle_clone, None).await {
                        eprintln!("Failed to execute automation {}: {}", automation_clone.name, e);
                    }
                });
            }
        }
        
        Ok(())
    }
    
    /// Execute on_app_start automations
    pub async fn execute_app_start_automations(
        &self,
        automations: &[Automation],
        _whatsapp_client: Option<&WhatsAppClient>,
    ) -> Result<(), String> {
        self.process_event(TriggerEvent::AppStart, automations, _whatsapp_client).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_message_filter_matching() {
        let msg = MessageEvent {
            from: "123456@c.us".to_string(),
            body: "Hello World".to_string(),
            timestamp: 0,
            is_group: false,
        };
        
        // Test with no filter
        assert!(matches_message_filter(None, &msg));
        
        // Test with 'from' filter
        let filter = MessageFilter {
            from: Some("123456".to_string()),
            contains: None,
        };
        assert!(matches_message_filter(Some(&filter), &msg));
        
        // Test with 'contains' filter
        let filter = MessageFilter {
            from: None,
            contains: Some("hello".to_string()),
        };
        assert!(matches_message_filter(Some(&filter), &msg));
        
        // Test with non-matching filter
        let filter = MessageFilter {
            from: Some("999999".to_string()),
            contains: None,
        };
        assert!(!matches_message_filter(Some(&filter), &msg));
    }
    
    #[test]
    fn test_trigger_matching() {
        let msg_event = TriggerEvent::Message(MessageEvent {
            from: "123456@c.us".to_string(),
            body: "Test".to_string(),
            timestamp: 0,
            is_group: false,
        });
        
        let trigger = AutomationTrigger::OnMessage { filter: None };
        assert!(matches_trigger(&trigger, &msg_event));
        
        let app_start_trigger = AutomationTrigger::OnAppStart;
        assert!(!matches_trigger(&app_start_trigger, &msg_event));
        
        let app_start_event = TriggerEvent::AppStart;
        assert!(matches_trigger(&app_start_trigger, &app_start_event));
    }
}
