use crate::engine::models::BehaviorTickPayload;
use tauri::{AppHandle, Emitter};

pub const BEHAVIOR_TICK_EVENT: &str = "tokki://behavior_tick";

pub fn emit_behavior_tick(app: &AppHandle, payload: &BehaviorTickPayload) -> Result<(), String> {
    app.emit(BEHAVIOR_TICK_EVENT, payload)
        .map_err(|error| format!("failed to emit behavior tick: {error}"))
}
