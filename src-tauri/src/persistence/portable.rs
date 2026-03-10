use crate::engine::models::{normalize_avatar_id, PersonalityConfig};
use crate::llm::config::ProviderConfig;
use crate::llm::memory::SessionMemory;
use crate::llm::models::ChatMessage;
use crate::llm::provider::ProviderKind;
use serde::{Deserialize, Serialize};

const MAX_IMPORT_FILE_BYTES: u64 = 1_048_576;
const MAX_IMPORT_STRING_LEN: usize = 200;
const MAX_IMPORT_ARRAY_LEN: usize = 50;
const MAX_IMPORT_TOPIC_LEN: usize = 100;
const MAX_IMPORT_CHAT_HISTORY_LEN: usize = 200;
const MAX_IMPORT_CHAT_MESSAGE_LEN: usize = 2_000;

/// Tokki portable memory export format (JSON).
/// Version-tagged so future readers can migrate older formats.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableMemory {
    pub format_version: u32,
    pub exported_at: String,
    pub session: SessionMemory,
    pub personality: PersonalitySerializable,
    pub provider: ProviderSerializable,
    pub avatar_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chat_history: Option<Vec<ChatMessage>>,
}

/// Personality snapshot for export (mirrors PersonalityConfig but is serde-friendly).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalitySerializable {
    pub name: String,
    pub preset: String,
    pub humor: u32,
    pub reaction_intensity: u32,
    pub chattiness: u32,
}

/// Provider selection for export (excludes secrets).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderSerializable {
    pub provider: ProviderKind,
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub max_tokens: u32,
    pub temperature: f64,
}

impl PortableMemory {
    pub const CURRENT_VERSION: u32 = 3;

    /// Build an export bundle from runtime state.
    pub fn export(
        session: &SessionMemory,
        personality: &PersonalityConfig,
        provider_config: &ProviderConfig,
        avatar_id: &str,
        chat_history: Option<&[ChatMessage]>,
    ) -> Self {
        let now = chrono_iso_now();
        Self {
            format_version: Self::CURRENT_VERSION,
            exported_at: now,
            session: session.clone(),
            personality: PersonalitySerializable {
                name: personality.name.clone(),
                preset: serde_json::to_value(&personality.preset)
                    .ok()
                    .and_then(|v| v.as_str().map(String::from))
                    .unwrap_or_else(|| format!("{:?}", personality.preset).to_lowercase()),
                humor: personality.humor as u32,
                reaction_intensity: personality.reaction_intensity as u32,
                chattiness: personality.chattiness as u32,
            },
            provider: ProviderSerializable {
                provider: provider_config.provider.clone(),
                endpoint: provider_config.endpoint.clone(),
                model: provider_config.model.clone(),
                max_tokens: provider_config.max_tokens,
                temperature: provider_config.temperature,
            },
            avatar_id: avatar_id.to_string(),
            chat_history: chat_history.map(|messages| messages.to_vec()),
        }
    }

    /// Serialize to pretty-printed JSON.
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self).map_err(|e| format!("serialize failed: {e}"))
    }

    /// Deserialize from JSON, validating version and sanitizing fields.
    pub fn from_json(json: &str) -> Result<Self, String> {
        let mut mem: Self =
            serde_json::from_str(json).map_err(|e| format!("invalid portable memory JSON: {e}"))?;
        if mem.format_version > Self::CURRENT_VERSION {
            return Err(format!(
                "unsupported format version {} (this app supports up to {})",
                mem.format_version,
                Self::CURRENT_VERSION
            ));
        }
        mem.validate_and_sanitize()?;
        Ok(mem)
    }

    /// Reject clearly invalid data and clamp/truncate values that are out of
    /// range but can be reasonably corrected.
    fn validate_and_sanitize(&mut self) -> Result<(), String> {
        if self.avatar_id.trim().is_empty() {
            return Err("import rejected: avatar_id is required".to_string());
        }

        // Clamp personality dials to valid 0-100 range.
        self.personality.humor = self.personality.humor.min(100);
        self.personality.reaction_intensity = self.personality.reaction_intensity.min(100);
        self.personality.chattiness = self.personality.chattiness.min(100);

        // Bound provider settings.
        self.provider.temperature = self.provider.temperature.clamp(0.0, 2.0);
        self.provider.max_tokens = self.provider.max_tokens.clamp(1, 8192);

        // Truncate unreasonably long strings.
        truncate_string(&mut self.personality.name, MAX_IMPORT_STRING_LEN);
        truncate_string(&mut self.avatar_id, MAX_IMPORT_STRING_LEN);
        self.avatar_id = normalize_avatar_id(self.avatar_id.trim()).to_string();

        // Truncate oversized session memory arrays.
        self.session.topics.truncate(MAX_IMPORT_ARRAY_LEN);
        self.session.preferences.truncate(MAX_IMPORT_ARRAY_LEN);
        self.session.profile_facts.truncate(MAX_IMPORT_ARRAY_LEN);
        self.session
            .conversation_highlights
            .truncate(MAX_IMPORT_ARRAY_LEN);
        self.session.mood_history.truncate(MAX_IMPORT_ARRAY_LEN);
        self.session
            .active_time_bands
            .truncate(MAX_IMPORT_ARRAY_LEN);

        // Truncate individual string values within arrays.
        for topic in &mut self.session.topics {
            truncate_string(topic, MAX_IMPORT_TOPIC_LEN);
        }

        if let Some(ref mut name) = self.session.user_name {
            truncate_string(name, MAX_IMPORT_STRING_LEN);
        }

        if let Some(chat_history) = &mut self.chat_history {
            if chat_history.len() > MAX_IMPORT_CHAT_HISTORY_LEN {
                let excess = chat_history.len() - MAX_IMPORT_CHAT_HISTORY_LEN;
                chat_history.drain(..excess);
            }

            for message in chat_history {
                let normalized_role = message.role.trim().to_ascii_lowercase();
                message.role = if normalized_role == "user" {
                    "user".to_string()
                } else {
                    "assistant".to_string()
                };
                truncate_string(&mut message.content, MAX_IMPORT_CHAT_MESSAGE_LEN);
            }
        }

        Ok(())
    }

    /// Export to file at the given path.
    pub fn save_to_file(&self, path: &std::path::Path) -> Result<(), String> {
        let json = self.to_json()?;
        std::fs::write(path, json).map_err(|e| format!("failed to write export file: {e}"))
    }

    /// Import from file at the given path.
    pub fn load_from_file(path: &std::path::Path) -> Result<Self, String> {
        let metadata =
            std::fs::metadata(path).map_err(|e| format!("failed to inspect import file: {e}"))?;
        if metadata.len() > MAX_IMPORT_FILE_BYTES {
            return Err(format!(
                "import file too large: {} bytes (limit: {} bytes)",
                metadata.len(),
                MAX_IMPORT_FILE_BYTES
            ));
        }
        let json = std::fs::read_to_string(path)
            .map_err(|e| format!("failed to read import file: {e}"))?;
        Self::from_json(&json)
    }
}

fn truncate_string(s: &mut String, max_len: usize) {
    if s.len() > max_len {
        // Truncate at a char boundary.
        let end = s
            .char_indices()
            .take_while(|(i, _)| *i < max_len)
            .last()
            .map(|(i, c)| i + c.len_utf8())
            .unwrap_or(0);
        s.truncate(end);
    }
}

/// ISO 8601 timestamp without external chrono dependency.
fn chrono_iso_now() -> String {
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = dur.as_secs();
    // Simple epoch-to-ISO conversion (UTC)
    let days = secs / 86400;
    let time_secs = secs % 86400;
    let hours = time_secs / 3600;
    let minutes = (time_secs % 3600) / 60;
    let seconds = time_secs % 60;

    // Gauss algorithm for date from day count since 1970-01-01
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    format!("{y:04}-{m:02}-{d:02}T{hours:02}:{minutes:02}:{seconds:02}Z")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_session() -> SessionMemory {
        let mut mem = SessionMemory::default();
        mem.update("My name is Alice", "greet", "playful");
        mem.update("tell me about cats", "help", "curious");
        mem.update("I love strawberry mochi", "help", "playful");
        mem.update("I'm learning Tauri", "think", "curious");
        mem
    }

    fn sample_personality() -> PersonalityConfig {
        PersonalityConfig::default_for_species("rabbit_v2")
    }

    fn sample_provider() -> ProviderConfig {
        ProviderConfig::default()
    }

    #[test]
    fn round_trip_json() {
        let exported = PortableMemory::export(
            &sample_session(),
            &sample_personality(),
            &sample_provider(),
            "rabbit_v2",
            None,
        );
        let json = exported.to_json().unwrap();
        let imported = PortableMemory::from_json(&json).unwrap();

        assert_eq!(imported.format_version, 3);
        assert_eq!(imported.session.user_name, Some("Alice".to_string()));
        assert_eq!(imported.session.topics, vec!["cats"]);
        assert_eq!(imported.session.preferences.len(), 1);
        assert_eq!(
            imported.session.preferences[0].summary(),
            "loves strawberry mochi"
        );
        assert_eq!(imported.session.preferences[0].mentions, 1);
        assert_eq!(imported.session.conversation_highlights.len(), 1);
        assert_eq!(
            imported.session.conversation_highlights[0].summary,
            "Learning Tauri".to_string()
        );
        assert_eq!(
            imported.session.conversation_highlights[0].category,
            "progress".to_string()
        );
        assert!(imported.session.first_message_at.is_some());
        assert!(imported.session.last_message_at.is_some());
        assert_eq!(imported.avatar_id, "rabbit_v2");
        assert_eq!(imported.personality.name, exported.personality.name);
        assert!(imported.chat_history.is_none());
    }

    #[test]
    fn rejects_future_version() {
        let mut exported = PortableMemory::export(
            &sample_session(),
            &sample_personality(),
            &sample_provider(),
            "cat_v1",
            None,
        );
        exported.format_version = 999;
        let json = exported.to_json().unwrap();
        let result = PortableMemory::from_json(&json);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unsupported format version"));
    }

    #[test]
    fn exported_at_is_iso_format() {
        let ts = chrono_iso_now();
        assert!(ts.ends_with('Z'));
        assert!(ts.contains('T'));
        assert_eq!(ts.len(), 20); // YYYY-MM-DDTHH:MM:SSZ
    }

    #[test]
    fn file_round_trip() {
        let exported = PortableMemory::export(
            &sample_session(),
            &sample_personality(),
            &sample_provider(),
            "fox_v2",
            None,
        );
        let dir = std::env::temp_dir().join("tokki_test_portable");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test_export.json");

        exported.save_to_file(&path).unwrap();
        let imported = PortableMemory::load_from_file(&path).unwrap();

        assert_eq!(imported.avatar_id, "fox_v2");
        assert_eq!(imported.session.message_count, 4);

        // Cleanup
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn export_does_not_include_api_keys() {
        let mut provider = sample_provider();
        provider.api_key = Some("tokki-secret-key".to_string());

        let exported = PortableMemory::export(
            &sample_session(),
            &sample_personality(),
            &provider,
            "rabbit_v2",
            None,
        );
        let json = exported.to_json().expect("serialize");
        assert!(!json.contains("tokki-secret-key"));
        assert!(!json.contains("api_key"));
    }

    #[test]
    fn load_from_file_rejects_oversized_imports() {
        let dir = std::env::temp_dir().join("tokki_test_portable_large");
        std::fs::create_dir_all(&dir).expect("create dir");
        let path = dir.join("too_large.json");
        let oversized = "x".repeat((MAX_IMPORT_FILE_BYTES as usize) + 1);
        std::fs::write(&path, oversized).expect("write oversized file");

        let result = PortableMemory::load_from_file(&path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("import file too large"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn loads_v1_export_with_defaulted_richer_memory() {
        let legacy = r#"{
          "format_version": 1,
          "exported_at": "2026-01-01T00:00:00Z",
          "session": {
            "user_name": "Alice",
            "topics": ["cats"],
            "message_count": 2,
            "greet_count": 1,
            "mood_trend": "curious"
          },
          "personality": {
            "name": "Tokki",
            "preset": "gentle",
            "humor": 50,
            "reaction_intensity": 50,
            "chattiness": 50
          },
          "provider": {
            "provider": "offline",
            "endpoint": null,
            "model": null,
            "max_tokens": 256,
            "temperature": 0.7
          },
          "avatar_id": "rabbit_v2"
        }"#;

        let imported = PortableMemory::from_json(legacy).expect("legacy export should load");
        assert_eq!(imported.format_version, 1);
        assert_eq!(imported.session.user_name, Some("Alice".to_string()));
        assert!(imported.session.preferences.is_empty());
        assert!(imported.session.profile_facts.is_empty());
        assert!(imported.session.conversation_highlights.is_empty());
        assert!(imported.session.mood_history.is_empty());
        assert!(imported.session.active_time_bands.is_empty());
        assert!(imported.session.first_message_at.is_none());
        assert!(imported.session.last_message_at.is_none());
    }

    #[test]
    fn rejects_empty_avatar_id() {
        let mut exported = PortableMemory::export(
            &sample_session(),
            &sample_personality(),
            &sample_provider(),
            "rabbit_v2",
            None,
        );
        exported.avatar_id = "  ".to_string();
        let json = exported.to_json().unwrap();
        let result = PortableMemory::from_json(&json);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("avatar_id is required"));
    }

    #[test]
    fn clamps_out_of_range_personality_values() {
        let json = r#"{
          "format_version": 2,
          "exported_at": "2026-01-01T00:00:00Z",
          "session": {},
          "personality": {
            "name": "Tokki",
            "preset": "gentle",
            "humor": 255,
            "reaction_intensity": 200,
            "chattiness": 999
          },
          "provider": {
            "provider": "offline",
            "endpoint": null,
            "model": null,
            "max_tokens": 256,
            "temperature": 0.7
          },
          "avatar_id": "rabbit_v1"
        }"#;

        let imported = PortableMemory::from_json(json).expect("should load and clamp");
        assert_eq!(imported.personality.humor, 100);
        assert_eq!(imported.personality.reaction_intensity, 100);
        assert_eq!(imported.personality.chattiness, 100);
        assert_eq!(imported.avatar_id, "rabbit_v2");
    }

    #[test]
    fn clamps_out_of_range_provider_values() {
        let json = r#"{
          "format_version": 2,
          "exported_at": "2026-01-01T00:00:00Z",
          "session": {},
          "personality": {
            "name": "Tokki",
            "preset": "gentle",
            "humor": 50,
            "reaction_intensity": 50,
            "chattiness": 50
          },
          "provider": {
            "provider": "offline",
            "endpoint": null,
            "model": null,
            "max_tokens": 999999,
            "temperature": 99.0
          },
          "avatar_id": "rabbit_v1"
        }"#;

        let imported = PortableMemory::from_json(json).expect("should load and clamp");
        assert_eq!(imported.provider.max_tokens, 8192);
        assert!((imported.provider.temperature - 2.0).abs() < f64::EPSILON);
        assert_eq!(imported.avatar_id, "rabbit_v2");
    }

    #[test]
    fn truncates_oversized_strings() {
        let long_name = "A".repeat(500);
        let json = format!(
            r#"{{
              "format_version": 2,
              "exported_at": "2026-01-01T00:00:00Z",
              "session": {{ "user_name": "{long_name}" }},
              "personality": {{
                "name": "{long_name}",
                "preset": "gentle",
                "humor": 50,
                "reaction_intensity": 50,
                "chattiness": 50
              }},
              "provider": {{
                "provider": "offline",
                "endpoint": null,
                "model": null,
                "max_tokens": 256,
                "temperature": 0.7
              }},
              "avatar_id": "rabbit_v1"
            }}"#
        );

        let imported = PortableMemory::from_json(&json).expect("should load and truncate");
        assert_eq!(imported.avatar_id, "rabbit_v2");
        assert!(imported.personality.name.len() <= MAX_IMPORT_STRING_LEN);
        assert!(
            imported
                .session
                .user_name
                .as_ref()
                .map(|n| n.len())
                .unwrap_or(0)
                <= MAX_IMPORT_STRING_LEN
        );
    }

    #[test]
    fn truncates_oversized_arrays() {
        let many_topics: Vec<String> = (0..100).map(|i| format!("topic_{i}")).collect();
        let mut mem = SessionMemory::default();
        mem.topics = many_topics;

        let exported = PortableMemory::export(
            &mem,
            &sample_personality(),
            &sample_provider(),
            "rabbit_v2",
            None,
        );
        let json = exported.to_json().unwrap();
        let imported = PortableMemory::from_json(&json).expect("should load and truncate");
        assert!(imported.session.topics.len() <= MAX_IMPORT_ARRAY_LEN);
    }

    #[test]
    fn export_can_include_chat_history() {
        let history = vec![
            ChatMessage {
                role: "user".to_string(),
                content: "Hi Tokki".to_string(),
                timestamp: 1,
            },
            ChatMessage {
                role: "assistant".to_string(),
                content: "Hello friend".to_string(),
                timestamp: 2,
            },
        ];

        let exported = PortableMemory::export(
            &sample_session(),
            &sample_personality(),
            &sample_provider(),
            "rabbit_v2",
            Some(&history),
        );

        let json = exported.to_json().expect("serialize");
        let imported = PortableMemory::from_json(&json).expect("deserialize");
        let imported_history = imported
            .chat_history
            .expect("chat history should be present");
        assert_eq!(imported_history.len(), 2);
        assert_eq!(imported_history[0].content, "Hi Tokki");
        assert_eq!(imported_history[1].role, "assistant");
    }

    #[test]
    fn import_sanitizes_chat_history() {
        let long_message = "A".repeat(MAX_IMPORT_CHAT_MESSAGE_LEN + 100);
        let chat_json = (0..210)
            .map(|index| {
                let role = if index == 0 { " USER " } else { "mystery" };
                format!(r#"{{"role":"{role}","content":"{long_message}","timestamp":{index}}}"#)
            })
            .collect::<Vec<_>>()
            .join(",");
        let json = format!(
            r#"{{
              "format_version": 3,
              "exported_at": "2026-01-01T00:00:00Z",
              "session": {{}},
              "personality": {{
                "name": "Tokki",
                "preset": "gentle",
                "humor": 50,
                "reaction_intensity": 50,
                "chattiness": 50
              }},
              "provider": {{
                "provider": "offline",
                "endpoint": null,
                "model": null,
                "max_tokens": 256,
                "temperature": 0.7
              }},
              "avatar_id": "rabbit_v2",
              "chat_history": [{chat_json}]
            }}"#
        );

        let imported = PortableMemory::from_json(&json).expect("should load and sanitize");
        let chat_history = imported
            .chat_history
            .expect("chat history should be present");
        assert_eq!(chat_history.len(), MAX_IMPORT_CHAT_HISTORY_LEN);
        assert_eq!(chat_history[0].timestamp, 10);
        assert_eq!(chat_history[0].role, "assistant");
        assert!(chat_history[0].content.len() <= MAX_IMPORT_CHAT_MESSAGE_LEN);
    }

    #[test]
    fn normalizes_removed_avatar_ids_to_supported_variants() {
        let json = r#"{
          "format_version": 2,
          "exported_at": "2026-01-01T00:00:00Z",
          "session": {},
          "personality": {
            "name": "Sol",
            "preset": "radiant",
            "humor": 50,
            "reaction_intensity": 75,
            "chattiness": 50
          },
          "provider": {
            "provider": "offline",
            "endpoint": null,
            "model": null,
            "max_tokens": 256,
            "temperature": 0.7
          },
          "avatar_id": "phoenix_v1"
        }"#;

        let imported = PortableMemory::from_json(json).expect("legacy avatar should normalize");
        assert_eq!(imported.avatar_id, "rabbit_v2");
        assert_eq!(imported.personality.name, "Sol");
        assert_eq!(imported.personality.preset, "radiant");
    }

    #[test]
    fn rejects_invalid_json() {
        let result = PortableMemory::from_json("not json at all");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("invalid portable memory JSON"));
    }

    #[test]
    fn rejects_empty_json_object() {
        let result = PortableMemory::from_json("{}");
        assert!(result.is_err());
    }
}
