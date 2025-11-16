use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc};
use tauri::Emitter;

const MAX_LOG_ENTRIES: usize = 1000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LogCategory {
    General,
    Automation,
    WhatsApp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub level: LogLevel,
    pub category: LogCategory,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFilter {
    pub level: Option<LogLevel>,
    pub category: Option<LogCategory>,
}

pub struct Logger {
    entries: Arc<Mutex<VecDeque<LogEntry>>>,
    app_handle: Option<tauri::AppHandle>,
}

impl Logger {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(Mutex::new(VecDeque::with_capacity(MAX_LOG_ENTRIES))),
            app_handle: None,
        }
    }

    pub fn set_app_handle(&mut self, handle: tauri::AppHandle) {
        self.app_handle = Some(handle);
    }

    pub async fn log(&self, level: LogLevel, category: LogCategory, message: String) {
        let entry = LogEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            level: level.clone(),
            category: category.clone(),
            message: message.clone(),
        };

        // Add to buffer
        let mut entries = self.entries.lock().await;
        if entries.len() >= MAX_LOG_ENTRIES {
            entries.pop_front();
        }
        entries.push_back(entry.clone());
        drop(entries);

        // Emit to frontend
        if let Some(handle) = &self.app_handle {
            let _ = handle.emit("log_entry", entry);
        }
    }

    pub async fn info(&self, category: LogCategory, message: String) {
        self.log(LogLevel::Info, category, message).await;
    }

    pub async fn warning(&self, category: LogCategory, message: String) {
        self.log(LogLevel::Warning, category, message).await;
    }

    pub async fn error(&self, category: LogCategory, message: String) {
        self.log(LogLevel::Error, category, message).await;
    }

    pub async fn get_logs(&self, filter: Option<LogFilter>) -> Vec<LogEntry> {
        let entries = self.entries.lock().await;
        
        if let Some(filter) = filter {
            entries
                .iter()
                .filter(|entry| {
                    let level_match = filter.level.as_ref()
                        .map(|l| &entry.level == l)
                        .unwrap_or(true);
                    
                    let category_match = filter.category.as_ref()
                        .map(|c| &entry.category == c)
                        .unwrap_or(true);
                    
                    level_match && category_match
                })
                .cloned()
                .collect()
        } else {
            entries.iter().cloned().collect()
        }
    }

    pub async fn clear(&self) {
        let mut entries = self.entries.lock().await;
        entries.clear();
    }
}

impl Default for Logger {
    fn default() -> Self {
        Self::new()
    }
}
