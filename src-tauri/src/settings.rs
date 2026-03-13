use std::{fs, path::PathBuf, sync::RwLock};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::commands::{validate_llm_endpoint, MAX_LLM_MODEL_LEN};

const SETTINGS_FILE_NAME: &str = "settings.json";
pub const SETTINGS_UPDATED_EVENT: &str = "tokki://settings_updated";
const VALID_AVATAR_IDS: &[&str] = &["rabbit_v1", "cat_v1", "dog_v1", "penguin_v1", "owl_v1"];

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TokkiSettings {
    pub llm: LlmSettings,
    pub preferences: PreferencesSettings,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LlmSettings {
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct PreferencesSettings {
    pub avatar_id: Option<String>,
}

pub struct SettingsStore {
    path: PathBuf,
    inner: RwLock<TokkiSettings>,
}

impl TokkiSettings {
    pub fn normalized(mut self) -> Result<Self, String> {
        self.llm.endpoint = sanitize_optional(self.llm.endpoint.as_deref());
        if let Some(endpoint) = self.llm.endpoint.as_deref() {
            validate_llm_endpoint(endpoint)?;
        }

        self.llm.model = sanitize_optional(self.llm.model.as_deref());
        if let Some(model) = self.llm.model.as_deref() {
            if model.len() > MAX_LLM_MODEL_LEN {
                return Err(format!(
                    "llm model name too long (max {MAX_LLM_MODEL_LEN} bytes)"
                ));
            }
        }

        self.llm.api_key = sanitize_optional(self.llm.api_key.as_deref());
        self.preferences.avatar_id = sanitize_optional(self.preferences.avatar_id.as_deref());
        if let Some(avatar_id) = self.preferences.avatar_id.as_deref() {
            validate_avatar_id(avatar_id)?;
        }

        Ok(self)
    }
}

impl SettingsStore {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let path = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("failed to resolve app data directory: {error}"))?
            .join(SETTINGS_FILE_NAME);

        let settings = read_settings_file(&path).unwrap_or_default().normalized()?;

        Ok(Self {
            path,
            inner: RwLock::new(settings),
        })
    }

    pub fn snapshot(&self) -> Result<TokkiSettings, String> {
        self.inner
            .read()
            .map_err(|error| format!("failed to read settings: {error}"))
            .map(|guard| guard.clone())
    }

    pub fn save(&self, settings: TokkiSettings) -> Result<TokkiSettings, String> {
        let normalized = settings.normalized()?;
        {
            let mut guard = self
                .inner
                .write()
                .map_err(|error| format!("failed to write settings: {error}"))?;
            *guard = normalized.clone();
        }

        self.persist(&normalized)?;
        Ok(normalized)
    }

    pub fn reset(&self) -> Result<TokkiSettings, String> {
        self.save(TokkiSettings::default())
    }

    pub fn set_avatar_preference(&self, avatar_id: &str) -> Result<TokkiSettings, String> {
        validate_avatar_id(avatar_id)?;
        let mut settings = self.snapshot()?;
        settings.preferences.avatar_id = Some(String::from(avatar_id));
        self.save(settings)
    }

    fn persist(&self, settings: &TokkiSettings) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to create settings directory: {error}"))?;
        }

        let payload = serde_json::to_vec_pretty(settings)
            .map_err(|error| format!("failed to serialize settings: {error}"))?;
        fs::write(&self.path, payload)
            .map_err(|error| format!("failed to write settings: {error}"))?;

        Ok(())
    }
}

#[tauri::command]
pub fn get_settings(settings_store: State<'_, SettingsStore>) -> Result<TokkiSettings, String> {
    settings_store.snapshot()
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    settings: TokkiSettings,
    settings_store: State<'_, SettingsStore>,
) -> Result<TokkiSettings, String> {
    let saved = settings_store.save(settings)?;
    emit_settings_updated(&app, &saved)?;
    Ok(saved)
}

#[tauri::command]
pub fn reset_settings(
    app: AppHandle,
    settings_store: State<'_, SettingsStore>,
) -> Result<TokkiSettings, String> {
    let settings = settings_store.reset()?;
    emit_settings_updated(&app, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub fn set_avatar_preference(
    app: AppHandle,
    avatar_id: String,
    settings_store: State<'_, SettingsStore>,
) -> Result<TokkiSettings, String> {
    let settings = settings_store.set_avatar_preference(&avatar_id)?;
    emit_settings_updated(&app, &settings)?;
    Ok(settings)
}

fn sanitize_optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(String::from)
}

fn validate_avatar_id(avatar_id: &str) -> Result<(), String> {
    if VALID_AVATAR_IDS.iter().any(|candidate| candidate == &avatar_id) {
        return Ok(());
    }

    Err(format!("unsupported avatar id: {avatar_id}"))
}

fn emit_settings_updated(app: &AppHandle, settings: &TokkiSettings) -> Result<(), String> {
    app.emit(SETTINGS_UPDATED_EVENT, settings)
        .map_err(|error| format!("failed to emit settings update: {error}"))
}

fn read_settings_file(path: &PathBuf) -> Option<TokkiSettings> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<TokkiSettings>(&raw).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalized_settings_trim_and_clear_empty_fields() {
        let normalized = TokkiSettings {
            llm: LlmSettings {
                endpoint: Some(String::from("  https://api.openai.com/v1/responses  ")),
                model: Some(String::from("  gpt-4o-mini ")),
                api_key: Some(String::from("  secret-token  ")),
            },
            preferences: PreferencesSettings {
                avatar_id: Some(String::from("  rabbit_v1  ")),
            },
        }
        .normalized()
        .expect("settings should normalize");

        assert_eq!(
            normalized.llm.endpoint.as_deref(),
            Some("https://api.openai.com/v1/responses")
        );
        assert_eq!(normalized.llm.model.as_deref(), Some("gpt-4o-mini"));
        assert_eq!(normalized.llm.api_key.as_deref(), Some("secret-token"));
        assert_eq!(normalized.preferences.avatar_id.as_deref(), Some("rabbit_v1"));
    }

    #[test]
    fn normalized_settings_reject_invalid_avatar() {
        let error = TokkiSettings {
            preferences: PreferencesSettings {
                avatar_id: Some(String::from("robot_v1")),
            },
            ..TokkiSettings::default()
        }
        .normalized()
        .expect_err("avatar should be rejected");

        assert_eq!(error, "unsupported avatar id: robot_v1");
    }

    #[test]
    fn normalized_settings_reject_invalid_endpoint() {
        let error = TokkiSettings {
            llm: LlmSettings {
                endpoint: Some(String::from("https://example.com/not-supported")),
                ..LlmSettings::default()
            },
            ..TokkiSettings::default()
        }
        .normalized()
        .expect_err("endpoint should be rejected");

        assert_eq!(
            error,
            "invalid llm endpoint: use /v1/responses or /v1/chat/completions (OpenAI-compatible)"
        );
    }
}
