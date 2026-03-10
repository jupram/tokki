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

const REQUEST_TIMEOUT_SECS: u64 = 30;
const MAX_RETRIES: u32 = 3;
const RETRY_BACKOFF_BASE_MS: u64 = 500;

/// OpenAI-compatible provider (works with OpenAI, Azure OpenAI, any messages-style API).
pub struct OpenAiProvider {
    http: Client,
    endpoint: String,
    api_key: String,
    model: String,
    max_tokens: u32,
    temperature: f64,
}

#[derive(Serialize)]
struct OpenAiMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OpenAiRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    max_tokens: u32,
    temperature: f64,
}

#[derive(Deserialize)]
struct OpenAiChoice {
    message: OpenAiResponseMessage,
}

#[derive(Deserialize)]
struct OpenAiResponseMessage {
    content: String,
}

#[derive(Deserialize)]
struct OpenAiResponse {
    #[serde(default)]
    choices: Vec<OpenAiChoice>,
    #[serde(default)]
    error: Option<OpenAiError>,
}

#[derive(Deserialize)]
struct OpenAiError {
    message: String,
}

impl OpenAiProvider {
    pub fn from_config(config: &ProviderConfig) -> Result<Self, String> {
        let http = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .map_err(|e| format!("failed to build HTTP client: {e}"))?;

        Ok(Self {
            http,
            endpoint: config.effective_endpoint(),
            api_key: config.effective_api_key(),
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
    ) -> Vec<OpenAiMessage> {
        let mut messages = Vec::new();

        // System message with personality and context
        let mut system = SYSTEM_PROMPT.to_string();
        if !personality_fragment.is_empty() {
            system.push_str(personality_fragment);
        }
        if !session_context.is_empty() {
            system.push_str(session_context);
        }
        messages.push(OpenAiMessage {
            role: "system".to_string(),
            content: system,
        });

        // Recent history
        let recent = if history.len() > 6 {
            &history[history.len() - 6..]
        } else {
            history
        };
        for msg in recent {
            messages.push(OpenAiMessage {
                role: msg.role.clone(),
                content: msg.content.clone(),
            });
        }

        // Current user message
        messages.push(OpenAiMessage {
            role: "user".to_string(),
            content: user_message.to_string(),
        });

        messages
    }

    async fn call_with_retry(&self, messages: &[OpenAiMessage]) -> Result<String, String> {
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
            "OpenAI call failed after {} retries: {}",
            MAX_RETRIES, last_error
        ))
    }

    async fn call_api(&self, messages: &[OpenAiMessage]) -> Result<String, String> {
        let request = OpenAiRequest {
            model: self.model.clone(),
            messages: messages
                .iter()
                .map(|m| OpenAiMessage {
                    role: m.role.clone(),
                    content: m.content.clone(),
                })
                .collect(),
            max_tokens: self.max_tokens,
            temperature: self.temperature,
        };

        let url = format!("{}/chat/completions", self.endpoint.trim_end_matches('/'));

        let mut req = self.http.post(&url).json(&request);
        if !self.api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", self.api_key));
        }

        let response = req
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        if !response.status().is_success() {
            return Err(format!("API returned status {}", response.status()));
        }

        let api_response: OpenAiResponse = {
            let body = super::read_bounded_body(response).await?;
            serde_json::from_slice(&body)
                .map_err(|e| format!("failed to parse response: {e}"))?
        };

        if let Some(error) = api_response.error {
            return Err(format!("API error: {}", error.message));
        }

        let text = api_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();

        Ok(text)
    }
}

impl LlmProvider for OpenAiProvider {
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
        "openai"
    }

    fn requires_network(&self) -> bool {
        true
    }
}
