use std::{
    sync::mpsc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, State};

use crate::{
    engine::models::{BehaviorAction, BehaviorTickPayload, Mood, TokkiState, TransitionReason, UserEvent},
    events::emit_behavior_tick,
    llm::models::{ChatMessage, LlmResponse},
    runtime::{SharedLlmClient, SharedRuntime},
};

fn now_millis() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn stop_loop_state(runtime: &SharedRuntime) -> Result<Option<mpsc::Sender<()>>, String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    guard.running = false;
    Ok(guard.stop_tx.take())
}

fn finalize_loop_state(runtime: &SharedRuntime, loop_generation: u64) {
    if let Ok(mut guard) = runtime.0.lock() {
        if guard.loop_generation == loop_generation {
            guard.running = false;
            guard.stop_tx = None;
        }
    }
}

fn timer_tick(runtime: &SharedRuntime) -> Result<BehaviorTickPayload, String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard.engine.tick(TransitionReason::Timer, None))
}

fn apply_user_event(runtime: &SharedRuntime, event: UserEvent) -> Result<BehaviorTickPayload, String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard
        .engine
        .tick(TransitionReason::Interaction, Some(event)))
}

fn llm_response_to_action(response: &LlmResponse) -> BehaviorAction {
    let (id, animation) = match response.animation.as_str() {
        "idle.hop" => ("idle_hop", "idle.hop"),
        "idle.look" => ("idle_look", "idle.look"),
        "rest.nap" => ("rest_nap", "rest.nap"),
        "react.poke" => ("react_poke", "react.poke"),
        "react.click" => ("react_click", "react.click"),
        _ => ("idle_blink", "idle.blink"),
    };

    BehaviorAction {
        id: id.to_string(),
        animation: animation.to_string(),
        mood: response.mood.clone(),
        duration_ms: 2000,
        interruptible: true,
    }
}

/// Adjusts energy based on the LLM response intent.
fn apply_intent_energy(energy: u8, intent: &str) -> u8 {
    match intent {
        "greet" | "joke" => (energy as u16 + 15).min(100) as u8,
        "help" | "think" => (energy as u16 + 5).min(100) as u8,
        "goodbye" => energy.saturating_sub(10),
        _ => energy,
    }
}

#[tauri::command]
pub fn start_behavior_loop(
    app: AppHandle,
    runtime: State<'_, SharedRuntime>,
    seed: Option<u64>,
) -> Result<(), String> {
    let (tx, rx) = mpsc::channel::<()>();
    let loop_generation: u64;

    {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;

        if guard.running {
            return Ok(());
        }

        if let Some(custom_seed) = seed {
            guard.seed = custom_seed;
            guard.engine.reseed(custom_seed);
        }

        guard.running = true;
        guard.stop_tx = Some(tx);
        guard.loop_generation = guard.loop_generation.saturating_add(1);
        loop_generation = guard.loop_generation;
    }

    let runtime_ref = runtime.inner().clone();
    std::thread::spawn(move || {
        loop {
            if rx.recv_timeout(Duration::from_millis(1_250)).is_ok() {
                break;
            }

            let tick = {
                let mut guard = match runtime_ref.0.lock() {
                    Ok(guard) => guard,
                    Err(_) => break,
                };
                if !guard.running {
                    break;
                }
                guard.engine.tick(TransitionReason::Timer, None)
            };

            if emit_behavior_tick(&app, &tick).is_err() {
                break;
            }
        }

        finalize_loop_state(&runtime_ref, loop_generation);
    });

    Ok(())
}

#[tauri::command]
pub fn stop_behavior_loop(runtime: State<'_, SharedRuntime>) -> Result<(), String> {
    let maybe_sender = stop_loop_state(runtime.inner())?;
    if let Some(sender) = maybe_sender {
        let _ = sender.send(());
    }
    Ok(())
}

#[tauri::command]
pub fn handle_user_interaction(
    app: AppHandle,
    runtime: State<'_, SharedRuntime>,
    mut event: UserEvent,
) -> Result<BehaviorTickPayload, String> {
    if event.timestamp == 0 {
        event.timestamp = now_millis();
    }
    let tick = apply_user_event(runtime.inner(), event)?;
    emit_behavior_tick(&app, &tick)?;
    Ok(tick)
}

#[tauri::command]
pub fn get_current_state(runtime: State<'_, SharedRuntime>) -> Result<TokkiState, String> {
    let guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard.engine.current_state())
}

#[tauri::command]
pub fn advance_tick(
    app: AppHandle,
    runtime: State<'_, SharedRuntime>,
) -> Result<BehaviorTickPayload, String> {
    let tick = timer_tick(runtime.inner())?;
    emit_behavior_tick(&app, &tick)?;
    Ok(tick)
}

#[derive(serde::Serialize)]
pub struct ChatResponse {
    pub reply: LlmResponse,
    pub tick: BehaviorTickPayload,
}

#[tauri::command]
pub async fn send_chat_message(
    app: AppHandle,
    runtime: State<'_, SharedRuntime>,
    llm_client: State<'_, SharedLlmClient>,
    message: String,
) -> Result<ChatResponse, String> {
    let timestamp = now_millis();

    // Add user message to history
    {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;
        guard.chat_history.push(ChatMessage {
            role: "user".to_string(),
            content: message.clone(),
            timestamp,
        });
    }

    // Get history snapshot and session context for LLM
    let (history, session_context) = {
        let guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;
        (
            guard.chat_history.clone(),
            guard.session_memory.to_context_string(),
        )
    };

    // Call LLM
    let client = llm_client.0.lock().await;
    let reply = client.chat(&message, &history, &session_context).await.unwrap_or_else(|_error| {
        LlmResponse {
            line: "Hmm, I can't think right now... try again?".to_string(),
            mood: Mood::Sleepy,
            animation: "idle.blink".to_string(),
            intent: "none".to_string(),
        }
    });

    // Store assistant reply in history and update session memory
    {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;
        guard.chat_history.push(ChatMessage {
            role: "assistant".to_string(),
            content: reply.line.clone(),
            timestamp: now_millis(),
        });

        // Update session memory with this exchange
        let mood_str = serde_json::to_string(&reply.mood).unwrap_or_default();
        let mood_str = mood_str.trim_matches('"');
        guard.session_memory.update(&message, &reply.intent, mood_str);
    }

    // Apply the LLM-driven action to the behavior engine
    let action = llm_response_to_action(&reply);
    let tick = {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;

        // Apply intent-driven energy adjustment
        let current_energy = guard.engine.current_state().energy;
        guard.engine.set_energy(apply_intent_energy(current_energy, &reply.intent));

        guard.engine.apply_action(action);
        let state = guard.engine.current_state();
        BehaviorTickPayload {
            state,
            reason: TransitionReason::Manual,
        }
    };

    emit_behavior_tick(&app, &tick)?;

    Ok(ChatResponse { reply, tick })
}

#[tauri::command]
pub fn get_chat_history(
    runtime: State<'_, SharedRuntime>,
) -> Result<Vec<ChatMessage>, String> {
    let guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard.chat_history.clone())
}

#[tauri::command]
pub fn set_avatar(
    runtime: State<'_, SharedRuntime>,
    avatar_id: String,
) -> Result<(), String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    guard.avatar_id = avatar_id;
    Ok(())
}

#[tauri::command]
pub fn get_session_memory(
    runtime: State<'_, SharedRuntime>,
) -> Result<crate::llm::memory::SessionMemory, String> {
    let guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard.session_memory.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        engine::models::UserEventType,
        runtime::{RuntimeState, SharedRuntime},
    };
    use std::sync::{mpsc::channel, Arc, Mutex};

    fn test_runtime(seed: u64) -> SharedRuntime {
        SharedRuntime(Arc::new(Mutex::new(RuntimeState::with_seed(seed))))
    }

    #[test]
    fn apply_event_returns_interaction_tick() {
        let runtime = test_runtime(11);
        let tick = apply_user_event(
            &runtime,
            UserEvent {
                kind: UserEventType::Poke,
                x: None,
                y: None,
                timestamp: 1,
            },
        )
        .expect("event should apply");

        assert_eq!(tick.reason, TransitionReason::Interaction);
        assert_eq!(tick.state.current_action.id, "react_poke");
    }

    #[test]
    fn timer_tick_advances_counter() {
        let runtime = test_runtime(22);

        let first = timer_tick(&runtime).expect("first tick");
        let second = timer_tick(&runtime).expect("second tick");

        assert!(second.state.tick_count > first.state.tick_count);
    }

    #[test]
    fn stop_loop_state_disables_runtime_and_extracts_sender() {
        let runtime = test_runtime(44);
        let (tx, _rx) = channel();

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.running = true;
            guard.stop_tx = Some(tx);
        }

        let sender = stop_loop_state(&runtime)
            .expect("stop should succeed")
            .expect("sender should exist");
        let _ = sender.send(());

        let guard = runtime.0.lock().expect("runtime lock");
        assert!(!guard.running);
        assert!(guard.stop_tx.is_none());
    }

    #[test]
    fn finalize_loop_state_clears_matching_generation() {
        let runtime = test_runtime(55);
        let (tx, _rx) = channel();

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.running = true;
            guard.stop_tx = Some(tx);
            guard.loop_generation = 3;
        }

        finalize_loop_state(&runtime, 3);

        let guard = runtime.0.lock().expect("runtime lock");
        assert!(!guard.running);
        assert!(guard.stop_tx.is_none());
    }

    #[test]
    fn finalize_loop_state_ignores_stale_generation() {
        let runtime = test_runtime(66);
        let (tx, _rx) = channel();

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.running = true;
            guard.stop_tx = Some(tx);
            guard.loop_generation = 4;
        }

        finalize_loop_state(&runtime, 3);

        let guard = runtime.0.lock().expect("runtime lock");
        assert!(guard.running);
        assert!(guard.stop_tx.is_some());
    }

    #[test]
    fn llm_response_maps_to_action() {
        let response = LlmResponse {
            line: "Hello!".to_string(),
            mood: Mood::Playful,
            animation: "idle.hop".to_string(),
            intent: "greet".to_string(),
        };
        let action = llm_response_to_action(&response);
        assert_eq!(action.id, "idle_hop");
        assert_eq!(action.mood, Mood::Playful);
    }

    #[test]
    fn intent_energy_greet_boosts() {
        assert_eq!(apply_intent_energy(50, "greet"), 65);
        assert_eq!(apply_intent_energy(50, "joke"), 65);
    }

    #[test]
    fn intent_energy_goodbye_drains() {
        assert_eq!(apply_intent_energy(50, "goodbye"), 40);
        assert_eq!(apply_intent_energy(5, "goodbye"), 0);
    }

    #[test]
    fn intent_energy_help_small_boost() {
        assert_eq!(apply_intent_energy(50, "help"), 55);
        assert_eq!(apply_intent_energy(50, "think"), 55);
    }

    #[test]
    fn intent_energy_none_unchanged() {
        assert_eq!(apply_intent_energy(50, "none"), 50);
    }

    #[test]
    fn intent_energy_caps_at_100() {
        assert_eq!(apply_intent_energy(95, "greet"), 100);
    }
}
