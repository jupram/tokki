use serde::{Deserialize, Serialize};

const MAX_TOPICS: usize = 8;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SessionMemory {
    pub user_name: Option<String>,
    pub topics: Vec<String>,
    pub message_count: u32,
    pub greet_count: u32,
    pub mood_trend: String,
}

impl SessionMemory {
    pub fn update(&mut self, user_msg: &str, intent: &str, mood: &str) {
        self.message_count += 1;

        if intent == "greet" {
            self.greet_count += 1;
        }

        self.mood_trend = mood.to_string();

        if self.user_name.is_none() {
            self.user_name = extract_user_name(user_msg);
        }

        if let Some(topic) = extract_topic(user_msg) {
            if !self.topics.contains(&topic) {
                if self.topics.len() >= MAX_TOPICS {
                    self.topics.remove(0);
                }
                self.topics.push(topic);
            }
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
            parts.push(format!(
                "Topics discussed: {}.",
                self.topics.join(", ")
            ));
        }

        if self.message_count > 1 {
            parts.push(format!(
                "This is message #{} in the conversation.",
                self.message_count
            ));
        }

        if !self.mood_trend.is_empty() && self.mood_trend != "idle" {
            parts.push(format!(
                "Your recent mood has been {}.",
                self.mood_trend
            ));
        }

        if parts.is_empty() {
            return String::new();
        }

        format!("\n[Session context: {}]", parts.join(" "))
    }
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
            let after = &msg[pos + prefix.len()..];
            let topic: String = after
                .chars()
                .take(40)
                .take_while(|c| *c != '?' && *c != '!' && *c != '.')
                .collect();
            let trimmed = topic.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_name_from_introduction() {
        assert_eq!(extract_user_name("My name is Alice"), Some("Alice".to_string()));
        assert_eq!(extract_user_name("I'm Bob"), Some("Bob".to_string()));
        assert_eq!(extract_user_name("call me Charlie!"), Some("Charlie".to_string()));
    }

    #[test]
    fn no_name_from_unrelated_text() {
        assert_eq!(extract_user_name("Hello there!"), None);
        assert_eq!(extract_user_name("How are you?"), None);
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
    fn no_topic_from_greeting() {
        assert_eq!(extract_topic("hello!"), None);
        assert_eq!(extract_topic("hi there"), None);
    }

    #[test]
    fn session_memory_updates() {
        let mut mem = SessionMemory::default();
        mem.update("My name is Alice", "greet", "playful");
        assert_eq!(mem.user_name, Some("Alice".to_string()));
        assert_eq!(mem.greet_count, 1);
        assert_eq!(mem.message_count, 1);

        mem.update("tell me about cats", "help", "curious");
        assert_eq!(mem.topics, vec!["cats"]);
        assert_eq!(mem.message_count, 2);
    }

    #[test]
    fn context_string_empty_for_new_session() {
        let mem = SessionMemory::default();
        assert_eq!(mem.to_context_string(), "");
    }

    #[test]
    fn context_string_includes_name_and_topics() {
        let mut mem = SessionMemory::default();
        mem.update("My name is Dave", "greet", "playful");
        mem.update("tell me about rust", "help", "curious");
        let ctx = mem.to_context_string();
        assert!(ctx.contains("Dave"));
        assert!(ctx.contains("rust"));
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
}
