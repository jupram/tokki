use serde::{Deserialize, Serialize};

use crate::engine::models::Mood;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmResponse {
    pub line: String,
    pub mood: Mood,
    pub animation: String,
    pub intent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmApiRequest {
    pub model: String,
    pub prompt: String,
    pub max_tokens: u32,
    pub temperature: f64,
    pub top_p: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmApiChoice {
    #[serde(default)]
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmApiResponse {
    #[serde(default)]
    pub choices: Vec<LlmApiChoice>,
    #[serde(default)]
    pub error: Option<String>,
}

impl Default for LlmResponse {
    fn default() -> Self {
        Self {
            line: "...".to_string(),
            mood: Mood::Idle,
            animation: "idle.blink".to_string(),
            intent: "none".to_string(),
        }
    }
}
