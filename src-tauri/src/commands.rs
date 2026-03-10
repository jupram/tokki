use std::{
    sync::mpsc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, State};

use crate::{
    discovery,
    engine::models::{
        normalize_avatar_id, BehaviorAction, BehaviorTickPayload, PersonalityConfig,
        PersonalityPreset, TokkiState, TransitionReason, UserEvent,
    },
    events::{emit_behavior_tick, emit_proactive_message},
    llm::{
        config::ProviderConfig,
        models::{ChatMessage, LlmResponse},
        provider::ProviderKind,
    },
    presence,
    runtime::{SharedLlmClient, SharedPersistence, SharedRuntime},
};

/// Maximum number of chat messages kept in backend history.
/// Matches the frontend cap in `useTokkiStore`.
const MAX_CHAT_HISTORY: usize = 200;

/// Maximum allowed length (in chars) for a single user chat message.
const MAX_MESSAGE_LENGTH: usize = 2000;

fn now_millis() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn trim_chat_history(history: &mut Vec<ChatMessage>) {
    if history.len() > MAX_CHAT_HISTORY {
        let excess = history.len() - MAX_CHAT_HISTORY;
        history.drain(..excess);
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
    let preset = guard.personality.preset.clone();
    guard.engine.set_personality(preset);
    Ok(guard.engine.tick(TransitionReason::Timer, None))
}

fn apply_user_event(
    runtime: &SharedRuntime,
    event: UserEvent,
) -> Result<BehaviorTickPayload, String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    let preset = guard.personality.preset.clone();
    guard.engine.set_personality(preset);
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

fn provider_requires_api_key(provider: &ProviderKind) -> bool {
    matches!(provider, ProviderKind::DefensiveHub | ProviderKind::OpenAi)
}

fn provider_display_name(provider: &ProviderKind) -> &'static str {
    match provider {
        ProviderKind::DefensiveHub => "Azure / DefensiveHub",
        ProviderKind::OpenAi => "OpenAI-compatible",
        ProviderKind::Ollama => "Ollama (local)",
        ProviderKind::Offline => "Offline mode",
    }
}

fn provider_has_api_key(config: &ProviderConfig) -> bool {
    config
        .api_key
        .as_deref()
        .map(str::trim)
        .map(|key| !key.is_empty())
        .unwrap_or(false)
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderHealthStatus {
    Healthy,
    Degraded,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct ProviderHealth {
    pub provider: ProviderKind,
    pub provider_name: String,
    pub status: ProviderHealthStatus,
    pub reason: String,
    pub requires_network: bool,
    pub api_key_required: bool,
    pub api_key_configured: bool,
}

fn provider_runtime_name(provider: &ProviderKind) -> &'static str {
    match provider {
        ProviderKind::DefensiveHub => "defensive_hub",
        ProviderKind::OpenAi => "openai",
        ProviderKind::Ollama => "ollama",
        ProviderKind::Offline => "offline",
    }
}

fn validate_provider_endpoint(endpoint: &str) -> Result<(), String> {
    let endpoint = endpoint.trim();
    if endpoint.is_empty() {
        return Err("endpoint is empty".to_string());
    }

    let parsed =
        reqwest::Url::parse(endpoint).map_err(|error| format!("endpoint is invalid: {error}"))?;

    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(format!(
            "endpoint scheme must be http or https (found {scheme})"
        ));
    }

    if parsed.host_str().is_none() {
        return Err("endpoint is missing a host".to_string());
    }

    Ok(())
}

fn assess_provider_health(
    config: &ProviderConfig,
    active_provider_name: &str,
    active_requires_network: bool,
    offline_templates_available: bool,
) -> ProviderHealth {
    let provider = config.provider.clone();
    let provider_name = provider_display_name(&provider).to_string();
    let api_key_required = provider_requires_api_key(&provider);
    let api_key_configured = !api_key_required || provider_has_api_key(config);

    let build = |status: ProviderHealthStatus, reason: String| ProviderHealth {
        provider: provider.clone(),
        provider_name: provider_name.clone(),
        status,
        reason,
        requires_network: active_requires_network,
        api_key_required,
        api_key_configured,
    };

    let expected_runtime_name = provider_runtime_name(&provider);
    if active_provider_name != expected_runtime_name {
        return build(
            ProviderHealthStatus::Degraded,
            format!(
                "active provider runtime mismatch: expected {expected_runtime_name}, got {active_provider_name}"
            ),
        );
    }

    if provider == ProviderKind::Offline {
        if offline_templates_available {
            return build(
                ProviderHealthStatus::Healthy,
                "offline mode ready: template responses are available".to_string(),
            );
        }

        return build(
            ProviderHealthStatus::Unavailable,
            "offline mode unavailable: no template responses are available".to_string(),
        );
    }

    let endpoint = config.effective_endpoint();
    if let Err(error) = validate_provider_endpoint(&endpoint) {
        return build(
            ProviderHealthStatus::Unavailable,
            format!("{provider_name} endpoint configuration is invalid: {error}"),
        );
    }

    if api_key_required && !api_key_configured {
        return build(
            ProviderHealthStatus::Degraded,
            format!(
                "{provider_name} API key is not configured; Tokki will fall back to offline replies"
            ),
        );
    }

    let expected_requires_network =
        matches!(provider, ProviderKind::DefensiveHub | ProviderKind::OpenAi);
    if active_requires_network != expected_requires_network {
        return build(
            ProviderHealthStatus::Degraded,
            format!(
                "active provider network profile mismatch: expected requires_network={expected_requires_network}, got {active_requires_network}"
            ),
        );
    }

    let reason = match provider {
        ProviderKind::DefensiveHub | ProviderKind::OpenAi => {
            format!("{provider_name} is configured and ready for requests")
        }
        ProviderKind::Ollama => "Ollama is configured and ready for local requests".to_string(),
        ProviderKind::Offline => unreachable!(),
    };

    build(ProviderHealthStatus::Healthy, reason)
}

fn summarize_provider_error(error: &str) -> String {
    let compact = error.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.is_empty() {
        return "provider unavailable".to_string();
    }

    const MAX_ERROR_CHARS: usize = 96;
    if compact.chars().count() > MAX_ERROR_CHARS {
        format!(
            "{}…",
            compact.chars().take(MAX_ERROR_CHARS).collect::<String>()
        )
    } else {
        compact
    }
}

fn build_offline_fallback_reply(
    user_message: &str,
    history: &[ChatMessage],
    session_context: &str,
    personality_fragment: &str,
    provider: &ProviderKind,
    reason: &str,
) -> LlmResponse {
    let mut offline_reply = crate::llm::offline::generate_offline_reply(
        user_message,
        history,
        session_context,
        personality_fragment,
    );
    let reason = summarize_provider_error(reason);

    offline_reply.line = if provider == &ProviderKind::Offline {
        format!(
            "I'm in offline mode and hit a local response hiccup ({reason}). {}",
            offline_reply.line
        )
    } else {
        format!(
            "I couldn't reach {} ({reason}), so I'm replying in offline mode. {}",
            provider_display_name(provider),
            offline_reply.line
        )
    };
    offline_reply.intent = "offline_fallback".to_string();
    offline_reply
}

fn restore_session_memory(
    runtime: &SharedRuntime,
    persistence: &SharedPersistence,
) -> Result<(), String> {
    let memory = persistence.load_session_memory()?;
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("runtime lock: {error}"))?;
    guard.session_memory = memory;
    Ok(())
}

fn persist_runtime_session_memory(
    runtime: &SharedRuntime,
    persistence: &SharedPersistence,
) -> Result<(), String> {
    let memory = {
        let guard = runtime
            .0
            .lock()
            .map_err(|error| format!("runtime lock: {error}"))?;
        guard.session_memory.clone()
    };

    persistence.save_session_memory(&memory)
}

fn clear_runtime_chat_history(
    runtime: &SharedRuntime,
    persistence: &SharedPersistence,
) -> Result<(), String> {
    persistence.save_chat_history(&[])?;
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("runtime lock: {error}"))?;
    guard.chat_history.clear();
    Ok(())
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub struct ImportedMemorySummary {
    pub avatar_id: String,
    pub personality: PersonalityConfig,
    pub user_name: Option<String>,
    pub chat_history_imported: bool,
    pub chat_history: Vec<ChatMessage>,
}

fn apply_imported_memory(
    runtime: &SharedRuntime,
    persistence: &SharedPersistence,
    portable: crate::persistence::portable::PortableMemory,
) -> Result<ImportedMemorySummary, String> {
    let crate::persistence::portable::PortableMemory {
        session,
        personality,
        avatar_id,
        chat_history,
        ..
    } = portable;
    let avatar_id = normalize_avatar_id(avatar_id.trim()).to_string();
    let imported_chat_history = chat_history.map(|mut history| {
        trim_chat_history(&mut history);
        history
    });
    let chat_history_imported = imported_chat_history.is_some();
    let imported_chat_history_snapshot = imported_chat_history.clone().unwrap_or_default();
    let (previous_session_memory, previous_chat_history) = {
        let guard = runtime
            .0
            .lock()
            .map_err(|error| format!("runtime lock: {error}"))?;
        (guard.session_memory.clone(), guard.chat_history.clone())
    };

    persistence.save_session_memory(&session)?;
    if let Some(history) = imported_chat_history.as_ref() {
        if let Err(error) = persistence.save_chat_history(history) {
            let _ = persistence.save_session_memory(&previous_session_memory);
            return Err(error);
        }
    }

    let mut guard = match runtime.0.lock() {
        Ok(guard) => guard,
        Err(error) => {
            let _ = persistence.save_session_memory(&previous_session_memory);
            if imported_chat_history.is_some() {
                let _ = persistence.save_chat_history(&previous_chat_history);
            }
            return Err(format!("runtime lock: {error}"));
        }
    };
    guard.session_memory = session;
    guard.avatar_id = avatar_id;
    guard.personality.name = personality.name;
    if let Ok(preset) =
        serde_json::from_value::<PersonalityPreset>(serde_json::Value::String(personality.preset))
    {
        guard.personality.preset = preset;
    }
    guard.personality.humor = personality.humor as u8;
    guard.personality.reaction_intensity = personality.reaction_intensity as u8;
    guard.personality.chattiness = personality.chattiness as u8;
    if let Some(history) = imported_chat_history {
        guard.chat_history = history;
    }
    Ok(ImportedMemorySummary {
        avatar_id: guard.avatar_id.clone(),
        personality: guard.personality.clone(),
        user_name: guard.session_memory.user_name.clone(),
        chat_history_imported,
        chat_history: imported_chat_history_snapshot,
    })
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

            let (tick, proactive_msg) = {
                let mut guard = match runtime_ref.0.lock() {
                    Ok(guard) => guard,
                    Err(_) => break,
                };
                if !guard.running {
                    break;
                }
                let preset = guard.personality.preset.clone();
                guard.engine.set_personality(preset);
                let tick = guard.engine.tick(TransitionReason::Timer, None);

                // Check presence for proactive messages
                let name = guard.personality.name.clone();
                let descriptor = guard.personality.preset.descriptor().to_string();
                let msg = presence::check_presence(&mut guard.presence, &name, &descriptor);

                // Check discovery easter eggs (rare behavior, milestones)
                let tick_count = guard.engine.current_state().tick_count;
                let egg_msg =
                    discovery::check_rare_behavior(&mut guard.discovery, tick_count, &name)
                        .or_else(|| {
                            discovery::check_progressive_unlock(&mut guard.discovery, &name)
                        })
                        .or_else(|| discovery::check_day_milestone(&mut guard.discovery, &name))
                        .map(|egg| discovery::egg_to_proactive(&egg));

                // Prefer presence message over discovery egg
                let combined = msg.or(egg_msg);

                (tick, combined)
            };

            if emit_behavior_tick(&app, &tick).is_err() {
                break;
            }

            if let Some(ref msg) = proactive_msg {
                if let Err(e) = emit_proactive_message(&app, msg) {
                    eprintln!("[tokki] failed to emit proactive message: {e}");
                }
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

    // Check discovery easter eggs and apply event in a single lock
    let (tick, egg_msg) = {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime: {error}"))?;
        let name = guard.personality.name.clone();
        let egg_msg = match &event.kind {
            crate::engine::models::UserEventType::Click
            | crate::engine::models::UserEventType::Poke => {
                discovery::register_click(&mut guard.discovery, &name)
                    .map(|egg| discovery::egg_to_proactive(&egg))
            }
            crate::engine::models::UserEventType::DragStart
            | crate::engine::models::UserEventType::DragEnd => {
                discovery::register_corner_drag(&mut guard.discovery, &name)
                    .map(|egg| discovery::egg_to_proactive(&egg))
            }
            _ => None,
        };
        let tick = guard
            .engine
            .tick(TransitionReason::Interaction, Some(event));
        (tick, egg_msg)
    };

    emit_behavior_tick(&app, &tick)?;

    if let Some(ref msg) = egg_msg {
        if let Err(e) = emit_proactive_message(&app, msg) {
            eprintln!("[tokki] failed to emit interaction discovery message: {e}");
        }
    }

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
    persistence: State<'_, SharedPersistence>,
    message: String,
) -> Result<ChatResponse, String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("message must not be empty".to_string());
    }
    let message = if trimmed.len() > MAX_MESSAGE_LENGTH {
        trimmed.chars().take(MAX_MESSAGE_LENGTH).collect::<String>()
    } else {
        trimmed.to_string()
    };

    let timestamp = now_millis();

    // Add user message and snapshot context in a single lock acquisition
    let (history, session_context, personality_fragment) = {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime for chat message: {error}"))?;
        guard.chat_history.push(ChatMessage {
            role: "user".to_string(),
            content: message.clone(),
            timestamp,
        });
        trim_chat_history(&mut guard.chat_history);
        (
            guard.chat_history.clone(),
            guard.session_memory.to_context_string(),
            guard.personality.to_prompt_fragment(),
        )
    };

    // Call selected provider or use explicit offline fallback when unavailable.
    let provider_config = ProviderConfig::load();
    let provider_kind = provider_config.provider.clone();
    let missing_api_key =
        provider_requires_api_key(&provider_kind) && !provider_has_api_key(&provider_config);

    let reply = if missing_api_key {
        eprintln!(
            "[tokki] provider {} has no API key configured; using offline fallback",
            provider_display_name(&provider_kind)
        );
        build_offline_fallback_reply(
            &message,
            &history,
            &session_context,
            &personality_fragment,
            &provider_kind,
            "no API key configured",
        )
    } else {
        let client = llm_client.0.lock().await;
        match client
            .chat(&message, &history, &session_context, &personality_fragment)
            .await
        {
            Ok(reply) => reply,
            Err(error) => {
                eprintln!("[tokki] LLM chat error: {error}");
                build_offline_fallback_reply(
                    &message,
                    &history,
                    &session_context,
                    &personality_fragment,
                    &provider_kind,
                    &error,
                )
            }
        }
    };

    // Store assistant reply in history and update session memory
    {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime for chat reply storage: {error}"))?;
        guard.chat_history.push(ChatMessage {
            role: "assistant".to_string(),
            content: reply.line.clone(),
            timestamp: now_millis(),
        });
        trim_chat_history(&mut guard.chat_history);

        // Update session memory with this exchange
        let mood_str = serde_json::to_string(&reply.mood).unwrap_or_else(|e| {
            eprintln!("[tokki] failed to serialize mood for session memory: {e}");
            String::from("idle")
        });
        let mood_str = mood_str.trim_matches('"');
        guard
            .session_memory
            .update(&message, &reply.intent, mood_str);

        // Chat-based personality tuning
        apply_chat_personality_tuning(&mut guard.personality, &message);

        // Auto-save memory to persistent storage
        let memory_snapshot = guard.session_memory.clone();
        let chat_history_snapshot = guard.chat_history.clone();
        drop(guard);
        if let Err(error) = persistence.inner().save_session_memory(&memory_snapshot) {
            eprintln!("[tokki] failed to persist session memory: {error}");
        }
        if let Err(error) = persistence
            .inner()
            .save_chat_history(&chat_history_snapshot)
        {
            eprintln!("[tokki] failed to persist chat history: {error}");
        }
    }

    // Apply the LLM-driven action and check discovery in a single lock
    let action = llm_response_to_action(&reply);
    let (tick, egg_msg) = {
        let mut guard = runtime
            .0
            .lock()
            .map_err(|error| format!("failed to lock runtime for chat action apply: {error}"))?;

        // Apply intent-driven energy adjustment
        let current_energy = guard.engine.current_state().energy;
        guard
            .engine
            .set_energy(apply_intent_energy(current_energy, &reply.intent));

        guard.engine.apply_action(action);
        let state = guard.engine.current_state();
        let tick = BehaviorTickPayload {
            state,
            reason: TransitionReason::Manual,
        };

        // Check discovery: secret phrase and chat milestone
        let name = guard.personality.name.clone();
        let msg_count = guard.chat_history.len() as u32;
        let egg_msg = discovery::check_secret_phrase(&mut guard.discovery, &message, &name)
            .or_else(|| discovery::check_chat_milestone(&mut guard.discovery, msg_count, &name))
            .map(|egg| discovery::egg_to_proactive(&egg));

        (tick, egg_msg)
    };

    emit_behavior_tick(&app, &tick)?;

    if let Some(ref msg) = egg_msg {
        if let Err(e) = emit_proactive_message(&app, msg) {
            eprintln!("[tokki] failed to emit discovery message: {e}");
        }
    }

    Ok(ChatResponse { reply, tick })
}

#[tauri::command]
pub fn get_chat_history(runtime: State<'_, SharedRuntime>) -> Result<Vec<ChatMessage>, String> {
    let guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard.chat_history.clone())
}

/// Clear the current conversation transcript from both runtime state and persistent storage.
/// Long-term session memory (personality, topics, preferences) is preserved.
#[tauri::command]
pub fn clear_chat_history(
    runtime: State<'_, SharedRuntime>,
    persistence: State<'_, SharedPersistence>,
) -> Result<(), String> {
    clear_runtime_chat_history(runtime.inner(), persistence.inner())
}

#[tauri::command]
pub fn set_avatar(runtime: State<'_, SharedRuntime>, avatar_id: String) -> Result<(), String> {
    let avatar_id = normalize_avatar_id(avatar_id.trim()).to_string();
    if avatar_id.is_empty() {
        return Err("avatar_id is required".to_string());
    }
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    // When switching avatar, reset personality to species defaults
    if guard.avatar_id != avatar_id {
        guard.personality = PersonalityConfig::default_for_species(&avatar_id);
    }
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

#[tauri::command]
pub fn get_personality(runtime: State<'_, SharedRuntime>) -> Result<PersonalityConfig, String> {
    let guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    Ok(guard.personality.clone())
}

#[tauri::command]
pub fn set_personality(
    runtime: State<'_, SharedRuntime>,
    personality: PersonalityConfig,
) -> Result<(), String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    guard.personality = personality;
    Ok(())
}

#[tauri::command]
pub fn set_humor_level(runtime: State<'_, SharedRuntime>, level: u8) -> Result<(), String> {
    let mut guard = runtime
        .0
        .lock()
        .map_err(|error| format!("failed to lock runtime: {error}"))?;
    guard.personality.humor = level.min(100);
    Ok(())
}

/// Parse natural-language personality tuning commands from chat messages.
fn apply_chat_personality_tuning(personality: &mut PersonalityConfig, message: &str) {
    let lower = message.to_lowercase();

    // Name changes: "your name is now X", "call yourself X", "I'll call you X"
    for prefix in &[
        "your name is now ",
        "call yourself ",
        "i'll call you ",
        "i will call you ",
    ] {
        if let Some(pos) = lower.find(prefix) {
            let after = &message[pos + prefix.len()..];
            let name: String = after
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '\'' || *c == '-' || *c == ' ')
                .collect();
            let name = name.trim();
            if !name.is_empty() && name.len() <= 30 {
                personality.name = name.to_string();
            }
            return;
        }
    }

    // Humor dial: "turn humor to 90%", "set humor to 50", "humor 80"
    if let Some(level) = parse_humor_command(&lower) {
        personality.humor = level;
        return;
    }

    // Personality nudges via natural language
    if lower.contains("be sassier") || lower.contains("more sassy") || lower.contains("be snarky") {
        personality.humor = (personality.humor + 15).min(100);
        personality.preset = PersonalityPreset::Clever;
    } else if lower.contains("be gentler")
        || lower.contains("be softer")
        || lower.contains("be nicer")
    {
        personality.preset = PersonalityPreset::Gentle;
        personality.humor = personality.humor.saturating_sub(10);
    } else if lower.contains("be funnier")
        || lower.contains("more jokes")
        || lower.contains("more humor")
    {
        personality.humor = (personality.humor + 20).min(100);
    } else if lower.contains("be serious")
        || lower.contains("less humor")
        || lower.contains("stop joking")
    {
        personality.humor = personality.humor.saturating_sub(25);
    } else if lower.contains("be more dramatic") || lower.contains("be dramatic") {
        personality.preset = PersonalityPreset::Proud;
        personality.reaction_intensity = (personality.reaction_intensity + 15).min(100);
    } else if lower.contains("be mysterious") || lower.contains("be cryptic") {
        personality.preset = PersonalityPreset::Mystical;
    } else if lower.contains("be quiet") || lower.contains("talk less") {
        personality.chattiness = personality.chattiness.saturating_sub(20);
    } else if lower.contains("talk more") || lower.contains("be chattier") {
        personality.chattiness = (personality.chattiness + 20).min(100);
    }
}

fn parse_humor_command(lower: &str) -> Option<u8> {
    // Match patterns like "humor to 90", "humor 80", "humor to 90%"
    for prefix in &["turn humor to ", "set humor to ", "humor to ", "humor "] {
        if let Some(pos) = lower.find(prefix) {
            let after = &lower[pos + prefix.len()..];
            let num_str: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(val) = num_str.parse::<u8>() {
                return Some(val.min(100));
            }
        }
    }
    None
}

#[tauri::command]
pub fn load_persistent_memory(
    runtime: State<'_, SharedRuntime>,
    persistence: State<'_, SharedPersistence>,
) -> Result<(), String> {
    restore_session_memory(runtime.inner(), persistence.inner())
}

#[tauri::command]
pub fn save_persistent_memory(
    runtime: State<'_, SharedRuntime>,
    persistence: State<'_, SharedPersistence>,
) -> Result<(), String> {
    persist_runtime_session_memory(runtime.inner(), persistence.inner())
}

#[tauri::command]
pub fn report_mouse_shake(app: AppHandle, runtime: State<'_, SharedRuntime>) -> Result<(), String> {
    let msg = {
        let mut guard = runtime.0.lock().map_err(|e| format!("runtime lock: {e}"))?;
        let name = guard.personality.name.clone();
        presence::mouse_shake_message(&name, &mut guard.presence)
    };
    if let Some(ref msg) = msg {
        emit_proactive_message(&app, msg)?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct ProviderInfo {
    pub provider: ProviderKind,
    pub provider_name: String,
    pub requires_network: bool,
    pub api_key_required: bool,
    pub api_key_configured: bool,
}

#[tauri::command]
pub fn get_provider_config() -> Result<ProviderConfig, String> {
    Ok(ProviderConfig::load())
}

#[tauri::command]
pub async fn set_provider_config(
    llm_client: State<'_, SharedLlmClient>,
    config: ProviderConfig,
) -> Result<ProviderInfo, String> {
    config.save()?;
    let kind = config.provider.clone();
    let new_provider = crate::llm::provider::create_provider(&config)?;
    let needs_net = new_provider.requires_network();
    *llm_client.0.lock().await = new_provider;
    let persisted_config = ProviderConfig::load();
    let api_key_required = provider_requires_api_key(&kind);
    let api_key_configured = !api_key_required || provider_has_api_key(&persisted_config);

    Ok(ProviderInfo {
        provider: kind.clone(),
        provider_name: provider_display_name(&kind).to_string(),
        requires_network: needs_net,
        api_key_required,
        api_key_configured,
    })
}

#[tauri::command]
pub async fn get_provider_info(
    llm_client: State<'_, SharedLlmClient>,
) -> Result<ProviderInfo, String> {
    let config = ProviderConfig::load();
    let provider = config.provider.clone();
    let requires_network = llm_client.0.lock().await.requires_network();
    let api_key_required = provider_requires_api_key(&provider);
    let api_key_configured = !api_key_required || provider_has_api_key(&config);

    Ok(ProviderInfo {
        provider: provider.clone(),
        provider_name: provider_display_name(&provider).to_string(),
        requires_network,
        api_key_required,
        api_key_configured,
    })
}

#[tauri::command]
pub async fn check_provider_health(
    llm_client: State<'_, SharedLlmClient>,
) -> Result<ProviderHealth, String> {
    let config = ProviderConfig::load();
    let (active_name, requires_network) = {
        let client = llm_client.0.lock().await;
        (
            client.provider_name().to_string(),
            client.requires_network(),
        )
    };

    Ok(assess_provider_health(
        &config,
        &active_name,
        requires_network,
        crate::llm::offline::templates_available(),
    ))
}

#[tauri::command]
pub fn export_memory(
    runtime: State<'_, SharedRuntime>,
    path: String,
    include_chat_history: Option<bool>,
) -> Result<(), String> {
    // Clone state under lock, then do file I/O outside to avoid blocking
    // the behavior loop and other commands during disk writes.
    let portable = {
        let guard = runtime.0.lock().map_err(|e| format!("runtime lock: {e}"))?;
        let provider_config = ProviderConfig::load();
        let exported_chat_history = include_chat_history
            .unwrap_or(false)
            .then_some(guard.chat_history.as_slice());
        crate::persistence::portable::PortableMemory::export(
            &guard.session_memory,
            &guard.personality,
            &provider_config,
            &guard.avatar_id,
            exported_chat_history,
        )
    };
    portable.save_to_file(std::path::Path::new(&path))
}

#[tauri::command]
pub fn import_memory(
    runtime: State<'_, SharedRuntime>,
    persistence: State<'_, SharedPersistence>,
    path: String,
) -> Result<ImportedMemorySummary, String> {
    let portable =
        crate::persistence::portable::PortableMemory::load_from_file(std::path::Path::new(&path))?;

    apply_imported_memory(runtime.inner(), persistence.inner(), portable)
}

#[tauri::command]
pub fn import_memory_json(
    runtime: State<'_, SharedRuntime>,
    persistence: State<'_, SharedPersistence>,
    json: String,
) -> Result<ImportedMemorySummary, String> {
    let portable = crate::persistence::portable::PortableMemory::from_json(&json)?;
    apply_imported_memory(runtime.inner(), persistence.inner(), portable)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        engine::models::{Mood, UserEventType},
        llm::memory::{MemoryHighlight, MemoryPreference, SessionMemory},
        persistence::{portable::PortableMemory, PersistentMemory},
        runtime::{PersistenceState, RuntimeState, SharedPersistence, SharedRuntime},
    };
    use std::sync::{mpsc::channel, Arc, Mutex};

    fn test_runtime(seed: u64) -> SharedRuntime {
        SharedRuntime(Arc::new(Mutex::new(RuntimeState::with_seed(seed))))
    }

    fn test_persistence() -> SharedPersistence {
        SharedPersistence::from_persistent_memory(PersistentMemory::in_memory())
    }

    fn unavailable_persistence(error: &str) -> SharedPersistence {
        SharedPersistence(Arc::new(Mutex::new(PersistenceState::Unavailable(
            error.to_string(),
        ))))
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
    fn restore_session_memory_rehydrates_runtime_from_persistence() {
        let runtime = test_runtime(77);
        let persistence = test_persistence();
        let mut memory = SessionMemory::default();
        memory.update("My name is Alice", "greet", "playful");
        memory.update("tell me about cats", "help", "curious");
        memory.preferences.push(MemoryPreference {
            label: "loves".to_string(),
            value: "cozy rain sounds".to_string(),
            ..Default::default()
        });
        memory.conversation_highlights.push(MemoryHighlight {
            summary: "Learning Rust together".to_string(),
            ..Default::default()
        });
        memory.mood_history = vec!["playful".to_string(), "curious".to_string()];

        persistence
            .save_session_memory(&memory)
            .expect("session memory should save");

        restore_session_memory(&runtime, &persistence).expect("session memory should restore");

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.session_memory.user_name, Some("Alice".to_string()));
        assert_eq!(guard.session_memory.topics, vec!["cats"]);
        assert_eq!(guard.session_memory.message_count, 2);
        assert_eq!(
            guard.session_memory.preferences[0].summary(),
            "loves cozy rain sounds"
        );
        assert_eq!(
            guard.session_memory.conversation_highlights[0].summary,
            "Learning Rust together"
        );
        assert_eq!(
            guard.session_memory.mood_history,
            vec!["playful".to_string(), "curious".to_string()]
        );
    }

    #[test]
    fn persist_runtime_session_memory_saves_current_snapshot() {
        let runtime = test_runtime(78);
        let persistence = test_persistence();

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard
                .session_memory
                .update("My name is Bob", "greet", "playful");
            guard
                .session_memory
                .update("tell me about rust", "help", "curious");
        }

        persist_runtime_session_memory(&runtime, &persistence)
            .expect("session memory should persist");

        let loaded = persistence
            .load_session_memory()
            .expect("session memory should load");
        assert_eq!(loaded.user_name, Some("Bob".to_string()));
        assert_eq!(loaded.topics, vec!["rust"]);
        assert_eq!(loaded.message_count, 2);
    }

    #[test]
    fn apply_imported_memory_updates_runtime_and_persistent_store() {
        let runtime = test_runtime(79);
        let persistence = test_persistence();
        let mut imported_memory = SessionMemory::default();
        imported_memory.update("My name is Dana", "greet", "playful");
        imported_memory.update("tell me about foxes", "help", "curious");
        imported_memory.preferences.push(MemoryPreference {
            label: "likes".to_string(),
            value: "forest walks".to_string(),
            ..Default::default()
        });
        imported_memory
            .conversation_highlights
            .push(MemoryHighlight {
                summary: "Planning a weekend hike".to_string(),
                ..Default::default()
            });
        imported_memory.mood_history = vec!["playful".to_string(), "curious".to_string()];

        let mut imported_personality = PersonalityConfig::default_for_species("fox_v1");
        imported_personality.name = "Scout".to_string();
        imported_personality.humor = 73;

        let portable = PortableMemory::export(
            &imported_memory,
            &imported_personality,
            &ProviderConfig::default(),
            "fox_v1",
            None,
        );

        apply_imported_memory(&runtime, &persistence, portable)
            .expect("portable memory should import");

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.session_memory.user_name, Some("Dana".to_string()));
        assert_eq!(guard.avatar_id, "fox_v2");
        assert_eq!(guard.personality.name, "Scout");
        assert_eq!(guard.personality.humor, 73);
        drop(guard);

        let persisted = persistence
            .load_session_memory()
            .expect("imported session memory should persist");
        assert_eq!(persisted.user_name, Some("Dana".to_string()));
        assert_eq!(persisted.topics, vec!["foxes"]);
        assert_eq!(persisted.message_count, 2);
        assert_eq!(persisted.preferences[0].summary(), "likes forest walks");
        assert_eq!(
            persisted.conversation_highlights[0].summary,
            "Planning a weekend hike"
        );
        assert_eq!(
            persisted.mood_history,
            vec!["playful".to_string(), "curious".to_string()]
        );
    }

    #[test]
    fn apply_imported_memory_keeps_runtime_unchanged_when_persistence_fails() {
        let runtime = test_runtime(80);
        let persistence = unavailable_persistence("encryption key unavailable");

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard
                .session_memory
                .update("My name is Iris", "greet", "playful");
            guard.avatar_id = "cat_v1".to_string();
            guard.personality.name = "Iris".to_string();
        }

        let mut imported_memory = SessionMemory::default();
        imported_memory.update("My name is Nova", "greet", "curious");
        let mut imported_personality = PersonalityConfig::default_for_species("fox_v1");
        imported_personality.name = "Nova".to_string();

        let portable = PortableMemory::export(
            &imported_memory,
            &imported_personality,
            &ProviderConfig::default(),
            "fox_v1",
            None,
        );

        let error = apply_imported_memory(&runtime, &persistence, portable)
            .expect_err("import should fail when persistence is unavailable");
        assert!(error.contains("persistent memory unavailable"));

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.session_memory.user_name, Some("Iris".to_string()));
        assert_eq!(guard.avatar_id, "cat_v1");
        assert_eq!(guard.personality.name, "Iris");
    }

    #[test]
    fn apply_imported_memory_restores_chat_history_when_bundle_includes_it() {
        let runtime = test_runtime(81);
        let persistence = test_persistence();
        let imported_memory = SessionMemory::default();
        let imported_personality = PersonalityConfig::default_for_species("rabbit_v2");
        let imported_chat_history = vec![
            ChatMessage {
                role: "user".to_string(),
                content: "Hi Tokki".to_string(),
                timestamp: 1,
            },
            ChatMessage {
                role: "assistant".to_string(),
                content: "Hello back".to_string(),
                timestamp: 2,
            },
        ];

        let portable = PortableMemory::export(
            &imported_memory,
            &imported_personality,
            &ProviderConfig::default(),
            "rabbit_v2",
            Some(&imported_chat_history),
        );

        apply_imported_memory(&runtime, &persistence, portable)
            .expect("portable memory should import");

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.chat_history.len(), 2);
        assert_eq!(guard.chat_history[0].content, "Hi Tokki");
        drop(guard);

        let persisted = persistence
            .load_chat_history()
            .expect("chat history should persist");
        assert_eq!(persisted.len(), 2);
        assert_eq!(persisted[1].content, "Hello back");
    }

    #[test]
    fn apply_imported_memory_preserves_existing_chat_history_when_bundle_omits_it() {
        let runtime = test_runtime(82);
        let persistence = test_persistence();

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.chat_history.push(ChatMessage {
                role: "user".to_string(),
                content: "keep this".to_string(),
                timestamp: 1,
            });
        }
        persistence
            .save_chat_history(&[ChatMessage {
                role: "user".to_string(),
                content: "keep this".to_string(),
                timestamp: 1,
            }])
            .expect("chat history should save");

        let portable = PortableMemory::export(
            &SessionMemory::default(),
            &PersonalityConfig::default_for_species("rabbit_v2"),
            &ProviderConfig::default(),
            "rabbit_v2",
            None,
        );

        apply_imported_memory(&runtime, &persistence, portable)
            .expect("memory-only import should succeed");

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.chat_history.len(), 1);
        assert_eq!(guard.chat_history[0].content, "keep this");
        drop(guard);

        let persisted = persistence
            .load_chat_history()
            .expect("chat history should still load");
        assert_eq!(persisted.len(), 1);
        assert_eq!(persisted[0].content, "keep this");
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

    #[test]
    fn provider_key_requirements_match_provider_kind() {
        assert!(provider_requires_api_key(&ProviderKind::DefensiveHub));
        assert!(provider_requires_api_key(&ProviderKind::OpenAi));
        assert!(!provider_requires_api_key(&ProviderKind::Ollama));
        assert!(!provider_requires_api_key(&ProviderKind::Offline));
    }

    #[test]
    fn provider_has_api_key_trims_whitespace() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.api_key = Some("   ".to_string());
        assert!(!provider_has_api_key(&cfg));

        cfg.api_key = Some(" sk-test ".to_string());
        assert!(provider_has_api_key(&cfg));
    }

    #[test]
    fn provider_health_offline_reports_healthy_when_templates_available() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::Offline;

        let health = assess_provider_health(&cfg, "offline", false, true);

        assert_eq!(health.status, ProviderHealthStatus::Healthy);
        assert_eq!(health.provider, ProviderKind::Offline);
        assert!(health.reason.contains("template responses are available"));
    }

    #[test]
    fn provider_health_offline_reports_unavailable_when_templates_missing() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::Offline;

        let health = assess_provider_health(&cfg, "offline", false, false);

        assert_eq!(health.status, ProviderHealthStatus::Unavailable);
        assert!(health
            .reason
            .contains("no template responses are available"));
    }

    #[test]
    fn provider_health_offline_degrades_on_runtime_mismatch() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::Offline;

        let health = assess_provider_health(&cfg, "openai", true, true);

        assert_eq!(health.status, ProviderHealthStatus::Degraded);
        assert!(health.reason.contains("runtime mismatch"));
    }

    #[test]
    fn provider_health_degrades_when_cloud_api_key_missing() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.endpoint = Some("https://api.openai.com/v1".to_string());
        cfg.api_key = Some("   ".to_string());

        let health = assess_provider_health(&cfg, "openai", true, true);

        assert_eq!(health.status, ProviderHealthStatus::Degraded);
        assert!(!health.api_key_configured);
        assert!(health.reason.contains("API key is not configured"));
    }

    #[test]
    fn provider_health_unavailable_for_invalid_endpoint() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.endpoint = Some("not a valid url".to_string());
        cfg.api_key = Some("sk-test".to_string());

        let health = assess_provider_health(&cfg, "openai", true, true);

        assert_eq!(health.status, ProviderHealthStatus::Unavailable);
        assert!(health.reason.contains("endpoint configuration is invalid"));
    }

    #[test]
    fn provider_health_degrades_when_active_provider_mismatches_config() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.endpoint = Some("https://api.openai.com/v1".to_string());
        cfg.api_key = Some("sk-test".to_string());

        let health = assess_provider_health(&cfg, "offline", false, true);

        assert_eq!(health.status, ProviderHealthStatus::Degraded);
        assert!(health.reason.contains("runtime mismatch"));
    }

    #[test]
    fn provider_health_reports_healthy_for_configured_cloud_provider() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::DefensiveHub;
        cfg.endpoint =
            Some("https://defensiveapi.azurewebsites.net/codexinference/RunModel".to_string());
        cfg.api_key = Some("token".to_string());

        let health = assess_provider_health(&cfg, "defensive_hub", true, true);

        assert_eq!(health.status, ProviderHealthStatus::Healthy);
        assert!(health.reason.contains("configured and ready"));
    }

    #[test]
    fn provider_health_reports_healthy_for_configured_ollama_provider() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::Ollama;
        cfg.endpoint = Some("http://localhost:11434".to_string());
        cfg.api_key = None;

        let health = assess_provider_health(&cfg, "ollama", false, true);

        assert_eq!(health.status, ProviderHealthStatus::Healthy);
        assert!(!health.api_key_required);
        assert!(health.api_key_configured);
        assert!(!health.requires_network);
        assert!(health.reason.contains("local requests"));
    }

    #[test]
    fn provider_health_degrades_when_cloud_network_profile_mismatches() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.endpoint = Some("https://api.openai.com/v1".to_string());
        cfg.api_key = Some("sk-test".to_string());

        let health = assess_provider_health(&cfg, "openai", false, true);

        assert_eq!(health.status, ProviderHealthStatus::Degraded);
        assert!(health.reason.contains("network profile mismatch"));
        assert!(!health.requires_network);
    }

    #[test]
    fn provider_health_invalid_endpoint_takes_priority_over_missing_api_key() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.endpoint = Some("ftp://api.openai.com/v1".to_string());
        cfg.api_key = Some("   ".to_string());

        let health = assess_provider_health(&cfg, "openai", true, true);

        assert_eq!(health.status, ProviderHealthStatus::Unavailable);
        assert!(!health.api_key_configured);
        assert!(health.reason.contains("endpoint configuration is invalid"));
    }

    #[test]
    fn provider_health_runtime_mismatch_takes_priority_over_other_failures() {
        let mut cfg = ProviderConfig::default();
        cfg.provider = ProviderKind::OpenAi;
        cfg.endpoint = Some("not a valid url".to_string());
        cfg.api_key = Some("   ".to_string());

        let health = assess_provider_health(&cfg, "offline", false, true);

        assert_eq!(health.status, ProviderHealthStatus::Degraded);
        assert!(health.reason.contains("runtime mismatch"));
    }

    #[test]
    fn summarize_provider_error_compacts_and_truncates() {
        let summarized = summarize_provider_error("HTTP   request\nfailed   because timeout");
        assert_eq!(summarized, "HTTP request failed because timeout");

        let long = "x".repeat(140);
        let summarized_long = summarize_provider_error(&long);
        assert!(summarized_long.ends_with('…'));
        assert!(summarized_long.chars().count() <= 97);
    }

    #[test]
    fn offline_fallback_reply_mentions_provider_and_mode() {
        let reply = build_offline_fallback_reply(
            "hello there",
            &[],
            "[Session context: The user's name is Alice. Topics discussed: rust.]",
            "",
            &ProviderKind::OpenAi,
            "HTTP request failed: timeout",
        );
        assert!(reply.line.contains("OpenAI-compatible"));
        assert!(reply.line.contains("offline mode"));
        assert!(reply.line.contains("Alice"));
        assert_eq!(reply.intent, "offline_fallback");
    }

    // ── Personality tuning tests ──────────────────────────────────────────

    #[test]
    fn chat_tuning_name_change() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        apply_chat_personality_tuning(&mut p, "Your name is now Fluffball");
        assert_eq!(p.name, "Fluffball");
    }

    #[test]
    fn chat_tuning_name_change_call_yourself() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        apply_chat_personality_tuning(&mut p, "Call yourself Muffin");
        assert_eq!(p.name, "Muffin");
    }

    #[test]
    fn chat_tuning_humor_dial() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        apply_chat_personality_tuning(&mut p, "turn humor to 90%");
        assert_eq!(p.humor, 90);
    }

    #[test]
    fn chat_tuning_humor_set() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        apply_chat_personality_tuning(&mut p, "set humor to 50");
        assert_eq!(p.humor, 50);
    }

    #[test]
    fn chat_tuning_humor_capped_at_100() {
        assert_eq!(parse_humor_command("humor to 200"), Some(100));
    }

    #[test]
    fn chat_tuning_be_sassier() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        let old_humor = p.humor;
        apply_chat_personality_tuning(&mut p, "Can you be sassier?");
        assert_eq!(p.preset, PersonalityPreset::Clever);
        assert!(p.humor > old_humor);
    }

    #[test]
    fn chat_tuning_be_gentler() {
        let mut p = PersonalityConfig::default_for_species("fox_v2");
        apply_chat_personality_tuning(&mut p, "Please be gentler");
        assert_eq!(p.preset, PersonalityPreset::Gentle);
    }

    #[test]
    fn chat_tuning_be_dramatic() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        apply_chat_personality_tuning(&mut p, "Be more dramatic!");
        assert_eq!(p.preset, PersonalityPreset::Proud);
    }

    #[test]
    fn chat_tuning_talk_less() {
        let mut p = PersonalityConfig::default_for_species("dog_v1");
        let old_chattiness = p.chattiness;
        apply_chat_personality_tuning(&mut p, "Please be quiet");
        assert!(p.chattiness < old_chattiness);
    }

    #[test]
    fn chat_tuning_no_match_leaves_unchanged() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        let original = p.clone();
        apply_chat_personality_tuning(&mut p, "How's the weather today?");
        assert_eq!(p, original);
    }

    #[test]
    fn parse_humor_command_various_formats() {
        assert_eq!(parse_humor_command("turn humor to 75"), Some(75));
        assert_eq!(parse_humor_command("set humor to 30"), Some(30));
        assert_eq!(parse_humor_command("humor to 60%"), Some(60));
        assert_eq!(parse_humor_command("humor 42"), Some(42));
        assert_eq!(parse_humor_command("no humor keyword here"), None);
    }

    #[test]
    fn trim_chat_history_caps_at_limit() {
        let mut history: Vec<ChatMessage> = (0..250)
            .map(|i| ChatMessage {
                role: "user".to_string(),
                content: format!("msg {i}"),
                timestamp: i as u64,
            })
            .collect();

        trim_chat_history(&mut history);
        assert_eq!(history.len(), MAX_CHAT_HISTORY);
        assert_eq!(history[0].content, "msg 50");
        assert_eq!(history[MAX_CHAT_HISTORY - 1].content, "msg 249");
    }

    #[test]
    fn trim_chat_history_noop_under_limit() {
        let mut history: Vec<ChatMessage> = (0..10)
            .map(|i| ChatMessage {
                role: "user".to_string(),
                content: format!("msg {i}"),
                timestamp: i as u64,
            })
            .collect();

        trim_chat_history(&mut history);
        assert_eq!(history.len(), 10);
        assert_eq!(history[0].content, "msg 0");
    }

    #[test]
    fn clear_chat_history_empties_runtime_and_persisted_store() {
        let persistence = test_persistence();
        let runtime = test_runtime(91);

        // Seed some messages into runtime
        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.chat_history.push(ChatMessage {
                role: "user".to_string(),
                content: "hello".to_string(),
                timestamp: 1,
            });
            guard.chat_history.push(ChatMessage {
                role: "assistant".to_string(),
                content: "hi there!".to_string(),
                timestamp: 2,
            });
        }
        persistence
            .save_chat_history(&[
                ChatMessage {
                    role: "user".to_string(),
                    content: "hello".to_string(),
                    timestamp: 1,
                },
                ChatMessage {
                    role: "assistant".to_string(),
                    content: "hi there!".to_string(),
                    timestamp: 2,
                },
            ])
            .expect("chat history should save");

        clear_runtime_chat_history(&runtime, &persistence).expect("chat history should clear");

        // Runtime should be empty
        let guard = runtime.0.lock().expect("runtime lock");
        assert!(
            guard.chat_history.is_empty(),
            "runtime chat_history should be empty after clear"
        );
        drop(guard);

        // Persistence should be empty
        let loaded = persistence
            .load_chat_history()
            .expect("chat history should load");
        assert!(
            loaded.is_empty(),
            "persisted chat_history should be empty after clear"
        );
    }

    #[test]
    fn clear_chat_history_keeps_runtime_when_persistence_fails() {
        let persistence = unavailable_persistence("storage offline");
        let runtime = test_runtime(92);

        {
            let mut guard = runtime.0.lock().expect("runtime lock");
            guard.chat_history.push(ChatMessage {
                role: "user".to_string(),
                content: "keep me".to_string(),
                timestamp: 1,
            });
        }

        let error = clear_runtime_chat_history(&runtime, &persistence)
            .expect_err("clear should fail when persistence is unavailable");
        assert!(error.contains("persistent memory unavailable"));

        let guard = runtime.0.lock().expect("runtime lock");
        assert_eq!(guard.chat_history.len(), 1);
        assert_eq!(guard.chat_history[0].content, "keep me");
    }
}
