pub mod client;
pub mod types;

pub use client::WhatsAppClient;
pub use types::{
    GroupInfo, Participant, AdditionReport, FailedAddition,
    Automation, AutomationTrigger, AutomationAction, MessageFilter,
    SessionStatus,
};
