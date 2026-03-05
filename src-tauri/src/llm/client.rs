use std::time::Duration;

use reqwest::Client;

use super::models::{LlmApiRequest, LlmApiResponse, LlmResponse};
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
}

impl LlmClient {
    pub fn new() -> Self {
        let endpoint = std::env::var("TOKKI_LLM_ENDPOINT")
            .unwrap_or_else(|_| DEFAULT_ENDPOINT.to_string());

        let api_key = std::env::var("TOKKI_LLM_API_KEY")
            .or_else(|_| std::env::var("LLM_API_KEY"))
            .unwrap_or_default();

        let http = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .expect("failed to build HTTP client");

        Self { http, endpoint, api_key }
    }

    pub async fn chat(
        &self,
        user_message: &str,
        history: &[super::models::ChatMessage],
        session_context: &str,
    ) -> Result<LlmResponse, String> {
        let prompt = self.build_prompt(user_message, history, session_context);

        let request = LlmApiRequest {
            model: MODEL_NAME.to_string(),
            prompt,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            top_p: TOP_P,
        };

        let raw_output = self.call_with_retry(&request).await?;
        parse_llm_response(&raw_output)
    }

    fn build_prompt(
        &self,
        user_message: &str,
        history: &[super::models::ChatMessage],
        session_context: &str,
    ) -> String {
        let mut prompt = String::with_capacity(2048);
        prompt.push_str(SYSTEM_PROMPT);

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
        let mut req = self
            .http
            .post(&self.endpoint)
            .json(request);

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

        let api_response: LlmApiResponse = response
            .json()
            .await
            .map_err(|error| format!("failed to parse response: {error}"))?;

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

fn parse_llm_response(raw: &str) -> Result<LlmResponse, String> {
    let trimmed = raw.trim();

    // Find the first complete JSON object by counting braces
    if let Some(start) = trimmed.find('{') {
        let mut depth = 0;
        for (i, ch) in trimmed[start..].char_indices() {
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

fn guess_mood(text: &str) -> Mood {
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
        let raw = r#"{"line":"Hello there!","mood":"playful","animation":"idle.hop","intent":"greet"}"#;
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
    fn guess_mood_from_text() {
        assert_eq!(guess_mood("hello!"), Mood::Playful);
        assert_eq!(guess_mood("what is that?"), Mood::Curious);
        assert_eq!(guess_mood("so tired..."), Mood::Sleepy);
        assert_eq!(guess_mood("wow!"), Mood::Surprised);
        assert_eq!(guess_mood("ok"), Mood::Idle);
    }
}
