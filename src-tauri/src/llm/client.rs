use std::time::Duration;

use reqwest::Client;

use super::config::ProviderConfig;
use super::models::{LlmApiRequest, LlmApiResponse, LlmResponse};
use super::provider::LlmProvider;
use crate::engine::models::Mood;

const DEFAULT_ENDPOINT: &str = "https://defensiveapi.azurewebsites.net/codexinference/RunModel";
const MODEL_NAME: &str = "GPT5Bing";
const MAX_TOKENS: u32 = 256;
const TEMPERATURE: f64 = 0.7;
const TOP_P: f64 = 1.0;
const REQUEST_TIMEOUT_SECS: u64 = 30;
const MAX_RETRIES: u32 = 3;
const RETRY_BACKOFF_BASE_MS: u64 = 500;

const SYSTEM_PROMPT: &str = r#"You are Tokki, a cute desktop companion character. You are a small, friendly creature who lives on the user's desktop. You speak in short, warm sentences. You are helpful but brief — your responses must be under 40 words.

You MUST respond with ONLY a valid JSON object in this exact format:
{"line":"<your short reply>","mood":"<idle|curious|playful|sleepy|surprised>","animation":"<idle.blink|idle.hop|idle.look|rest.nap|react.poke|react.click>","intent":"<none|greet|help|joke|think|goodbye>"}

Pick the mood and animation that best match your response's emotional tone. Do not include anything outside the JSON."#;

pub struct LlmClient {
    http: Client,
    endpoint: String,
    api_key: String,
    model: String,
    max_tokens: u32,
    temperature: f64,
}

impl LlmClient {
    pub fn new() -> Result<Self, String> {
        let endpoint =
            std::env::var("TOKKI_LLM_ENDPOINT").unwrap_or_else(|_| DEFAULT_ENDPOINT.to_string());

        let api_key = std::env::var("TOKKI_LLM_API_KEY")
            .or_else(|_| std::env::var("LLM_API_KEY"))
            .unwrap_or_default();

        let http = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .map_err(|e| format!("failed to build HTTP client: {e}"))?;

        Ok(Self {
            http,
            endpoint,
            api_key,
            model: MODEL_NAME.to_string(),
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
        })
    }

    /// Create from a ProviderConfig (used by the provider factory).
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

    fn build_prompt(
        &self,
        user_message: &str,
        history: &[super::models::ChatMessage],
        session_context: &str,
        personality_fragment: &str,
    ) -> String {
        let mut prompt = String::with_capacity(2048);
        prompt.push_str(SYSTEM_PROMPT);

        // Inject personality right after the system prompt
        if !personality_fragment.is_empty() {
            prompt.push_str(personality_fragment);
        }

        if !session_context.is_empty() {
            prompt.push_str(session_context);
        }

        prompt.push_str("\n\n");

        let recent = if history.len() > 6 {
            &history[history.len() - 6..]
        } else {
            history
        };

        for msg in recent {
            prompt.push_str(&format!("{}: {}\n", msg.role, msg.content));
        }

        prompt.push_str(&format!("user: {}\nassistant:", user_message));
        prompt
    }

    async fn call_with_retry(&self, request: &LlmApiRequest) -> Result<String, String> {
        let mut last_error = String::new();

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let delay = RETRY_BACKOFF_BASE_MS * 2u64.pow(attempt - 1);
                tokio::time::sleep(Duration::from_millis(delay)).await;
            }

            match self.call_api(request).await {
                Ok(output) => return Ok(output),
                Err(error) => {
                    eprintln!("[tokki] LLM call attempt {} failed: {}", attempt + 1, error);
                    last_error = error;
                }
            }
        }

        Err(format!(
            "LLM call failed after {} retries: {}",
            MAX_RETRIES, last_error
        ))
    }

    async fn call_api(&self, request: &LlmApiRequest) -> Result<String, String> {
        let mut req = self.http.post(&self.endpoint).json(request);

        if !self.api_key.is_empty() {
            req = req.header("InferenceAPIKey", &self.api_key);
        }

        let response = req
            .send()
            .await
            .map_err(|error| format!("HTTP request failed: {error}"))?;

        if !response.status().is_success() {
            return Err(format!("API returned status {}", response.status()));
        }

        let api_response: LlmApiResponse = {
            let body = super::read_bounded_body(response).await?;
            serde_json::from_slice(&body)
                .map_err(|error| format!("failed to parse response: {error}"))?
        };

        if let Some(error) = api_response.error {
            if !error.is_empty() {
                return Err(format!("API error: {error}"));
            }
        }

        let text = api_response
            .choices
            .first()
            .map(|c| c.text.clone())
            .unwrap_or_default();

        // Strip common system tokens the model may append
        let cleaned = text
            .replace("<|im_end|>", "")
            .replace("<|endoftext|>", "")
            .replace("<|im_start|>", "")
            .replace("<|fim_suffix|>", "")
            .replace("<|im_sep|>", "");

        Ok(cleaned)
    }
}

impl LlmProvider for LlmClient {
    fn chat(
        &self,
        user_message: &str,
        history: &[super::models::ChatMessage],
        session_context: &str,
        personality_fragment: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<LlmResponse, String>> + Send + '_>>
    {
        let prompt =
            self.build_prompt(user_message, history, session_context, personality_fragment);
        let request = LlmApiRequest {
            model: self.model.clone(),
            prompt,
            max_tokens: self.max_tokens,
            temperature: self.temperature,
            top_p: TOP_P,
        };

        Box::pin(async move {
            let raw_output = self.call_with_retry(&request).await?;
            parse_llm_response(&raw_output)
        })
    }

    fn provider_name(&self) -> &str {
        "defensive_hub"
    }

    fn requires_network(&self) -> bool {
        true
    }
}

/// Maximum raw response length we'll attempt to parse (64 KB).
/// Anything beyond this is truncated before JSON extraction to avoid
/// burning CPU on multi-MB model output.
const MAX_PARSE_LEN: usize = 65_536;

/// Parse a raw LLM output string into a structured LlmResponse.
/// Public so other providers can reuse the JSON extraction logic.
pub fn parse_llm_response(raw: &str) -> Result<LlmResponse, String> {
    let capped = if raw.len() > MAX_PARSE_LEN {
        &raw[..MAX_PARSE_LEN]
    } else {
        raw
    };
    let trimmed = capped.trim();

    // Find the first complete JSON object by counting braces,
    // while correctly ignoring braces inside JSON string literals.
    if let Some(start) = trimmed.find('{') {
        let mut depth: i32 = 0;
        let mut in_string = false;
        let mut escape_next = false;
        for (i, ch) in trimmed[start..].char_indices() {
            if escape_next {
                escape_next = false;
                continue;
            }
            if ch == '\\' && in_string {
                escape_next = true;
                continue;
            }
            if ch == '"' {
                in_string = !in_string;
                continue;
            }
            if in_string {
                continue;
            }
            match ch {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        let json_slice = &trimmed[start..=start + i];
                        if let Ok(response) = serde_json::from_str::<LlmResponse>(json_slice) {
                            return Ok(response);
                        }
                        break;
                    }
                }
                _ => {}
            }
        }
    }

    Ok(LlmResponse {
        line: if trimmed.len() > 120 {
            format!("{}...", &trimmed[..117])
        } else if trimmed.is_empty() {
            "*yawns*".to_string()
        } else {
            trimmed.to_string()
        },
        mood: guess_mood(trimmed),
        animation: "idle.blink".to_string(),
        intent: "none".to_string(),
    })
}

pub fn guess_mood(text: &str) -> Mood {
    let lower = text.to_lowercase();
    if lower.contains("hello") || lower.contains("hi") || lower.contains("hey") {
        Mood::Playful
    } else if lower.contains('?') || lower.contains("wonder") || lower.contains("think") {
        Mood::Curious
    } else if lower.contains("sleep") || lower.contains("tired") || lower.contains("yawn") {
        Mood::Sleepy
    } else if lower.contains('!') || lower.contains("wow") || lower.contains("whoa") {
        Mood::Surprised
    } else {
        Mood::Idle
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_json_response() {
        let raw =
            r#"{"line":"Hello there!","mood":"playful","animation":"idle.hop","intent":"greet"}"#;
        let result = parse_llm_response(raw).unwrap();
        assert_eq!(result.line, "Hello there!");
        assert_eq!(result.mood, Mood::Playful);
        assert_eq!(result.intent, "greet");
    }

    #[test]
    fn parse_json_with_surrounding_text() {
        let raw = r#"Here is my response: {"line":"Hi!","mood":"idle","animation":"idle.blink","intent":"greet"} Hope that helps!"#;
        let result = parse_llm_response(raw).unwrap();
        assert_eq!(result.line, "Hi!");
    }

    #[test]
    fn fallback_on_plain_text() {
        let raw = "Just a plain text response";
        let result = parse_llm_response(raw).unwrap();
        assert_eq!(result.line, "Just a plain text response");
        assert_eq!(result.intent, "none");
    }

    #[test]
    fn fallback_on_empty() {
        let result = parse_llm_response("").unwrap();
        assert_eq!(result.line, "*yawns*");
    }

    #[test]
    fn fallback_on_whitespace_only() {
        let result = parse_llm_response("   \n\t  ").unwrap();
        assert_eq!(result.line, "*yawns*");
    }

    #[test]
    fn parse_json_with_braces_in_string_value() {
        let raw = r#"{"line":"hello {world} and {friends}","mood":"playful","animation":"idle.hop","intent":"greet"}"#;
        let result = parse_llm_response(raw).unwrap();
        assert_eq!(result.line, "hello {world} and {friends}");
        assert_eq!(result.mood, Mood::Playful);
    }

    #[test]
    fn parse_json_with_escaped_quotes_in_string() {
        let raw =
            r#"{"line":"she said \"hi\"","mood":"idle","animation":"idle.blink","intent":"none"}"#;
        let result = parse_llm_response(raw).unwrap();
        assert_eq!(result.line, r#"she said "hi""#);
    }

    #[test]
    fn parse_truncates_extremely_long_response() {
        // Build a response longer than MAX_PARSE_LEN (64KB) with valid JSON near the start
        let json = r#"{"line":"ok","mood":"idle","animation":"idle.blink","intent":"none"}"#;
        let padding = "x".repeat(100_000);
        let raw = format!("{}{}", json, padding);
        let result = parse_llm_response(&raw).unwrap();
        assert_eq!(result.line, "ok");
    }

    #[test]
    fn fallback_on_unbalanced_braces() {
        // Opening brace but never closed — should fall back to text
        let raw = r#"{"line":"broken"#;
        let result = parse_llm_response(raw).unwrap();
        assert_eq!(result.intent, "none");
        // Should have used the raw text as fallback
        assert!(result.line.contains("broken") || result.line.contains("{"));
    }

    #[test]
    fn guess_mood_from_text() {
        assert_eq!(guess_mood("hello!"), Mood::Playful);
        assert_eq!(guess_mood("what is that?"), Mood::Curious);
        assert_eq!(guess_mood("so tired..."), Mood::Sleepy);
        assert_eq!(guess_mood("wow!"), Mood::Surprised);
        assert_eq!(guess_mood("ok"), Mood::Idle);
    }
}
