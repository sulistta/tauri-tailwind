// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod whatsapp;
mod automation;
mod logging;

use commands::AppState;
use tokio::sync::Mutex;
use std::sync::Arc;
use logging::Logger;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let mut logger = Logger::new();
            logger.set_app_handle(app.handle().clone());
            
            app.manage(AppState {
                whatsapp_client: Mutex::new(None),
                logger: Arc::new(logger),
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_session,
            commands::initialize_whatsapp,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
