// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod whatsapp;
mod automation;
mod logging;
mod connection;

use commands::AppState;
use connection::ConnectionManager;
use std::sync::Arc;
use logging::Logger;
use tauri::{Manager, Listener};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let mut logger = Logger::new();
            logger.set_app_handle(app.handle().clone());
            let logger = Arc::new(logger);
            
            // Initialize ConnectionManager
            let connection_manager = Arc::new(ConnectionManager::new(app.handle().clone(), logger.clone()));
            
            app.manage(AppState {
                connection_manager: connection_manager.clone(),
                logger,
            });
            
            // Set up event listeners to route state-changing events through ConnectionManager
            let app_handle = app.handle().clone();
            
            // Listen for QR code events
            let cm = connection_manager.clone();
            app_handle.listen("whatsapp_qr", move |event| {
                let cm = cm.clone();
                let payload_str: &str = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    tauri::async_runtime::spawn(async move {
                        cm.handle_state_event("whatsapp_qr", &data).await;
                    });
                }
            });
            
            // Listen for ready events
            let cm = connection_manager.clone();
            app_handle.listen("whatsapp_ready", move |event| {
                let cm = cm.clone();
                let payload_str: &str = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    tauri::async_runtime::spawn(async move {
                        cm.handle_state_event("whatsapp_ready", &data).await;
                    });
                }
            });
            
            // Listen for disconnected events
            let cm = connection_manager.clone();
            app_handle.listen("whatsapp_disconnected", move |event| {
                let cm = cm.clone();
                let payload_str: &str = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    tauri::async_runtime::spawn(async move {
                        cm.handle_state_event("whatsapp_disconnected", &data).await;
                    });
                }
            });
            
            // Listen for error events
            let cm = connection_manager.clone();
            app_handle.listen("whatsapp_error", move |event| {
                let cm = cm.clone();
                let payload_str: &str = event.payload();
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(payload_str) {
                    tauri::async_runtime::spawn(async move {
                        cm.handle_state_event("whatsapp_error", &data).await;
                    });
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::initialize_connection,
            commands::connect_whatsapp,
            commands::get_connection_state,
            commands::attempt_connection_recovery,
            commands::get_recovery_info,
            commands::is_initializing,
            commands::is_initialization_locked,
            commands::get_groups,
            commands::extract_group_members,
            commands::add_users_to_group,
            commands::create_automation,
            commands::get_automations,
            commands::delete_automation,
            commands::toggle_automation,
            commands::execute_automation,
            commands::get_logs,
            commands::clear_logs,
            commands::set_log_level,
            commands::get_log_level,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
