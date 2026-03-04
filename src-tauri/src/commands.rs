use std::{
    sync::mpsc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, State};

use crate::{
    engine::models::{BehaviorTickPayload, TokkiState, TransitionReason, UserEvent},
    events::emit_behavior_tick,
    runtime::SharedRuntime,
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
}
