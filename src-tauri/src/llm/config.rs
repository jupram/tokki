use super::provider::ProviderKind;
use serde::{Deserialize, Serialize};

/// On-disk config for LLM provider selection.
/// Stored as TOML at `{data_dir}/Tokki/llm_config.toml`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    #[serde(default)]
    pub provider: ProviderKind,

    /// Endpoint URL override. Meaning depends on provider:
    /// - DefensiveHub: the RunModel endpoint
    /// - OpenAI: base URL (e.g. https://api.openai.com/v1)
    /// - Ollama: local URL (e.g. http://localhost:11434)
    /// - Offline: ignored
    #[serde(default)]
    pub endpoint: Option<String>,

    /// Model name override.
    #[serde(default)]
    pub model: Option<String>,

    /// API key. Read from config or falls back to env vars / secure keyring storage.
    /// Never written to the plaintext TOML config file.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,

    /// Max tokens for generation.
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,

    /// Temperature for generation.
    #[serde(default = "default_temperature")]
    pub temperature: f64,
}

fn default_max_tokens() -> u32 {
    256
}
fn default_temperature() -> f64 {
    0.7
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            provider: ProviderKind::DefensiveHub,
            endpoint: None,
            model: None,
            api_key: None,
            max_tokens: default_max_tokens(),
            temperature: default_temperature(),
        }
    }
}

impl ProviderConfig {
    /// Load config from the standard location, falling back to defaults.
    pub fn load() -> Self {
        if let Some(path) = config_path() {
            if let Ok(contents) = std::fs::read_to_string(&path) {
                if let Ok(mut cfg) = toml::from_str::<ProviderConfig>(&contents) {
                    // Env vars override config file for API key
                    if cfg.api_key.is_none() {
                        cfg.api_key =
                            api_key_from_env().or_else(|| api_key_from_keyring(&cfg.provider));
                    }
                    // Env vars override endpoint
                    if cfg.endpoint.is_none() {
                        if let Ok(ep) = std::env::var("TOKKI_LLM_ENDPOINT") {
                            cfg.endpoint = Some(ep);
                        }
                    }
                    return cfg;
                }
            }
        }

        // No config file — build from env vars (backwards compatible)
        let mut cfg = Self::default();
        cfg.api_key = api_key_from_env().or_else(|| api_key_from_keyring(&cfg.provider));
        if let Ok(ep) = std::env::var("TOKKI_LLM_ENDPOINT") {
            cfg.endpoint = Some(ep);
        }
        cfg
    }

    /// Save current config to disk (excluding api_key from plaintext storage).
    /// User-entered API keys are stored in the OS credential manager instead.
    pub fn save(&self) -> Result<(), String> {
        let path = config_path().ok_or("cannot determine config directory")?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create config dir: {e}"))?;
        }
        // Clone and strip api_key before writing
        let mut to_write = self.clone();
        to_write.api_key = None;
        let contents = toml::to_string_pretty(&to_write)
            .map_err(|e| format!("failed to serialize config: {e}"))?;
        std::fs::write(&path, contents).map_err(|e| format!("failed to write config: {e}"))?;
        if let Some(api_key) = self
            .api_key
            .as_deref()
            .map(str::trim)
            .filter(|key| !key.is_empty())
        {
            store_api_key_in_keyring(&self.provider, api_key)?;
        }
        Ok(())
    }

    /// Resolve the effective API key (config > env > secure keyring).
    pub fn effective_api_key(&self) -> String {
        self.api_key
            .clone()
            .or_else(api_key_from_env)
            .or_else(|| api_key_from_keyring(&self.provider))
            .unwrap_or_default()
    }

    /// Resolve the effective endpoint for a given provider.
    pub fn effective_endpoint(&self) -> String {
        self.endpoint
            .clone()
            .unwrap_or_else(|| match self.provider {
                ProviderKind::DefensiveHub => {
                    "https://defensiveapi.azurewebsites.net/codexinference/RunModel".to_string()
                }
                ProviderKind::OpenAi => "https://api.openai.com/v1".to_string(),
                ProviderKind::Ollama => "http://localhost:11434".to_string(),
                ProviderKind::Offline => String::new(),
            })
    }

    /// Resolve the effective model name.
    pub fn effective_model(&self) -> String {
        self.model.clone().unwrap_or_else(|| match self.provider {
            ProviderKind::DefensiveHub => "GPT5Bing".to_string(),
            ProviderKind::OpenAi => "gpt-4o-mini".to_string(),
            ProviderKind::Ollama => "llama3.2".to_string(),
            ProviderKind::Offline => "offline".to_string(),
        })
    }
}

fn api_key_from_env() -> Option<String> {
    std::env::var("TOKKI_LLM_API_KEY")
        .or_else(|_| std::env::var("LLM_API_KEY"))
        .ok()
        .filter(|k| !k.is_empty())
        .or_else(api_key_from_keyvault)
}

/// Azure Key Vault configuration
const AZURE_KEYVAULT_URL: &str = "https://twcmetrics.vault.azure.net/";
const API_KEY_SECRET_NAME: &str = "InferenceAPIKey";
const KEYRING_SERVICE_NAME: &str = "tokki-desktop";

/// Fetch API key from Azure Key Vault using `az` CLI (requires `az login`).
fn api_key_from_keyvault() -> Option<String> {
    let vault_name = AZURE_KEYVAULT_URL
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .and_then(|h| h.strip_suffix(".vault.azure.net"))
        .unwrap_or("twcmetrics");

    // On Windows, `az` is a .cmd script — must invoke via cmd.exe
    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args([
                "/C",
                "az",
                "keyvault",
                "secret",
                "show",
                "--vault-name",
                vault_name,
                "--name",
                API_KEY_SECRET_NAME,
                "--query",
                "value",
                "-o",
                "tsv",
            ])
            .output()
            .ok()?
    } else {
        std::process::Command::new("az")
            .args([
                "keyvault",
                "secret",
                "show",
                "--vault-name",
                vault_name,
                "--name",
                API_KEY_SECRET_NAME,
                "--query",
                "value",
                "-o",
                "tsv",
            ])
            .output()
            .ok()?
    };

    if !output.status.success() {
        eprintln!(
            "Key Vault fetch failed (exit {}): {}",
            output.status.code().unwrap_or(-1),
            String::from_utf8_lossy(&output.stderr).trim()
        );
        return None;
    }

    let key = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if key.is_empty() {
        None
    } else {
        eprintln!("LLM API key loaded from Azure Key Vault");
        Some(key)
    }
}

fn api_key_from_keyring(provider: &ProviderKind) -> Option<String> {
    let account = api_key_account_name(provider);
    let entry = keyring::Entry::new(KEYRING_SERVICE_NAME, &account).ok()?;
    let secret = entry.get_secret().ok()?;
    let key = String::from_utf8(secret).ok()?.trim().to_string();
    if key.is_empty() {
        None
    } else {
        Some(key)
    }
}

fn store_api_key_in_keyring(provider: &ProviderKind, api_key: &str) -> Result<(), String> {
    let account = api_key_account_name(provider);
    let entry = keyring::Entry::new(KEYRING_SERVICE_NAME, &account)
        .map_err(|e| format!("keyring entry error: {e}"))?;
    entry
        .set_secret(api_key.as_bytes())
        .map_err(|e| format!("keyring store error: {e}"))?;
    Ok(())
}

fn api_key_account_name(provider: &ProviderKind) -> String {
    format!("llm-api-key-{}", provider_key_slug(provider))
}

fn provider_key_slug(provider: &ProviderKind) -> &'static str {
    match provider {
        ProviderKind::DefensiveHub => "defensive_hub",
        ProviderKind::OpenAi => "open_ai",
        ProviderKind::Ollama => "ollama",
        ProviderKind::Offline => "offline",
    }
}

fn config_path() -> Option<std::path::PathBuf> {
    dirs::data_local_dir().map(|d| d.join("Tokki").join("llm_config.toml"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_defensivehub() {
        let cfg = ProviderConfig::default();
        assert_eq!(cfg.provider, ProviderKind::DefensiveHub);
        assert_eq!(cfg.max_tokens, 256);
        assert!((cfg.temperature - 0.7).abs() < f64::EPSILON);
    }

    #[test]
    fn effective_endpoint_defaults() {
        let mut cfg = ProviderConfig::default();
        assert!(cfg.effective_endpoint().contains("defensiveapi"));

        cfg.provider = ProviderKind::OpenAi;
        assert!(cfg.effective_endpoint().contains("openai.com"));

        cfg.provider = ProviderKind::Ollama;
        assert!(cfg.effective_endpoint().contains("localhost"));

        cfg.provider = ProviderKind::Offline;
        assert!(cfg.effective_endpoint().is_empty());
    }

    #[test]
    fn effective_endpoint_uses_override() {
        let mut cfg = ProviderConfig::default();
        cfg.endpoint = Some("https://custom.example.com".to_string());
        assert_eq!(cfg.effective_endpoint(), "https://custom.example.com");
    }

    #[test]
    fn effective_model_defaults() {
        let mut cfg = ProviderConfig::default();
        assert_eq!(cfg.effective_model(), "GPT5Bing");

        cfg.provider = ProviderKind::OpenAi;
        assert_eq!(cfg.effective_model(), "gpt-4o-mini");

        cfg.provider = ProviderKind::Ollama;
        assert_eq!(cfg.effective_model(), "llama3.2");
    }

    #[test]
    fn roundtrip_toml() {
        let cfg = ProviderConfig {
            provider: ProviderKind::OpenAi,
            endpoint: Some("https://example.com".to_string()),
            model: Some("gpt-4o".to_string()),
            api_key: None,
            max_tokens: 512,
            temperature: 0.9,
        };
        let serialized = toml::to_string_pretty(&cfg).unwrap();
        let deserialized: ProviderConfig = toml::from_str(&serialized).unwrap();
        assert_eq!(deserialized.provider, ProviderKind::OpenAi);
        assert_eq!(deserialized.model, Some("gpt-4o".to_string()));
        assert_eq!(deserialized.max_tokens, 512);
    }

    #[test]
    fn deserialize_minimal_toml() {
        let toml_str = r#"provider = "ollama""#;
        let cfg: ProviderConfig = toml::from_str(toml_str).unwrap();
        assert_eq!(cfg.provider, ProviderKind::Ollama);
        assert_eq!(cfg.max_tokens, 256); // default
    }

    #[test]
    fn effective_api_key_prefers_explicit_value() {
        let cfg = ProviderConfig {
            provider: ProviderKind::OpenAi,
            endpoint: None,
            model: None,
            api_key: Some("typed-in-app".to_string()),
            max_tokens: 256,
            temperature: 0.7,
        };
        assert_eq!(cfg.effective_api_key(), "typed-in-app");
    }

    #[test]
    fn keyring_account_name_is_provider_specific() {
        assert_eq!(
            api_key_account_name(&ProviderKind::DefensiveHub),
            "llm-api-key-defensive_hub"
        );
        assert_eq!(
            api_key_account_name(&ProviderKind::OpenAi),
            "llm-api-key-open_ai"
        );
        assert_eq!(
            api_key_account_name(&ProviderKind::Ollama),
            "llm-api-key-ollama"
        );
    }
}
