use serde::{Deserialize, Deserializer, Serialize, Serializer};

fn clamp_percentage(value: i64) -> u8 {
    value.clamp(0, 100) as u8
}

fn deserialize_percentage<'de, D>(deserializer: D) -> Result<u8, D::Error>
where
    D: Deserializer<'de>,
{
    let value = i64::deserialize(deserializer)?;
    Ok(clamp_percentage(value))
}

fn serialize_percentage<S>(value: &u8, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_u8((*value).min(100))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Mood {
    Idle,
    Curious,
    Playful,
    Sleepy,
    Surprised,
}

// ── Personality System ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PersonalityPreset {
    Gentle,
    Aloof,
    Clever,
    Proud,
    Radiant,
    Mystical,
    Stoic,
    Cheerful,
    Wise,
    Serene,
}

impl PersonalityPreset {
    /// Short descriptor used in prompts.
    pub fn descriptor(&self) -> &'static str {
        match self {
            Self::Gentle => "gentle and a little nervous",
            Self::Aloof => "aloof and mysterious",
            Self::Clever => "clever and mischievous",
            Self::Proud => "proud and dramatic",
            Self::Radiant => "radiant and warm",
            Self::Mystical => "mystical and enigmatic",
            Self::Stoic => "stoic but caring",
            Self::Cheerful => "cheerful and bubbly",
            Self::Wise => "wise and contemplative",
            Self::Serene => "serene and patient",
        }
    }

    /// Default vocabulary seasoning for this personality.
    pub fn vocabulary_hint(&self) -> &'static str {
        match self {
            Self::Gentle => "Use soft words, ellipses, gentle humor",
            Self::Aloof => "Be terse, slightly sarcastic, occasionally sweet",
            Self::Clever => "Be witty, use wordplay, drop subtle jokes",
            Self::Proud => "Be grandiose, use dramatic flair, royal 'we' sometimes",
            Self::Radiant => "Be warm, uplifting, use light/fire metaphors",
            Self::Mystical => "Be cryptic, use riddles, reference stars and fate",
            Self::Stoic => "Be calm, measured, few words but meaningful",
            Self::Cheerful => "Be enthusiastic, use exclamation marks, very friendly",
            Self::Wise => "Be thoughtful, reference nature, give gentle advice",
            Self::Serene => "Be peaceful, unhurried, use water/nature imagery",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PersonalityConfig {
    /// Display name the user gave the pet (e.g. "Mochi").
    pub name: String,
    /// Behavioral personality preset.
    pub preset: PersonalityPreset,
    /// Humor dial 0-100 (0 = dead serious, 100 = TARS at max).
    #[serde(
        serialize_with = "serialize_percentage",
        deserialize_with = "deserialize_percentage"
    )]
    pub humor: u8,
    /// Reaction intensity multiplier — affects animation duration scaling.
    /// 50 = normal, 0 = subdued, 100 = exaggerated.
    #[serde(
        serialize_with = "serialize_percentage",
        deserialize_with = "deserialize_percentage"
    )]
    pub reaction_intensity: u8,
    /// How often Tokki initiates idle chat (0 = never, 100 = frequently).
    #[serde(
        serialize_with = "serialize_percentage",
        deserialize_with = "deserialize_percentage"
    )]
    pub chattiness: u8,
}

pub fn normalize_avatar_id(avatar_id: &str) -> &str {
    match avatar_id {
        "rabbit_v1" => "rabbit_v2",
        "cat_v2" => "cat_v1",
        "fox_v1" => "fox_v2",
        "phoenix_v1" | "serpent_v1" | "turtle_v1" => "rabbit_v2",
        _ => avatar_id,
    }
}

impl PersonalityConfig {
    pub fn default_for_species(species: &str) -> Self {
        match normalize_avatar_id(species) {
            "rabbit_v2" => Self {
                name: "Bun".into(),
                preset: PersonalityPreset::Gentle,
                humor: 40,
                reaction_intensity: 60,
                chattiness: 45,
            },
            "cat_v1" => Self {
                name: "Mochi".into(),
                preset: PersonalityPreset::Aloof,
                humor: 55,
                reaction_intensity: 40,
                chattiness: 25,
            },
            "fox_v2" => Self {
                name: "Ember".into(),
                preset: PersonalityPreset::Clever,
                humor: 70,
                reaction_intensity: 65,
                chattiness: 55,
            },
            "dog_v1" => Self {
                name: "Scout".into(),
                preset: PersonalityPreset::Cheerful,
                humor: 60,
                reaction_intensity: 80,
                chattiness: 70,
            },
            "dragon_v1" => Self {
                name: "Ignis".into(),
                preset: PersonalityPreset::Proud,
                humor: 45,
                reaction_intensity: 90,
                chattiness: 35,
            },
            "kitsune_v1" => Self {
                name: "Yuki".into(),
                preset: PersonalityPreset::Mystical,
                humor: 65,
                reaction_intensity: 55,
                chattiness: 40,
            },
            "penguin_v1" => Self {
                name: "Pip".into(),
                preset: PersonalityPreset::Cheerful,
                humor: 75,
                reaction_intensity: 70,
                chattiness: 60,
            },
            "owl_v1" => Self {
                name: "Athena".into(),
                preset: PersonalityPreset::Wise,
                humor: 50,
                reaction_intensity: 50,
                chattiness: 30,
            },
            _ => Self {
                name: "Tokki".into(),
                preset: PersonalityPreset::Gentle,
                humor: 50,
                reaction_intensity: 50,
                chattiness: 40,
            },
        }
    }

    /// Build the personality fragment injected into the LLM system prompt.
    pub fn to_prompt_fragment(&self) -> String {
        let humor = self.humor.min(100);
        let humor_desc = match humor {
            0..=20 => "very serious, rarely joke",
            21..=40 => "mostly serious with occasional dry humor",
            41..=60 => "balanced humor, natural and warm",
            61..=80 => "frequently funny, witty remarks",
            81..=100 => "maximum humor like TARS — almost everything is a quip",
            _ => "balanced humor",
        };

        format!(
            "\nYour name is {name}. You are {descriptor}. \
             Humor level: {humor}/100 ({humor_desc}). \
             {vocab}\n",
            name = self.name,
            descriptor = self.preset.descriptor(),
            humor = humor,
            humor_desc = humor_desc,
            vocab = self.preset.vocabulary_hint(),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BehaviorAction {
    pub id: String,
    pub animation: String,
    pub mood: Mood,
    pub duration_ms: u64,
    pub interruptible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TokkiState {
    pub current_action: BehaviorAction,
    pub queue: Vec<BehaviorAction>,
    pub energy: u8,
    pub last_interaction_at: u64,
    pub tick_count: u64,
    /// How many consecutive ticks had user interactions (resets on idle tick).
    #[serde(default)]
    pub consecutive_interactions: u32,
}

impl TokkiState {
    pub fn initial() -> Self {
        Self {
            current_action: BehaviorAction {
                id: "idle_blink".to_string(),
                animation: "idle.blink".to_string(),
                mood: Mood::Idle,
                duration_ms: 1_000,
                interruptible: true,
            },
            queue: Vec::new(),
            energy: 70,
            last_interaction_at: 0,
            tick_count: 0,
            consecutive_interactions: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransitionReason {
    Timer,
    Interaction,
    Recovery,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UserEventType {
    Click,
    Hover,
    DragStart,
    DragEnd,
    Poke,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UserEvent {
    #[serde(rename = "type")]
    pub kind: UserEventType,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BehaviorTickPayload {
    pub state: TokkiState,
    pub reason: TransitionReason,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_personality_rabbit() {
        let p = PersonalityConfig::default_for_species("rabbit_v2");
        assert_eq!(p.name, "Bun");
        assert_eq!(p.preset, PersonalityPreset::Gentle);
        assert_eq!(p.humor, 40);
    }

    #[test]
    fn default_personality_cat() {
        let p = PersonalityConfig::default_for_species("cat_v1");
        assert_eq!(p.name, "Mochi");
        assert_eq!(p.preset, PersonalityPreset::Aloof);
    }

    #[test]
    fn default_personality_unknown_species() {
        let p = PersonalityConfig::default_for_species("unicorn_v1");
        assert_eq!(p.name, "Tokki");
        assert_eq!(p.preset, PersonalityPreset::Gentle);
    }

    #[test]
    fn prompt_fragment_contains_name_and_descriptor() {
        let p = PersonalityConfig::default_for_species("fox_v2");
        let frag = p.to_prompt_fragment();
        assert!(frag.contains("Ember"));
        assert!(frag.contains("clever and mischievous"));
        assert!(frag.contains("70/100"));
    }

    #[test]
    fn prompt_fragment_humor_description() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        p.humor = 95;
        let frag = p.to_prompt_fragment();
        assert!(frag.contains("maximum humor like TARS"));
    }

    #[test]
    fn all_species_have_unique_names() {
        let species = [
            "rabbit_v2",
            "cat_v1",
            "fox_v2",
            "dog_v1",
            "dragon_v1",
            "kitsune_v1",
            "penguin_v1",
            "owl_v1",
        ];
        for s in species {
            let p = PersonalityConfig::default_for_species(s);
            assert!(!p.name.is_empty());
        }
    }

    #[test]
    fn personality_preset_descriptor_nonempty() {
        let presets = [
            PersonalityPreset::Gentle,
            PersonalityPreset::Aloof,
            PersonalityPreset::Clever,
            PersonalityPreset::Proud,
            PersonalityPreset::Radiant,
            PersonalityPreset::Mystical,
            PersonalityPreset::Stoic,
            PersonalityPreset::Cheerful,
            PersonalityPreset::Wise,
            PersonalityPreset::Serene,
        ];
        for p in presets {
            assert!(!p.descriptor().is_empty());
            assert!(!p.vocabulary_hint().is_empty());
        }
    }

    #[test]
    fn personality_config_deserialize_clamps_dials() {
        let config: PersonalityConfig = serde_json::from_str(
            r#"{
                "name": "Tokki",
                "preset": "gentle",
                "humor": 250,
                "reaction_intensity": 101,
                "chattiness": -5
            }"#,
        )
        .expect("personality should deserialize");

        assert_eq!(config.humor, 100);
        assert_eq!(config.reaction_intensity, 100);
        assert_eq!(config.chattiness, 0);
    }

    #[test]
    fn personality_config_serialize_clamps_dials() {
        let config = PersonalityConfig {
            name: "Tokki".into(),
            preset: PersonalityPreset::Gentle,
            humor: 250,
            reaction_intensity: 200,
            chattiness: 150,
        };

        let value = serde_json::to_value(config).expect("personality should serialize");

        assert_eq!(value["humor"], serde_json::json!(100));
        assert_eq!(value["reaction_intensity"], serde_json::json!(100));
        assert_eq!(value["chattiness"], serde_json::json!(100));
    }

    #[test]
    fn prompt_fragment_clamps_out_of_range_humor() {
        let mut p = PersonalityConfig::default_for_species("rabbit_v2");
        p.humor = 255;

        let frag = p.to_prompt_fragment();

        assert!(frag.contains("100/100"));
        assert!(frag.contains("maximum humor like TARS"));
    }

    #[test]
    fn legacy_avatar_ids_normalize_to_supported_variants() {
        assert_eq!(normalize_avatar_id("rabbit_v1"), "rabbit_v2");
        assert_eq!(normalize_avatar_id("cat_v2"), "cat_v1");
        assert_eq!(normalize_avatar_id("fox_v1"), "fox_v2");
        assert_eq!(normalize_avatar_id("phoenix_v1"), "rabbit_v2");
        assert_eq!(normalize_avatar_id("serpent_v1"), "rabbit_v2");
        assert_eq!(normalize_avatar_id("turtle_v1"), "rabbit_v2");
    }
}
