use super::models::{ChatMessage, LlmResponse};

/// Trait that all LLM providers implement.
/// Each provider translates its own wire format but returns the same `LlmResponse`.
pub trait LlmProvider: Send + Sync {
    /// Send a chat message and get a structured response.
    /// `history` contains recent conversation turns.
    /// `session_context` is an optional context string from session memory.
    /// `personality_fragment` is the personality prompt injection.
    fn chat(
        &self,
        user_message: &str,
        history: &[ChatMessage],
        session_context: &str,
        personality_fragment: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<LlmResponse, String>> + Send + '_>>;

    /// Human-readable provider name for logging/UI.
    fn provider_name(&self) -> &str;

    /// Whether this provider requires a network connection.
    fn requires_network(&self) -> bool;
}

/// Which LLM backend to use.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderKind {
    /// Microsoft DefensiveHub (Azure GPT, completions-style API).
    DefensiveHub,
    /// OpenAI-compatible messages API (works with OpenAI, Azure OpenAI, etc.).
    OpenAi,
    /// Local Ollama instance.
    Ollama,
    /// Offline mode — template-based responses, no network.
    Offline,
}

impl Default for ProviderKind {
    fn default() -> Self {
        Self::DefensiveHub
    }
}

/// Build the appropriate provider from config.
/// If a network-dependent provider is selected but no API key is available,
/// logs a warning and falls back to the offline provider for graceful
/// degradation.
pub fn create_provider(
    config: &super::config::ProviderConfig,
) -> Result<Box<dyn LlmProvider>, String> {
    let provider: Box<dyn LlmProvider> = match config.provider {
        ProviderKind::DefensiveHub | ProviderKind::OpenAi => {
            if config.effective_api_key().is_empty() {
                eprintln!(
                    "[tokki] No API key found for {:?} provider — falling back to offline mode",
                    config.provider
                );
                Box::new(super::offline::OfflineProvider::new())
            } else if matches!(config.provider, ProviderKind::DefensiveHub) {
                Box::new(super::client::LlmClient::from_config(config)?)
            } else {
                Box::new(super::openai::OpenAiProvider::from_config(config)?)
            }
        }
        ProviderKind::Ollama => Box::new(super::ollama::OllamaProvider::from_config(config)?),
        ProviderKind::Offline => Box::new(super::offline::OfflineProvider::new()),
    };
    Ok(provider)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::llm::config::ProviderConfig;

    #[test]
    fn missing_api_key_falls_back_to_offline() {
        // Use Some("") to explicitly signal empty key, bypassing env/keyvault fallbacks
        let config = ProviderConfig {
            provider: ProviderKind::OpenAi,
            endpoint: None,
            model: None,
            api_key: Some(String::new()),
            max_tokens: 256,
            temperature: 0.7,
        };
        let provider = create_provider(&config).expect("create provider");
        assert_eq!(provider.provider_name(), "offline");
        assert!(!provider.requires_network());
    }

    #[test]
    fn defensivehub_without_key_falls_back_to_offline() {
        // Use Some("") to explicitly signal empty key, bypassing env/keyvault fallbacks
        let config = ProviderConfig {
            provider: ProviderKind::DefensiveHub,
            endpoint: None,
            model: None,
            api_key: Some(String::new()),
            max_tokens: 256,
            temperature: 0.7,
        };
        let provider = create_provider(&config).expect("create provider");
        assert_eq!(provider.provider_name(), "offline");
    }

    #[test]
    fn offline_provider_stays_offline() {
        let config = ProviderConfig {
            provider: ProviderKind::Offline,
            endpoint: None,
            model: None,
            api_key: None,
            max_tokens: 256,
            temperature: 0.7,
        };
        let provider = create_provider(&config).expect("create provider");
        assert_eq!(provider.provider_name(), "offline");
    }

    #[test]
    fn ollama_provider_created_without_key() {
        let config = ProviderConfig {
            provider: ProviderKind::Ollama,
            endpoint: Some("http://localhost:11434".to_string()),
            model: None,
            api_key: None,
            max_tokens: 256,
            temperature: 0.7,
        };
        let provider = create_provider(&config).expect("create provider");
        assert_eq!(provider.provider_name(), "ollama");
    }

    #[test]
    fn openai_with_key_creates_openai_provider() {
        let config = ProviderConfig {
            provider: ProviderKind::OpenAi,
            endpoint: None,
            model: None,
            api_key: Some("sk-test-key".to_string()),
            max_tokens: 256,
            temperature: 0.7,
        };
        let provider = create_provider(&config).expect("create provider");
        assert_eq!(provider.provider_name(), "openai");
    }
}
