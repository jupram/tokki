use std::time::Duration;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::config::ProviderConfig;
use super::models::{ChatMessage, LlmResponse};
use super::provider::LlmProvider;

const SYSTEM_PROMPT: &str = r#"You are Tokki, a cute desktop companion character. You are a small, friendly creature who lives on the user's desktop. You speak in short, warm sentences. You are helpful but brief — your responses must be under 40 words.

You MUST respond with ONLY a valid JSON object in this exact format:
{"line":"<your short reply>","mood":"<idle|curious|playful|sleepy|surprised>","animation":"<idle.blink|idle.hop|idle.look|rest.nap|react.poke|react.click>","intent":"<none|greet|help|joke|think|goodbye>"}

Pick the mood and animation that best match your response's emotional tone. Do not include anything outside the JSON."#;

const REQUEST_TIMEOUT_SECS: u64 = 60; // Ollama can be slower
const MAX_RETRIES: u32 = 2;
const RETRY_BACKOFF_BASE_MS: u64 = 1000;

/// Ollama local LLM provider.
/// Uses the /api/chat endpoint with messages format.
pub struct OllamaProvider {
    http: Client,
    endpoint: String,
    model: String,
    max_tokens: u32,
    temperature: f64,
}

#[derive(Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Serialize)]
struct OllamaOptions {
    num_predict: u32,
    temperature: f64,
}

#[derive(Deserialize)]
struct OllamaResponse {
    #[serde(default)]
    message: Option<OllamaResponseMessage>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Deserialize)]
struct OllamaResponseMessage {
    content: String,
}

impl OllamaProvider {
    pub fn from_config(config: &ProviderConfig) -> Result<Self, String> {
        let http = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .map_err(|e| format!("failed to build HTTP client: {e}"))?;

        Ok(Self {
            http,
            endpoint: config.effective_endpoint(),
            model: config.effective_model(),
            max_tokens: config.max_tokens,
            temperature: config.temperature,
        })
    }

    fn build_messages(
        &self,
        user_message: &str,
        history: &[ChatMessage],
        session_context: &str,
        personality_fragment: &str,
    ) -> Vec<OllamaMessage> {
        let mut messages = Vec::new();

        let mut system = SYSTEM_PROMPT.to_string();
        if !personality_fragment.is_empty() {
            system.push_str(personality_fragment);
        }
        if !session_context.is_empty() {
            system.push_str(session_context);
        }
        messages.push(OllamaMessage {
            role: "system".to_string(),
            content: system,
        });

        let recent = if history.len() > 6 {
            &history[history.len() - 6..]
        } else {
            history
        };
        for msg in recent {
            messages.push(OllamaMessage {
                role: msg.role.clone(),
                content: msg.content.clone(),
            });
        }

        messages.push(OllamaMessage {
            role: "user".to_string(),
            content: user_message.to_string(),
        });

        messages
    }

    async fn call_with_retry(&self, messages: &[OllamaMessage]) -> Result<String, String> {
        let mut last_error = String::new();

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let delay = RETRY_BACKOFF_BASE_MS * 2u64.pow(attempt - 1);
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }

            match self.call_api(messages).await {
                Ok(output) => return Ok(output),
                Err(error) => {
                    last_error = error;
                }
            }
        }

        Err(format!(
            "Ollama call failed after {} retries: {}",
            MAX_RETRIES, last_error
        ))
    }

    async fn call_api(&self, messages: &[OllamaMessage]) -> Result<String, String> {
        let request = OllamaRequest {
            model: self.model.clone(),
            messages: messages
                .iter()
                .map(|m| OllamaMessage {
                    role: m.role.clone(),
                    content: m.content.clone(),
                })
                .collect(),
            stream: false,
            options: OllamaOptions {
                num_predict: self.max_tokens,
                temperature: self.temperature,
            },
        };

        let url = format!("{}/api/chat", self.endpoint.trim_end_matches('/'));

        let response = self
            .http
            .post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!("Ollama returned status {}", response.status()));
        }

        let api_response: OllamaResponse = response
            .json()
            .await
            .map_err(|e| format!("failed to parse response: {e}"))?;

        if let Some(error) = api_response.error {
            return Err(format!("Ollama error: {error}"));
        }

        let text = api_response.message.map(|m| m.content).unwrap_or_default();

        Ok(text)
    }
}

impl LlmProvider for OllamaProvider {
    fn chat(
        &self,
        user_message: &str,
        history: &[ChatMessage],
        session_context: &str,
        personality_fragment: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<LlmResponse, String>> + Send + '_>>
    {
        let messages =
            self.build_messages(user_message, history, session_context, personality_fragment);

        Box::pin(async move {
            let raw = self.call_with_retry(&messages).await?;
            super::client::parse_llm_response(&raw)
        })
    }

    fn provider_name(&self) -> &str {
        "ollama"
    }

    fn requires_network(&self) -> bool {
        false // Local network only
    }
}
