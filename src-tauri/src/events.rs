use crate::engine::models::BehaviorTickPayload;
use crate::presence::ProactiveMessage;
use tauri::{AppHandle, Emitter};

pub const BEHAVIOR_TICK_EVENT: &str = "tokki://behavior_tick";
pub const PROACTIVE_MESSAGE_EVENT: &str = "tokki://proactive_message";

pub fn emit_behavior_tick(app: &AppHandle, payload: &BehaviorTickPayload) -> Result<(), String> {
    app.emit(BEHAVIOR_TICK_EVENT, payload)
        .map_err(|error| format!("failed to emit behavior tick: {error}"))
}

pub fn emit_proactive_message(app: &AppHandle, message: &ProactiveMessage) -> Result<(), String> {
    app.emit(PROACTIVE_MESSAGE_EVENT, message)
        .map_err(|error| format!("failed to emit proactive message: {error}"))
}
