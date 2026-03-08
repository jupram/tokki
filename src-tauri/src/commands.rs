use std::{
    net::IpAddr,
    sync::{mpsc, OnceLock},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use reqwest::{Client, Url};
use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, State};

use crate::{
    engine::models::{BehaviorTickPayload, TokkiState, TransitionReason, UserEvent},
    events::emit_behavior_tick,
    runtime::SharedRuntime,
};

const LLM_NOT_CONFIGURED: &str = "llm not configured";
const INVALID_LLM_ENDPOINT: &str =
    "invalid llm endpoint: use /v1/responses or /v1/chat/completions (OpenAI-compatible)";
const INSECURE_LLM_ENDPOINT: &str =
    "llm endpoint must use https (http is only allowed for localhost)";
const MAX_LLM_ENDPOINT_LEN: usize = 2_048;
const MAX_LLM_MODEL_LEN: usize = 128;
const MAX_LLM_PROMPT_LEN: usize = 16_384;
const MAX_LLM_RESPONSE_LEN_BYTES: u64 = 1_048_576;
const LLM_CLIENT_TIMEOUT_SECS: u64 = 30;
const DEFAULT_LLM_MODEL: &str = "gpt-4o-mini";

#[derive(Debug, Deserialize)]
pub struct LlmInteractionRequest {
    pub prompt: String,
    pub endpoint: Option<String>,
    pub model: Option<String>,
}

fn now_millis() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn sanitize_non_empty(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
}

fn env_non_empty(key: &str) -> Option<String> {
    sanitize_non_empty(std::env::var(key).ok().as_deref())
}

fn resolve_llm_endpoint(override_endpoint: Option<&str>) -> Option<String> {
    sanitize_non_empty(override_endpoint).or_else(|| env_non_empty("TOKKI_LLM_ENDPOINT"))
}

fn resolve_llm_model(override_model: Option<&str>) -> Result<String, String> {
    let model = sanitize_non_empty(override_model)
        .or_else(|| env_non_empty("TOKKI_LLM_MODEL"))
        .unwrap_or_else(|| String::from(DEFAULT_LLM_MODEL));

    if model.len() > MAX_LLM_MODEL_LEN {
        return Err(format!(
            "llm model name too long (max {MAX_LLM_MODEL_LEN} bytes)"
        ));
    }

    Ok(model)
}

fn validate_prompt(prompt: &str) -> Result<String, String> {
    let trimmed = prompt.trim();
    if trimmed.is_empty() {
        return Err(String::from("prompt must not be empty"));
    }

    if trimmed.len() > MAX_LLM_PROMPT_LEN {
        return Err(format!("prompt too long (max {MAX_LLM_PROMPT_LEN} bytes)"));
    }

    Ok(String::from(trimmed))
}

fn is_standard_llm_endpoint(url: &Url) -> bool {
    let path = url.path().trim_end_matches('/').to_ascii_lowercase();
    if path.ends_with("/v1/responses") || path.ends_with("/v1/chat/completions") {
        return true;
    }

    path.contains("/openai/deployments/")
        && (path.ends_with("/chat/completions") || path.ends_with("/responses"))
}

fn is_loopback_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }

    host.parse::<IpAddr>()
        .map(|ip| ip.is_loopback())
        .unwrap_or(false)
}

fn validate_llm_endpoint(endpoint: &str) -> Result<Url, String> {
    if endpoint.len() > MAX_LLM_ENDPOINT_LEN {
        return Err(format!(
            "llm endpoint too long (max {MAX_LLM_ENDPOINT_LEN} bytes)"
        ));
    }

    let url = Url::parse(endpoint).map_err(|_| String::from(INVALID_LLM_ENDPOINT))?;
    if url.host_str().is_none() {
        return Err(String::from(INVALID_LLM_ENDPOINT));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(String::from("llm endpoint must not include credentials"));
    }

    let secure_scheme = match url.scheme() {
        "https" => true,
        "http" => url.host_str().map(is_loopback_host).unwrap_or(false),
        _ => false,
    };
    if !secure_scheme {
        return Err(String::from(INSECURE_LLM_ENDPOINT));
    }
    if !is_standard_llm_endpoint(&url) {
        return Err(String::from(INVALID_LLM_ENDPOINT));
    }

    Ok(url)
}

fn is_responses_api_endpoint(endpoint: &Url) -> bool {
    endpoint
        .path()
        .trim_end_matches('/')
        .to_ascii_lowercase()
        .ends_with("/responses")
}

fn llm_client() -> Result<&'static Client, String> {
    static CLIENT: OnceLock<Result<Client, String>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            Client::builder()
                .timeout(Duration::from_secs(LLM_CLIENT_TIMEOUT_SECS))
                .build()
                .map_err(|error| format!("failed to create llm client: {error}"))
        })
        .as_ref()
        .map_err(|error| error.clone())
}

fn extract_llm_text(payload: &Value) -> Option<String> {
    if let Some(output_text) = payload.get("output_text").and_then(Value::as_str) {
        let text = output_text.trim();
        if !text.is_empty() {
            return Some(String::from(text));
        }
    }

    if let Some(text) = payload.get("text").and_then(Value::as_str) {
        let text = text.trim();
        if !text.is_empty() {
            return Some(String::from(text));
        }
    }

    if let Some(reply) = payload.get("reply").and_then(Value::as_str) {
        let reply = reply.trim();
        if !reply.is_empty() {
            return Some(String::from(reply));
        }
    }

    payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|content| !content.is_empty())
        .map(String::from)
}

async fn call_llm_endpoint(
    endpoint: &Url,
    prompt: &str,
    model: &str,
    api_key: Option<&str>,
) -> Result<String, String> {
    let request_body = if is_responses_api_endpoint(endpoint) {
        serde_json::json!({
            "model": model,
            "input": prompt
        })
    } else {
        serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })
    };

    let mut request = llm_client()?.post(endpoint.clone()).json(&request_body);
    if let Some(secret) = api_key {
        request = request.bearer_auth(secret);
    }

    let response = request
        .send()
        .await
        .map_err(|error| format!("llm request failed: {error}"))?;

    if response
        .content_length()
        .is_some_and(|len| len > MAX_LLM_RESPONSE_LEN_BYTES)
    {
        return Err(format!(
            "llm response exceeded size limit ({MAX_LLM_RESPONSE_LEN_BYTES} bytes)"
        ));
    }

    let status = response.status();
    let mut response = response;
    let mut body = Vec::new();
    let mut total_size: u64 = 0;
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("failed to read llm response: {error}"))?
    {
        let chunk_len = chunk.len() as u64;
        if total_size + chunk_len > MAX_LLM_RESPONSE_LEN_BYTES {
            return Err(format!(
                "llm response exceeded size limit ({MAX_LLM_RESPONSE_LEN_BYTES} bytes)"
            ));
        }
        total_size += chunk_len;
        body.extend_from_slice(&chunk);
    }

    let payload = serde_json::from_slice::<Value>(&body)
        .map_err(|error| format!("failed to parse llm response: {error}"))?;

    if !status.is_success() {
        if let Some(error_message) = payload
            .get("error")
            .and_then(|error| error.get("message"))
            .and_then(Value::as_str)
        {
            return Err(format!("llm request failed ({status}): {error_message}"));
        }
        return Err(format!("llm request failed with status {status}"));
    }

    extract_llm_text(&payload).ok_or_else(|| String::from("llm response missing text content"))
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

fn apply_user_event(
    runtime: &SharedRuntime,
    event: UserEvent,
) -> Result<BehaviorTickPayload, String> {
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

#[tauri::command]
pub async fn request_llm_reply(request: LlmInteractionRequest) -> Result<String, String> {
    let endpoint = match resolve_llm_endpoint(request.endpoint.as_deref()) {
        Some(endpoint) => endpoint,
        None => return Ok(String::from(LLM_NOT_CONFIGURED)),
    };
    let endpoint = validate_llm_endpoint(&endpoint)?;
    let prompt = validate_prompt(&request.prompt)?;
    let model = resolve_llm_model(request.model.as_deref())?;
    let api_key = env_non_empty("TOKKI_LLM_API_KEY");
    call_llm_endpoint(&endpoint, &prompt, &model, api_key.as_deref()).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        engine::models::UserEventType,
        runtime::{RuntimeState, SharedRuntime},
    };
    use std::{
        env,
        future::Future,
        sync::{mpsc::channel, Arc, Mutex, Mutex as StdMutex},
    };

    static ENV_LOCK: StdMutex<()> = StdMutex::new(());

    fn test_runtime(seed: u64) -> SharedRuntime {
        SharedRuntime(Arc::new(Mutex::new(RuntimeState::with_seed(seed))))
    }

    fn run_async<T>(future: impl Future<Output = T>) -> T {
        tauri::async_runtime::block_on(future)
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
    fn request_llm_reply_returns_not_configured_without_endpoint() {
        let _env_guard = ENV_LOCK.lock().expect("env lock");
        let existing_endpoint = env::var("TOKKI_LLM_ENDPOINT").ok();
        env::remove_var("TOKKI_LLM_ENDPOINT");

        let response = run_async(request_llm_reply(LlmInteractionRequest {
            prompt: String::from("hello"),
            endpoint: None,
            model: None,
        }))
        .expect("request should not fail");

        if let Some(value) = existing_endpoint {
            env::set_var("TOKKI_LLM_ENDPOINT", value);
        }

        assert_eq!(response, LLM_NOT_CONFIGURED);
    }

    #[test]
    fn request_llm_reply_rejects_non_standard_endpoint() {
        let response = run_async(request_llm_reply(LlmInteractionRequest {
            prompt: String::from("hello"),
            endpoint: Some(String::from(
                "https://defensiveapi.azurewebsites.net/codexinference/RunModel",
            )),
            model: None,
        }));

        let error = response.expect_err("non-standard endpoint should fail");
        assert_eq!(error, INVALID_LLM_ENDPOINT);
    }

    #[test]
    fn request_llm_reply_rejects_empty_prompt() {
        let response = run_async(request_llm_reply(LlmInteractionRequest {
            prompt: String::from("   "),
            endpoint: Some(String::from("https://api.openai.com/v1/responses")),
            model: None,
        }));

        let error = response.expect_err("empty prompt should fail");
        assert_eq!(error, "prompt must not be empty");
    }

    #[test]
    fn extract_llm_text_reads_chat_completion_shape() {
        let payload = serde_json::json!({
            "choices": [
                {
                    "message": {
                        "content": "hi there"
                    }
                }
            ]
        });

        let text = extract_llm_text(&payload);
        assert_eq!(text.as_deref(), Some("hi there"));
    }

    #[test]
    fn standard_endpoint_validation_accepts_openai_and_azure_shapes() {
        assert!(validate_llm_endpoint("https://api.openai.com/v1/responses").is_ok());
        assert!(validate_llm_endpoint("https://api.openai.com/v1/chat/completions").is_ok());
        assert!(validate_llm_endpoint(
            "https://example.openai.azure.com/openai/deployments/gpt4/chat/completions?api-version=2024-10-21"
        )
        .is_ok());
    }

    #[test]
    fn standard_endpoint_validation_rejects_remote_http() {
        let endpoint =
            validate_llm_endpoint("http://api.openai.com/v1/chat/completions").expect_err("http");
        assert_eq!(endpoint, INSECURE_LLM_ENDPOINT);
    }

    #[test]
    fn standard_endpoint_validation_allows_localhost_http() {
        assert!(validate_llm_endpoint("http://localhost:11434/v1/chat/completions").is_ok());
        assert!(validate_llm_endpoint("http://127.0.0.1:11434/v1/chat/completions").is_ok());
    }
}
