use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GroupInfo {
    pub id: String,
    pub name: String,
    pub participant_count: u32,
    pub is_admin: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Participant {
    pub phone_number: String,
    pub name: Option<String>,
    pub is_admin: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdditionReport {
    pub successful: Vec<String>,
    pub failed: Vec<FailedAddition>,
    pub total_processed: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FailedAddition {
    pub phone_number: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Automation {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub trigger: AutomationTrigger,
    pub actions: Vec<AutomationAction>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum AutomationTrigger {
    OnMessage { filter: Option<MessageFilter> },
    OnGroupJoin { group_id: Option<String> },
    OnAppStart,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageFilter {
    pub from: Option<String>,
    pub contains: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum AutomationAction {
    SendMessage { to: String, message: String, delay: Option<u64> },
    ExtractInfo { group_id: String },
    AddToGroup { group_id: String, numbers: Vec<String> },
    SaveToList { list_name: String, data: serde_json::Value },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SessionStatus {
    pub exists: bool,
    pub phone_number: Option<String>,
}
