use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_TOPICS: usize = 8;
const MAX_PREFERENCES: usize = 8;
const MAX_HIGHLIGHTS: usize = 6;
const MAX_MOOD_HISTORY: usize = 6;
const MAX_PROFILE_FACTS: usize = 8;
const MAX_ACTIVE_TIME_BANDS: usize = 4;
const MAX_MEMORY_VALUE_LEN: usize = 60;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct MemoryPreference {
    pub label: String,
    pub value: String,
    pub mentions: u32,
    pub last_mentioned_at: Option<u64>,
}

impl MemoryPreference {
    pub fn summary(&self) -> String {
        match (self.label.trim(), self.value.trim()) {
            ("", "") => String::new(),
            ("", value) => value.to_string(),
            (label, "") => label.to_string(),
            (label, value) => format!("{label} {value}"),
        }
    }

    fn mention_count(&self) -> u32 {
        self.mentions.max(1)
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct MemoryHighlight {
    pub summary: String,
    pub category: String,
    pub captured_at: Option<u64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct MemoryProfileFact {
    pub facet: String,
    pub value: String,
    pub mentions: u32,
    pub last_updated_at: Option<u64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(default)]
pub struct ActiveTimeBand {
    pub band: String,
    pub count: u32,
    pub last_seen_at: Option<u64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct SessionMemory {
    pub user_name: Option<String>,
    pub topics: Vec<String>,
    pub preferences: Vec<MemoryPreference>,
    pub profile_facts: Vec<MemoryProfileFact>,
    pub conversation_highlights: Vec<MemoryHighlight>,
    pub mood_history: Vec<String>,
    pub active_time_bands: Vec<ActiveTimeBand>,
    pub first_message_at: Option<u64>,
    pub last_message_at: Option<u64>,
    pub message_count: u32,
    pub greet_count: u32,
    pub mood_trend: String,
}

impl SessionMemory {
    pub fn update(&mut self, user_msg: &str, intent: &str, mood: &str) {
        self.update_with_timestamp(user_msg, intent, mood, current_unix_millis());
    }

    pub fn update_with_timestamp(
        &mut self,
        user_msg: &str,
        intent: &str,
        mood: &str,
        timestamp_ms: u64,
    ) {
        self.message_count += 1;
        self.first_message_at.get_or_insert(timestamp_ms);
        self.last_message_at = Some(timestamp_ms);
        register_active_time_band(&mut self.active_time_bands, timestamp_ms);

        if intent == "greet" {
            self.greet_count += 1;
        }

        if let Some(clean_mood) = normalize_memory_value(mood) {
            self.mood_trend = clean_mood.clone();
            push_recent_value(&mut self.mood_history, clean_mood, MAX_MOOD_HISTORY);
        } else {
            self.mood_trend.clear();
        }

        if self.user_name.is_none() {
            self.user_name = extract_user_name(user_msg);
        }

        if let Some(topic) = extract_topic(user_msg) {
            push_unique_recent(&mut self.topics, topic, MAX_TOPICS);
        }

        if let Some(preference) = extract_preference(user_msg) {
            upsert_preference(
                &mut self.preferences,
                preference,
                timestamp_ms,
                MAX_PREFERENCES,
            );
        }

        if let Some(profile_fact) = extract_profile_fact(user_msg) {
            upsert_profile_fact(
                &mut self.profile_facts,
                profile_fact,
                timestamp_ms,
                MAX_PROFILE_FACTS,
            );
        }

        if let Some(highlight) = extract_highlight(user_msg) {
            upsert_highlight(
                &mut self.conversation_highlights,
                highlight,
                timestamp_ms,
                MAX_HIGHLIGHTS,
            );
        }
    }

    pub fn to_context_string(&self) -> String {
        if self.message_count == 0 {
            return String::new();
        }

        let mut parts: Vec<String> = Vec::new();

        if let Some(ref name) = self.user_name {
            parts.push(format!("The user's name is {}.", name));
        }

        if !self.topics.is_empty() {
            parts.push(format!("Topics discussed: {}.", self.topics.join(", ")));
        }

        if !self.preferences.is_empty() {
            let preferences = self
                .preferences
                .iter()
                .map(MemoryPreference::summary)
                .filter(|summary| !summary.is_empty())
                .collect::<Vec<_>>()
                .join("; ");
            if !preferences.is_empty() {
                parts.push(format!("Known preferences: {}.", preferences));
            }

            let recurring = self
                .preferences
                .iter()
                .filter(|preference| preference.mention_count() > 1)
                .map(|preference| {
                    format!(
                        "{} ({} mentions)",
                        preference.summary(),
                        preference.mention_count()
                    )
                })
                .collect::<Vec<_>>()
                .join("; ");
            if !recurring.is_empty() {
                parts.push(format!("Recurring favorites: {}.", recurring));
            }
        }

        if !self.profile_facts.is_empty() {
            let profile_notes = self
                .profile_facts
                .iter()
                .rev()
                .take(4)
                .map(|fact| format!("{}: {}", profile_facet_label(&fact.facet), fact.value))
                .collect::<Vec<_>>()
                .join("; ");
            if !profile_notes.is_empty() {
                parts.push(format!("Profile notes: {}.", profile_notes));
            }
        }

        if !self.conversation_highlights.is_empty() {
            let highlights = self
                .conversation_highlights
                .iter()
                .map(|highlight| {
                    if highlight.category.trim().is_empty() {
                        highlight.summary.clone()
                    } else {
                        format!("{} ({})", highlight.summary, highlight.category)
                    }
                })
                .filter(|summary| !summary.is_empty())
                .collect::<Vec<_>>()
                .join("; ");
            if !highlights.is_empty() {
                parts.push(format!("Conversation highlights: {}.", highlights));
            }
        }

        if self.message_count > 1 {
            parts.push(format!(
                "You've shared {} messages together so far.",
                self.message_count
            ));
        }

        if let Some(primary_band) = self.active_time_bands.first() {
            if primary_band.count >= 2 {
                parts.push(format!("You usually chat in the {}.", primary_band.band));
            }
        }

        if self.mood_history.len() > 1 {
            parts.push(format!(
                "Your recent mood arc has been {}.",
                self.mood_history.join(" -> ")
            ));
        } else if !self.mood_trend.is_empty() && self.mood_trend != "idle" {
            parts.push(format!("Your recent mood has been {}.", self.mood_trend));
        }

        if parts.is_empty() {
            return String::new();
        }

        format!("\n[Session context: {}]", parts.join(" "))
    }
}

fn push_unique_recent<T: PartialEq>(items: &mut Vec<T>, value: T, max: usize) {
    if let Some(index) = items.iter().position(|existing| *existing == value) {
        items.remove(index);
    }
    while items.len() >= max {
        items.remove(0);
    }
    items.push(value);
}

fn push_recent_value(items: &mut Vec<String>, value: String, max: usize) {
    if items.last() == Some(&value) {
        return;
    }
    while items.len() >= max {
        items.remove(0);
    }
    items.push(value);
}

fn upsert_preference(
    items: &mut Vec<MemoryPreference>,
    mut preference: MemoryPreference,
    timestamp_ms: u64,
    max: usize,
) {
    preference.mentions = preference.mention_count();
    preference.last_mentioned_at = Some(timestamp_ms);
    let incoming_mentions = preference.mention_count();

    if let Some(index) = items
        .iter()
        .position(|existing| same_ignore_case(&existing.value, &preference.value))
    {
        let mut merged = items.remove(index);
        merged.label = preference.label;
        merged.mentions = merged.mention_count().saturating_add(incoming_mentions);
        merged.last_mentioned_at = Some(timestamp_ms);
        preference = merged;
    }

    while items.len() >= max {
        items.remove(0);
    }
    items.push(preference);
}

fn upsert_profile_fact(
    items: &mut Vec<MemoryProfileFact>,
    mut fact: MemoryProfileFact,
    timestamp_ms: u64,
    max: usize,
) {
    fact.mentions = fact.mentions.max(1);
    fact.last_updated_at = Some(timestamp_ms);

    if let Some(index) = items.iter().position(|existing| {
        same_ignore_case(&existing.facet, &fact.facet)
            && same_ignore_case(&existing.value, &fact.value)
    }) {
        let mut merged = items.remove(index);
        merged.mentions = merged.mentions.max(1).saturating_add(fact.mentions.max(1));
        merged.last_updated_at = Some(timestamp_ms);
        fact = merged;
    } else if is_single_value_facet(&fact.facet) {
        if let Some(index) = items
            .iter()
            .position(|existing| same_ignore_case(&existing.facet, &fact.facet))
        {
            items.remove(index);
        }
    }

    while items.len() >= max {
        items.remove(0);
    }
    items.push(fact);
}

fn upsert_highlight(
    items: &mut Vec<MemoryHighlight>,
    mut highlight: MemoryHighlight,
    timestamp_ms: u64,
    max: usize,
) {
    highlight.captured_at = Some(timestamp_ms);

    if let Some(index) = items
        .iter()
        .position(|existing| same_ignore_case(&existing.summary, &highlight.summary))
    {
        let mut merged = items.remove(index);
        if !highlight.category.is_empty() {
            merged.category = highlight.category;
        }
        merged.captured_at = Some(timestamp_ms);
        highlight = merged;
    }

    while items.len() >= max {
        items.remove(0);
    }
    items.push(highlight);
}

fn register_active_time_band(items: &mut Vec<ActiveTimeBand>, timestamp_ms: u64) {
    let band = infer_time_band(timestamp_ms).to_string();
    if let Some(existing) = items.iter_mut().find(|existing| existing.band == band) {
        existing.count = existing.count.saturating_add(1);
        existing.last_seen_at = Some(timestamp_ms);
    } else {
        items.push(ActiveTimeBand {
            band,
            count: 1,
            last_seen_at: Some(timestamp_ms),
        });
    }

    items.sort_by(|left, right| {
        right.count.cmp(&left.count).then_with(|| {
            right
                .last_seen_at
                .unwrap_or(0)
                .cmp(&left.last_seen_at.unwrap_or(0))
        })
    });
    items.truncate(MAX_ACTIVE_TIME_BANDS);
}

fn normalize_memory_value(value: &str) -> Option<String> {
    let collapsed = value.split_whitespace().collect::<Vec<_>>().join(" ");
    let trimmed = collapsed
        .trim()
        .trim_matches(|c: char| matches!(c, '"' | '\'' | ',' | ';' | ':' | '.' | '!' | '?'))
        .trim();

    if trimmed.is_empty() {
        return None;
    }

    let clipped = trimmed
        .chars()
        .take(MAX_MEMORY_VALUE_LEN)
        .collect::<String>();
    Some(clipped.trim().to_string())
}

fn capture_clause(msg: &str, start: usize) -> Option<String> {
    let after = msg.get(start..)?.trim_start();
    let fragment = after
        .chars()
        .take_while(|c| !matches!(c, '.' | '!' | '?' | '\n' | '\r'))
        .collect::<String>();
    normalize_memory_value(&fragment)
}

fn extract_user_name(msg: &str) -> Option<String> {
    let lower = msg.to_lowercase();

    for prefix in &[
        "my name is ",
        "i'm ",
        "i am ",
        "call me ",
        "they call me ",
        "name's ",
    ] {
        if let Some(pos) = lower.find(prefix) {
            let after = &msg[pos + prefix.len()..];
            let name = after
                .split(|c: char| !c.is_alphanumeric() && c != '\'' && c != '-')
                .next()
                .unwrap_or("")
                .trim();
            if !name.is_empty() && name.len() <= 30 {
                if (*prefix == "i'm " || *prefix == "i am ")
                    && matches!(
                        name.to_ascii_lowercase().as_str(),
                        "from"
                            | "feeling"
                            | "working"
                            | "learning"
                            | "trying"
                            | "excited"
                            | "happy"
                            | "sad"
                            | "tired"
                            | "a"
                            | "an"
                            | "the"
                    )
                {
                    continue;
                }
                return Some(name.to_string());
            }
        }
    }

    None
}

fn extract_topic(msg: &str) -> Option<String> {
    let lower = msg.to_lowercase();

    for prefix in &[
        "tell me about ",
        "what is ",
        "what's ",
        "what are ",
        "how does ",
        "how do ",
        "explain ",
        "help me with ",
        "i need help with ",
        "let's talk about ",
    ] {
        if let Some(pos) = lower.find(prefix) {
            return capture_clause(msg, pos + prefix.len());
        }
    }

    None
}

fn extract_preference(msg: &str) -> Option<MemoryPreference> {
    let lower = msg.to_lowercase();

    for (prefix, label) in [
        ("i love ", "loves"),
        ("i like ", "likes"),
        ("i enjoy ", "enjoys"),
        ("i prefer ", "prefers"),
        ("i dislike ", "dislikes"),
        ("i hate ", "avoids"),
        ("my favorite ", "favorite"),
        ("my favourite ", "favourite"),
    ] {
        if let Some(pos) = lower.find(prefix) {
            let value = capture_clause(msg, pos + prefix.len())?;
            return Some(MemoryPreference {
                label: label.to_string(),
                value,
                mentions: 1,
                last_mentioned_at: None,
            });
        }
    }

    None
}

fn extract_profile_fact(msg: &str) -> Option<MemoryProfileFact> {
    let lower = msg.to_lowercase();

    for (prefix, facet) in [
        ("my pronouns are ", "pronouns"),
        ("i live in ", "location"),
        ("i'm from ", "origin"),
        ("i am from ", "origin"),
        ("i work as ", "occupation"),
        ("my job is ", "occupation"),
        ("i work at ", "workplace"),
        ("i'm studying ", "study_focus"),
        ("i am studying ", "study_focus"),
        ("my goal is ", "goal"),
        ("i'm trying to ", "goal"),
        ("i am trying to ", "goal"),
        ("every morning i ", "routine_morning"),
        ("every evening i ", "routine_evening"),
        ("before bed i ", "routine_night"),
        ("after work i ", "routine_after_work"),
    ] {
        if let Some(pos) = lower.find(prefix) {
            let value = capture_clause(msg, pos + prefix.len())?;
            return Some(MemoryProfileFact {
                facet: facet.to_string(),
                value,
                mentions: 1,
                last_updated_at: None,
            });
        }
    }

    None
}

fn extract_highlight(msg: &str) -> Option<MemoryHighlight> {
    let lower = msg.to_lowercase();

    for (prefix, lead_in, category) in [
        ("i'm working on ", "Working on", "progress"),
        ("i am working on ", "Working on", "progress"),
        ("i'm learning ", "Learning", "progress"),
        ("i am learning ", "Learning", "progress"),
        ("i'm excited about ", "Excited about", "emotion"),
        ("i am excited about ", "Excited about", "emotion"),
        ("i'm feeling ", "Feeling", "emotion"),
        ("i am feeling ", "Feeling", "emotion"),
        ("i feel ", "Feeling", "emotion"),
        ("i want to ", "Wants to", "plan"),
        ("i need to ", "Needs to", "plan"),
        ("today i ", "Today", "moment"),
    ] {
        if let Some(pos) = lower.find(prefix) {
            let value = capture_clause(msg, pos + prefix.len())?;
            let summary = if lead_in == "Today" {
                format!("{lead_in}: {value}")
            } else {
                format!("{lead_in} {value}")
            };
            return Some(MemoryHighlight {
                summary,
                category: category.to_string(),
                captured_at: None,
            });
        }
    }

    None
}

fn is_single_value_facet(facet: &str) -> bool {
    matches!(
        facet,
        "pronouns" | "location" | "origin" | "occupation" | "workplace" | "study_focus" | "goal"
    )
}

fn profile_facet_label(facet: &str) -> &str {
    match facet {
        "pronouns" => "pronouns",
        "location" => "location",
        "origin" => "origin",
        "occupation" => "occupation",
        "workplace" => "workplace",
        "study_focus" => "study focus",
        "goal" => "goal",
        "routine_morning" => "morning routine",
        "routine_evening" => "evening routine",
        "routine_night" => "night routine",
        "routine_after_work" => "after-work routine",
        _ => facet,
    }
}

fn infer_time_band(timestamp_ms: u64) -> &'static str {
    let seconds = timestamp_ms / 1_000;
    let hour = ((seconds % 86_400) / 3_600) as u8;
    match hour {
        5..=11 => "morning",
        12..=16 => "afternoon",
        17..=21 => "evening",
        _ => "night",
    }
}

fn current_unix_millis() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_millis() as u64,
        Err(_) => 0,
    }
}

fn same_ignore_case(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_name_from_introduction() {
        assert_eq!(
            extract_user_name("My name is Alice"),
            Some("Alice".to_string())
        );
        assert_eq!(extract_user_name("I'm Bob"), Some("Bob".to_string()));
        assert_eq!(
            extract_user_name("call me Charlie!"),
            Some("Charlie".to_string())
        );
    }

    #[test]
    fn no_name_from_unrelated_text() {
        assert_eq!(extract_user_name("Hello there!"), None);
        assert_eq!(extract_user_name("How are you?"), None);
        assert_eq!(extract_user_name("I'm from Lisbon"), None);
    }

    #[test]
    fn extracts_topic_from_question() {
        assert_eq!(
            extract_topic("tell me about rust programming"),
            Some("rust programming".to_string())
        );
        assert_eq!(
            extract_topic("what is machine learning?"),
            Some("machine learning".to_string())
        );
    }

    #[test]
    fn extracts_preference_from_statement() {
        assert_eq!(
            extract_preference("I love rainy evenings."),
            Some(MemoryPreference {
                label: "loves".to_string(),
                value: "rainy evenings".to_string(),
                mentions: 1,
                last_mentioned_at: None,
            })
        );
        assert_eq!(
            extract_preference("My favorite snack is mochi"),
            Some(MemoryPreference {
                label: "favorite".to_string(),
                value: "snack is mochi".to_string(),
                mentions: 1,
                last_mentioned_at: None,
            })
        );
    }

    #[test]
    fn extracts_highlight_from_progress_update() {
        assert_eq!(
            extract_highlight("I'm learning Rust for desktop apps."),
            Some(MemoryHighlight {
                summary: "Learning Rust for desktop apps".to_string(),
                category: "progress".to_string(),
                captured_at: None,
            })
        );
        assert_eq!(
            extract_highlight("I feel proud today"),
            Some(MemoryHighlight {
                summary: "Feeling proud today".to_string(),
                category: "emotion".to_string(),
                captured_at: None,
            })
        );
    }

    #[test]
    fn extracts_profile_fact() {
        assert_eq!(
            extract_profile_fact("My pronouns are they/them"),
            Some(MemoryProfileFact {
                facet: "pronouns".to_string(),
                value: "they/them".to_string(),
                mentions: 1,
                last_updated_at: None,
            })
        );
        assert_eq!(
            extract_profile_fact("I live in Lisbon."),
            Some(MemoryProfileFact {
                facet: "location".to_string(),
                value: "Lisbon".to_string(),
                mentions: 1,
                last_updated_at: None,
            })
        );
    }

    #[test]
    fn no_topic_from_greeting() {
        assert_eq!(extract_topic("hello!"), None);
        assert_eq!(extract_topic("hi there"), None);
    }

    #[test]
    fn session_memory_updates() {
        let mut mem = SessionMemory::default();
        mem.update_with_timestamp("My name is Alice", "greet", "playful", 10_000);
        assert_eq!(mem.user_name, Some("Alice".to_string()));
        assert_eq!(mem.greet_count, 1);
        assert_eq!(mem.message_count, 1);

        mem.update_with_timestamp("tell me about cats", "help", "curious", 20_000);
        assert_eq!(mem.topics, vec!["cats"]);
        assert_eq!(mem.message_count, 2);

        mem.update_with_timestamp("I enjoy chamomile tea", "help", "sleepy", 30_000);
        assert_eq!(
            mem.preferences,
            vec![MemoryPreference {
                label: "enjoys".to_string(),
                value: "chamomile tea".to_string(),
                mentions: 1,
                last_mentioned_at: Some(30_000),
            }]
        );

        mem.update_with_timestamp(
            "I'm working on a cozy game prototype",
            "think",
            "playful",
            40_000,
        );
        assert_eq!(
            mem.conversation_highlights,
            vec![MemoryHighlight {
                summary: "Working on a cozy game prototype".to_string(),
                category: "progress".to_string(),
                captured_at: Some(40_000),
            }]
        );
        assert_eq!(
            mem.mood_history,
            vec![
                "playful".to_string(),
                "curious".to_string(),
                "sleepy".to_string(),
                "playful".to_string()
            ]
        );
        assert_eq!(mem.first_message_at, Some(10_000));
        assert_eq!(mem.last_message_at, Some(40_000));
    }

    #[test]
    fn recurring_preferences_and_profile_facts_are_tracked() {
        let mut mem = SessionMemory::default();
        mem.update_with_timestamp("I love jasmine tea", "help", "playful", 8_000);
        mem.update_with_timestamp("I like jasmine tea", "help", "curious", 9_000);
        mem.update_with_timestamp("My pronouns are she/her", "help", "curious", 10_000);
        mem.update_with_timestamp("I live in Seattle", "help", "curious", 11_000);

        assert_eq!(mem.preferences.len(), 1);
        assert_eq!(mem.preferences[0].value, "jasmine tea");
        assert_eq!(mem.preferences[0].mentions, 2);
        assert_eq!(mem.preferences[0].last_mentioned_at, Some(9_000));

        assert_eq!(mem.profile_facts.len(), 2);
        assert_eq!(mem.profile_facts[0].facet, "pronouns");
        assert_eq!(mem.profile_facts[1].facet, "location");
        assert_eq!(mem.profile_facts[1].last_updated_at, Some(11_000));
    }

    #[test]
    fn active_time_bands_capture_temporal_cues() {
        let mut mem = SessionMemory::default();
        mem.update_with_timestamp("hello", "none", "idle", 8 * 3_600_000);
        mem.update_with_timestamp("hello again", "none", "idle", 9 * 3_600_000);
        mem.update_with_timestamp("late ping", "none", "idle", 22 * 3_600_000);

        assert_eq!(mem.active_time_bands[0].band, "morning");
        assert_eq!(mem.active_time_bands[0].count, 2);
        assert!(mem
            .active_time_bands
            .iter()
            .any(|band| band.band == "night" && band.count == 1));
    }

    #[test]
    fn context_string_empty_for_new_session() {
        let mem = SessionMemory::default();
        assert_eq!(mem.to_context_string(), "");
    }

    #[test]
    fn context_string_includes_profile_recurring_and_temporal_cues() {
        let mut mem = SessionMemory::default();
        mem.update_with_timestamp("My name is Dave", "greet", "playful", 8 * 3_600_000);
        mem.update_with_timestamp("tell me about rust", "help", "curious", 9 * 3_600_000);
        mem.update_with_timestamp("I love lo-fi playlists", "help", "curious", 10 * 3_600_000);
        mem.update_with_timestamp("I like lo-fi playlists", "help", "curious", 11 * 3_600_000);
        mem.update_with_timestamp("My pronouns are he/him", "help", "playful", 12 * 3_600_000);
        mem.update_with_timestamp(
            "I'm learning Tauri for pet apps",
            "think",
            "playful",
            13 * 3_600_000,
        );
        let ctx = mem.to_context_string();
        assert!(ctx.contains("Dave"));
        assert!(ctx.contains("rust"));
        assert!(ctx.contains("Recurring favorites"));
        assert!(ctx.contains("pronouns: he/him"));
        assert!(ctx.contains("Learning Tauri for pet apps"));
        assert!(ctx.contains("usually chat in the morning"));
        assert!(ctx.contains("playful -> curious -> playful"));
    }

    #[test]
    fn topics_capped_at_max() {
        let mut mem = SessionMemory::default();
        for i in 0..12 {
            mem.update(&format!("tell me about topic{}", i), "help", "curious");
        }
        assert_eq!(mem.topics.len(), 8);
        assert_eq!(mem.topics[0], "topic4");
    }

    #[test]
    fn mood_history_skips_adjacent_duplicates_and_caps() {
        let mut mem = SessionMemory::default();
        for mood in [
            "idle",
            "idle",
            "curious",
            "curious",
            "playful",
            "sleepy",
            "surprised",
            "playful",
            "curious",
        ] {
            mem.update("hello", "none", mood);
        }

        assert_eq!(
            mem.mood_history,
            vec![
                "curious".to_string(),
                "playful".to_string(),
                "sleepy".to_string(),
                "surprised".to_string(),
                "playful".to_string(),
                "curious".to_string()
            ]
        );
    }

    #[test]
    fn legacy_session_memory_defaults_new_fields() {
        let legacy = r#"{
            "user_name":"Alice",
            "topics":["cats"],
            "message_count":2,
            "greet_count":1,
            "mood_trend":"playful"
        }"#;

        let mem: SessionMemory = serde_json::from_str(legacy).expect("legacy memory should load");
        assert_eq!(mem.user_name, Some("Alice".to_string()));
        assert_eq!(mem.topics, vec!["cats"]);
        assert!(mem.preferences.is_empty());
        assert!(mem.profile_facts.is_empty());
        assert!(mem.conversation_highlights.is_empty());
        assert!(mem.mood_history.is_empty());
        assert!(mem.active_time_bands.is_empty());
        assert!(mem.first_message_at.is_none());
        assert!(mem.last_message_at.is_none());
    }
}
