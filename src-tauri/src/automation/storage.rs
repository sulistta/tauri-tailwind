use crate::whatsapp::types::Automation;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri::path::BaseDirectory;

#[derive(Debug, Serialize, Deserialize)]
struct AutomationStorage {
    automations: Vec<Automation>,
}

// File lock to prevent concurrent write issues
static FILE_LOCK: Mutex<()> = Mutex::new(());

/// Get the path to the automations storage file
fn get_storage_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    Ok(app_data_dir.join("automations.json"))
}

/// Save an automation to the storage file
pub async fn save_automation(
    app_handle: &AppHandle,
    automation: Automation,
) -> Result<(), String> {
    let _lock = FILE_LOCK.lock().map_err(|e| format!("Failed to acquire file lock: {}", e))?;
    
    let storage_path = get_storage_path(app_handle)?;
    
    // Load existing automations
    let mut storage = if storage_path.exists() {
        let content = fs::read_to_string(&storage_path)
            .map_err(|e| format!("Failed to read automations file: {}", e))?;
        
        serde_json::from_str::<AutomationStorage>(&content)
            .unwrap_or_else(|_| AutomationStorage {
                automations: vec![],
            })
    } else {
        AutomationStorage {
            automations: vec![],
        }
    };
    
    // Check if automation with same ID exists and update, otherwise add
    if let Some(index) = storage.automations.iter().position(|a| a.id == automation.id) {
        storage.automations[index] = automation;
    } else {
        storage.automations.push(automation);
    }
    
    // Write back to file
    let content = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize automations: {}", e))?;
    
    fs::write(&storage_path, content)
        .map_err(|e| format!("Failed to write automations file: {}", e))?;
    
    Ok(())
}

/// Load all automations from the storage file
pub async fn load_automations(app_handle: &AppHandle) -> Result<Vec<Automation>, String> {
    let _lock = FILE_LOCK.lock().map_err(|e| format!("Failed to acquire file lock: {}", e))?;
    
    let storage_path = get_storage_path(app_handle)?;
    
    if !storage_path.exists() {
        return Ok(vec![]);
    }
    
    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read automations file: {}", e))?;
    
    let storage = serde_json::from_str::<AutomationStorage>(&content)
        .map_err(|e| format!("Failed to parse automations file: {}", e))?;
    
    Ok(storage.automations)
}

/// Delete an automation from the storage file
pub async fn delete_automation(
    app_handle: &AppHandle,
    automation_id: &str,
) -> Result<(), String> {
    let _lock = FILE_LOCK.lock().map_err(|e| format!("Failed to acquire file lock: {}", e))?;
    
    let storage_path = get_storage_path(app_handle)?;
    
    if !storage_path.exists() {
        return Err("Automations file does not exist".to_string());
    }
    
    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read automations file: {}", e))?;
    
    let mut storage = serde_json::from_str::<AutomationStorage>(&content)
        .map_err(|e| format!("Failed to parse automations file: {}", e))?;
    
    // Find and remove the automation
    let initial_len = storage.automations.len();
    storage.automations.retain(|a| a.id != automation_id);
    
    if storage.automations.len() == initial_len {
        return Err(format!("Automation with ID '{}' not found", automation_id));
    }
    
    // Write back to file
    let content = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize automations: {}", e))?;
    
    fs::write(&storage_path, content)
        .map_err(|e| format!("Failed to write automations file: {}", e))?;
    
    Ok(())
}

/// Toggle automation enabled status
pub async fn toggle_automation(
    app_handle: &AppHandle,
    automation_id: &str,
    enabled: bool,
) -> Result<(), String> {
    let _lock = FILE_LOCK.lock().map_err(|e| format!("Failed to acquire file lock: {}", e))?;
    
    let storage_path = get_storage_path(app_handle)?;
    
    if !storage_path.exists() {
        return Err("Automations file does not exist".to_string());
    }
    
    let content = fs::read_to_string(&storage_path)
        .map_err(|e| format!("Failed to read automations file: {}", e))?;
    
    let mut storage = serde_json::from_str::<AutomationStorage>(&content)
        .map_err(|e| format!("Failed to parse automations file: {}", e))?;
    
    // Find and update the automation
    let automation = storage
        .automations
        .iter_mut()
        .find(|a| a.id == automation_id)
        .ok_or_else(|| format!("Automation with ID '{}' not found", automation_id))?;
    
    automation.enabled = enabled;
    
    // Write back to file
    let content = serde_json::to_string_pretty(&storage)
        .map_err(|e| format!("Failed to serialize automations: {}", e))?;
    
    fs::write(&storage_path, content)
        .map_err(|e| format!("Failed to write automations file: {}", e))?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::whatsapp::types::{AutomationAction, AutomationTrigger};
    
    fn create_test_automation(id: &str, name: &str) -> Automation {
        Automation {
            id: id.to_string(),
            name: name.to_string(),
            enabled: true,
            trigger: AutomationTrigger::OnAppStart,
            actions: vec![AutomationAction::SendMessage {
                to: "123456".to_string(),
                message: "Test".to_string(),
                delay: None,
            }],
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
    
    #[test]
    fn test_automation_storage_serialization() {
        let automation = create_test_automation("test-1", "Test Automation");
        let storage = AutomationStorage {
            automations: vec![automation],
        };
        
        let json = serde_json::to_string(&storage).unwrap();
        let deserialized: AutomationStorage = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.automations.len(), 1);
        assert_eq!(deserialized.automations[0].id, "test-1");
    }
}
