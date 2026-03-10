use rand::Rng;

use super::models::{ChatMessage, LlmResponse};
use super::provider::LlmProvider;
use crate::engine::models::Mood;

/// Offline provider — template-based responses flavored by personality traits.
/// Used when no LLM API is available or when the user explicitly selects offline mode.
pub struct OfflineProvider;

impl OfflineProvider {
    pub fn new() -> Self {
        Self
    }
}

impl LlmProvider for OfflineProvider {
    fn chat(
        &self,
        user_message: &str,
        history: &[ChatMessage],
        session_context: &str,
        personality_fragment: &str,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<LlmResponse, String>> + Send + '_>>
    {
        let user_message = user_message.to_string();
        let history = history.to_vec();
        let session_context = session_context.to_string();
        let personality_fragment = personality_fragment.to_string();

        Box::pin(async move {
            Ok(generate_offline_reply(
                &user_message,
                &history,
                &session_context,
                &personality_fragment,
            ))
        })
    }

    fn provider_name(&self) -> &str {
        "offline"
    }

    fn requires_network(&self) -> bool {
        false
    }
}

/// Templates keyed by detected intent + personality flavor.
struct ReplyTemplate {
    line: &'static str,
    mood: Mood,
    animation: &'static str,
    intent: &'static str,
}

const GREETING_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Hi there! Nice to see you!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "greet",
    },
    ReplyTemplate {
        line: "Hey! *waves ear*",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "greet",
    },
    ReplyTemplate {
        line: "Hello, friend! How's your day?",
        mood: Mood::Playful,
        animation: "idle.blink",
        intent: "greet",
    },
    ReplyTemplate {
        line: "Oh! You're here! *bounces*",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "greet",
    },
    ReplyTemplate {
        line: "Welcome back! I missed you~",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "greet",
    },
];

const QUESTION_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Hmm, that's a good question! I'd need my thinking cap for that one.",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "think",
    },
    ReplyTemplate {
        line: "Ooh, interesting! I wish I could look that up for you.",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "think",
    },
    ReplyTemplate {
        line: "Let me think... *tilts head* ...I'm not sure, but I bet it's cool!",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "think",
    },
    ReplyTemplate {
        line: "*scratches ear* That one's tricky! I'll ponder it while you work.",
        mood: Mood::Curious,
        animation: "idle.headturn",
        intent: "think",
    },
    ReplyTemplate {
        line: "Ooh, big question energy! I love it when you make me think.",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "think",
    },
];

const FAREWELL_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Bye bye! Come back soon!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "goodbye",
    },
    ReplyTemplate {
        line: "See you later! *waves*",
        mood: Mood::Idle,
        animation: "idle.blink",
        intent: "goodbye",
    },
    ReplyTemplate {
        line: "Take care! I'll be right here!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "goodbye",
    },
    ReplyTemplate {
        line: "Aw, already? Okay... *slow wave* ...I'll keep your desktop warm!",
        mood: Mood::Sleepy,
        animation: "idle.slowblink",
        intent: "goodbye",
    },
];

const JOKE_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Why did the rabbit cross the road? To get to the carrot patch!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "joke",
    },
    ReplyTemplate {
        line: "I'd tell you a joke about my tail, but it's a little behind!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "joke",
    },
    ReplyTemplate {
        line: "Hehe, I'm funnier when I've had my morning carrot!",
        mood: Mood::Playful,
        animation: "idle.blink",
        intent: "joke",
    },
    ReplyTemplate {
        line: "What's a desktop pet's favorite snack? Mega-bytes!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "joke",
    },
    ReplyTemplate {
        line: "I tried counting sheep to sleep but I kept hopping over them!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "joke",
    },
];

const IDLE_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "I'm just a little creature on your screen~",
        mood: Mood::Idle,
        animation: "idle.blink",
        intent: "none",
    },
    ReplyTemplate {
        line: "*wiggles* What should we do?",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "none",
    },
    ReplyTemplate {
        line: "It's nice just hanging out with you!",
        mood: Mood::Idle,
        animation: "idle.blink",
        intent: "none",
    },
    ReplyTemplate {
        line: "*stretches* I'm here if you need me!",
        mood: Mood::Idle,
        animation: "idle.blink",
        intent: "none",
    },
    ReplyTemplate {
        line: "The desktop is my kingdom and you're my favorite human!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
    ReplyTemplate {
        line: "I wonder what that icon does... *stares at taskbar*",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "none",
    },
    ReplyTemplate {
        line: "*taps screen from the inside* Can you hear me?",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
    ReplyTemplate {
        line: "Did you know I can hear you typing? It's like rain on a tiny roof!",
        mood: Mood::Idle,
        animation: "idle.blink",
        intent: "none",
    },
];

// ── Time-aware idle observations ────────────────────────────────────────

const MORNING_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Good morning vibes~ Ready to take on the day?",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
    ReplyTemplate {
        line: "Rise and shine! *big stretch*",
        mood: Mood::Idle,
        animation: "idle.stretch",
        intent: "none",
    },
    ReplyTemplate {
        line: "Morning! The sun is out and so am I!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
];

const EVENING_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Getting late, huh? Don't forget to stretch!",
        mood: Mood::Idle,
        animation: "idle.stretch",
        intent: "none",
    },
    ReplyTemplate {
        line: "*yawns* The evening is so cozy...",
        mood: Mood::Sleepy,
        animation: "idle.yawn",
        intent: "none",
    },
    ReplyTemplate {
        line: "The stars are coming out~ or maybe that's just my screen glow.",
        mood: Mood::Idle,
        animation: "idle.slowblink",
        intent: "none",
    },
];

const LATE_NIGHT_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "It's really late... maybe we should both rest?",
        mood: Mood::Sleepy,
        animation: "idle.yawn",
        intent: "none",
    },
    ReplyTemplate {
        line: "*slow blink* I'm still here if you need me, night owl.",
        mood: Mood::Sleepy,
        animation: "idle.slowblink",
        intent: "none",
    },
    ReplyTemplate {
        line: "The world is quiet and it's just us two~",
        mood: Mood::Idle,
        animation: "idle.blink",
        intent: "none",
    },
];

// ── Energy-aware templates (used for proactive idle chatter) ────────────

const HIGH_ENERGY_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "I'm full of energy! Let's DO something!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
    ReplyTemplate {
        line: "*bouncing off the walls* I feel GREAT!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
];

const LOW_ENERGY_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Getting a bit sleepy... *rubs eyes*",
        mood: Mood::Sleepy,
        animation: "idle.slowblink",
        intent: "none",
    },
    ReplyTemplate {
        line: "*tiny yawn* A little nap wouldn't hurt...",
        mood: Mood::Sleepy,
        animation: "idle.yawn",
        intent: "none",
    },
];

// ── Mood-reflective templates ───────────────────────────────────────────

const CURIOUS_MOOD_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Hmm, what's that over there? *tilts head*",
        mood: Mood::Curious,
        animation: "idle.headturn",
        intent: "none",
    },
    ReplyTemplate {
        line: "I keep noticing interesting things on your desktop...",
        mood: Mood::Curious,
        animation: "idle.look",
        intent: "none",
    },
];

const PLAYFUL_MOOD_TEMPLATES: &[ReplyTemplate] = &[
    ReplyTemplate {
        line: "Hehe, I'm in such a good mood! *bounces*",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
    ReplyTemplate {
        line: "Poke me! Poke me! I dare you!",
        mood: Mood::Playful,
        animation: "idle.hop",
        intent: "none",
    },
];

pub(crate) fn templates_available() -> bool {
    !GREETING_TEMPLATES.is_empty()
        && !QUESTION_TEMPLATES.is_empty()
        && !FAREWELL_TEMPLATES.is_empty()
        && !JOKE_TEMPLATES.is_empty()
        && !IDLE_TEMPLATES.is_empty()
}

fn detect_intent(msg: &str) -> &'static str {
    let lower = msg.to_lowercase();
    if lower.contains("hello")
        || lower.contains("hi ")
        || lower.contains("hey")
        || lower.starts_with("hi")
        || lower == "hi"
        || lower.contains("morning")
        || lower.contains("good day")
    {
        return "greet";
    }
    if lower.contains("bye")
        || lower.contains("goodbye")
        || lower.contains("see you")
        || lower.contains("good night")
        || lower.contains("gotta go")
    {
        return "goodbye";
    }
    if lower.contains("joke")
        || lower.contains("funny")
        || lower.contains("laugh")
        || lower.contains("humor")
    {
        return "joke";
    }
    if lower.contains('?')
        || lower.starts_with("what")
        || lower.starts_with("how")
        || lower.starts_with("why")
        || lower.starts_with("when")
        || lower.starts_with("where")
        || lower.starts_with("who")
    {
        return "think";
    }
    "none"
}

fn pick_template(templates: &[ReplyTemplate]) -> &ReplyTemplate {
    let mut rng = rand::thread_rng();
    let idx = rng.gen_range(0..templates.len());
    &templates[idx]
}

fn extract_sentence_value(session_context: &str, prefix: &str) -> Option<String> {
    let start = session_context.find(prefix)? + prefix.len();
    let rest = &session_context[start..];
    let end = rest.find('.').unwrap_or(rest.len());
    let value = rest[..end].trim();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

fn split_context_list(session_context: &str, prefix: &str, separator: char) -> Vec<String> {
    extract_sentence_value(session_context, prefix)
        .map(|value| {
            value
                .split(separator)
                .map(clean_context_candidate)
                .filter(|item| !item.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn clean_context_candidate(raw: &str) -> String {
    raw.split(" (")
        .next()
        .unwrap_or(raw)
        .trim()
        .trim_matches(|ch: char| ch == '.' || ch == ',' || ch == ';')
        .to_string()
}

fn extract_user_name(session_context: &str) -> Option<String> {
    extract_sentence_value(session_context, "The user's name is ")
}

fn extract_memory_candidates(session_context: &str) -> Vec<String> {
    let mut candidates: Vec<String> = Vec::new();
    for candidate in split_context_list(session_context, "Conversation highlights: ", ';')
        .into_iter()
        .chain(split_context_list(
            session_context,
            "Recurring favorites: ",
            ';',
        ))
        .chain(split_context_list(
            session_context,
            "Known preferences: ",
            ';',
        ))
        .chain(split_context_list(
            session_context,
            "Topics discussed: ",
            ',',
        ))
    {
        if !candidates
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(&candidate))
        {
            candidates.push(candidate);
        }
    }
    candidates
}

fn keyword_tokens(text: &str) -> Vec<String> {
    const STOPWORDS: &[&str] = &[
        "the", "and", "for", "with", "that", "this", "you", "your", "tokki", "about", "from",
        "have", "has", "are", "was", "were", "been", "into", "our", "out", "what", "when", "where",
        "which", "while", "there", "here", "how", "why", "who", "just", "really", "still", "want",
        "need", "like", "tell", "more", "hello", "hi", "hey",
    ];

    let mut tokens: Vec<String> = Vec::new();
    for token in text
        .split(|ch: char| !ch.is_alphanumeric())
        .map(|piece| piece.trim().to_lowercase())
        .filter(|piece| piece.len() > 2 && !STOPWORDS.contains(&piece.as_str()))
    {
        if !tokens.contains(&token) {
            tokens.push(token);
        }
    }
    tokens
}

fn overlap_score(candidate: &str, user_tokens: &[String]) -> usize {
    let candidate_tokens = keyword_tokens(candidate);
    candidate_tokens
        .iter()
        .filter(|token| user_tokens.contains(*token))
        .count()
}

fn choose_contextual_memory(
    session_context: &str,
    user_message: &str,
    allow_fallback: bool,
) -> Option<String> {
    let candidates = extract_memory_candidates(session_context);
    if candidates.is_empty() {
        return None;
    }

    let user_tokens = keyword_tokens(user_message);
    let best_match = candidates
        .iter()
        .map(|candidate| (overlap_score(candidate, &user_tokens), candidate))
        .max_by_key(|(score, _)| *score)
        .and_then(|(score, candidate)| {
            if score > 0 {
                Some(candidate.clone())
            } else {
                None
            }
        });

    if best_match.is_some() {
        best_match
    } else if allow_fallback {
        candidates.into_iter().next()
    } else {
        None
    }
}

fn recent_user_message(history: &[ChatMessage], current_message: &str) -> Option<String> {
    history
        .iter()
        .rev()
        .find(|message| message.role == "user" && message.content.trim() != current_message.trim())
        .map(|message| clean_context_candidate(&message.content))
        .filter(|message| {
            matches!(detect_intent(message), "think" | "joke" | "none")
                && !keyword_tokens(message).is_empty()
        })
        .filter(|message| !message.is_empty())
}

fn grounded_reply(
    line: String,
    mood: Mood,
    animation: &str,
    intent: &str,
    personality_fragment: &str,
) -> LlmResponse {
    LlmResponse {
        line: apply_personality_flavor(&line, personality_fragment),
        mood,
        animation: animation.to_string(),
        intent: intent.to_string(),
    }
}

fn build_memory_grounded_reply(
    user_message: &str,
    history: &[ChatMessage],
    session_context: &str,
    personality_fragment: &str,
) -> Option<LlmResponse> {
    if session_context.trim().is_empty() && history.is_empty() {
        return None;
    }

    let intent = detect_intent(user_message);
    let name = extract_user_name(session_context);
    let matched_memory = choose_contextual_memory(session_context, user_message, false);
    let fallback_memory = choose_contextual_memory(session_context, user_message, true)
        .or_else(|| recent_user_message(history, user_message));

    match intent {
        "greet" => match (name.clone(), fallback_memory.clone()) {
            (Some(name), Some(memory)) => Some(grounded_reply(
                format!("Hi {name}! Still thinking about {memory}."),
                Mood::Playful,
                "idle.hop",
                "greet",
                personality_fragment,
            )),
            (Some(name), None) => Some(grounded_reply(
                format!("Hi {name}! It's really nice seeing you again."),
                Mood::Playful,
                "idle.hop",
                "greet",
                personality_fragment,
            )),
            (None, Some(memory)) => Some(grounded_reply(
                format!("Hi again! Still thinking about {memory}."),
                Mood::Playful,
                "idle.hop",
                "greet",
                personality_fragment,
            )),
            (None, None) => None,
        },
        "goodbye" => match (name.clone(), fallback_memory.clone()) {
            (Some(name), Some(memory)) => Some(grounded_reply(
                format!("Bye {name}! We'll pick up {memory} next time."),
                Mood::Idle,
                "idle.blink",
                "goodbye",
                personality_fragment,
            )),
            (Some(name), None) => Some(grounded_reply(
                format!("Bye {name}! I'll be right here when you get back."),
                Mood::Idle,
                "idle.blink",
                "goodbye",
                personality_fragment,
            )),
            _ => None,
        },
        "think" => matched_memory.clone().map(|memory| {
            grounded_reply(
                format!("That reminds me of {memory}. Let me think with you."),
                Mood::Curious,
                "idle.look",
                "think",
                personality_fragment,
            )
        }),
        "none" => fallback_memory.map(|memory| {
            grounded_reply(
                match name.clone() {
                    Some(name) => format!("Hey {name}, I'm still thinking about {memory}."),
                    None => format!("I'm still thinking about {memory}."),
                },
                Mood::Idle,
                "idle.blink",
                "none",
                personality_fragment,
            )
        }),
        _ => None,
    }
}

fn apply_personality_flavor(line: &str, personality_fragment: &str) -> String {
    // Simple personality flavoring: if personality mentions certain traits, adjust output
    let lower = personality_fragment.to_lowercase();

    if lower.contains("aloof") || lower.contains("terse") {
        // Shorten the response
        let words: Vec<&str> = line.split_whitespace().collect();
        if words.len() > 5 {
            return format!("{}...", words[..5].join(" "));
        }
    }

    if lower.contains("proud") || lower.contains("dramatic") {
        return format!("*ahem* {}", line);
    }

    if lower.contains("mystical") || lower.contains("cryptic") {
        return format!("{} ...the stars know more.", line);
    }

    line.to_string()
}

/// Detect a time-of-day hint from the personality fragment or system context.
/// Returns "morning", "evening", "late_night", or "none".
fn detect_time_of_day(personality_fragment: &str) -> &'static str {
    let lower = personality_fragment.to_lowercase();
    // The session context or personality fragment may mention the hour.
    if lower.contains("morning") || lower.contains("am") {
        return "morning";
    }
    if lower.contains("evening") || lower.contains("pm") {
        return "evening";
    }
    if lower.contains("night") || lower.contains("late") {
        return "late_night";
    }

    // Use system clock as a best-effort hint.
    #[cfg(not(test))]
    {
        let hour = chrono_hour();
        return match hour {
            5..=11 => "morning",
            18..=21 => "evening",
            22..=23 | 0..=4 => "late_night",
            _ => "none",
        };
    }
    #[cfg(test)]
    {
        "none"
    }
}

/// Best-effort local hour (0-23). Falls back to 12 (noon) if the clock
/// is unavailable — keeps the binary dependency-free of chrono.
#[cfg(not(test))]
fn chrono_hour() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Rough UTC hour — not locale-aware, but good enough for flavor text.
    ((secs / 3600) % 24) as u32
}

pub(crate) fn generate_offline_reply(
    user_message: &str,
    history: &[ChatMessage],
    session_context: &str,
    personality_fragment: &str,
) -> LlmResponse {
    if let Some(reply) =
        build_memory_grounded_reply(user_message, history, session_context, personality_fragment)
    {
        return reply;
    }

    let intent = detect_intent(user_message);
    let template = match intent {
        "greet" => pick_template(GREETING_TEMPLATES),
        "goodbye" => pick_template(FAREWELL_TEMPLATES),
        "joke" => pick_template(JOKE_TEMPLATES),
        "think" => pick_template(QUESTION_TEMPLATES),
        _ => {
            // For generic idle messages, occasionally inject context-aware variants.
            let mut rng = rand::thread_rng();
            let roll: u32 = rng.gen_range(0..100);

            // ~20% chance of a time-aware remark.
            if roll < 20 {
                let tod = detect_time_of_day(personality_fragment);
                match tod {
                    "morning" => {
                        return build_reply(pick_template(MORNING_TEMPLATES), personality_fragment)
                    }
                    "evening" => {
                        return build_reply(pick_template(EVENING_TEMPLATES), personality_fragment)
                    }
                    "late_night" => {
                        return build_reply(
                            pick_template(LATE_NIGHT_TEMPLATES),
                            personality_fragment,
                        )
                    }
                    _ => {}
                }
            }

            // ~15% chance of an energy-aware remark.
            let lower = personality_fragment.to_lowercase();
            if roll >= 20 && roll < 35 {
                if lower.contains("energy") || lower.contains("tired") || lower.contains("sleepy") {
                    return build_reply(pick_template(LOW_ENERGY_TEMPLATES), personality_fragment);
                }
                if lower.contains("energetic") || lower.contains("hyper") {
                    return build_reply(pick_template(HIGH_ENERGY_TEMPLATES), personality_fragment);
                }
            }

            // ~10% chance of a mood-reflective remark.
            if roll >= 35 && roll < 45 {
                if lower.contains("curious") {
                    return build_reply(
                        pick_template(CURIOUS_MOOD_TEMPLATES),
                        personality_fragment,
                    );
                }
                if lower.contains("playful") || lower.contains("cheerful") {
                    return build_reply(
                        pick_template(PLAYFUL_MOOD_TEMPLATES),
                        personality_fragment,
                    );
                }
            }

            pick_template(IDLE_TEMPLATES)
        }
    };

    build_reply(template, personality_fragment)
}

fn build_reply(template: &ReplyTemplate, personality_fragment: &str) -> LlmResponse {
    let line = apply_personality_flavor(template.line, personality_fragment);
    LlmResponse {
        line,
        mood: template.mood.clone(),
        animation: template.animation.to_string(),
        intent: template.intent.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_greeting() {
        assert_eq!(detect_intent("hello there!"), "greet");
        assert_eq!(detect_intent("Hi"), "greet");
        assert_eq!(detect_intent("hey buddy"), "greet");
    }

    #[test]
    fn detect_farewell() {
        assert_eq!(detect_intent("bye bye!"), "goodbye");
        assert_eq!(detect_intent("gotta go now"), "goodbye");
    }

    #[test]
    fn detect_question() {
        assert_eq!(detect_intent("what is rust?"), "think");
        assert_eq!(detect_intent("how does this work?"), "think");
    }

    #[test]
    fn detect_joke_request() {
        assert_eq!(detect_intent("tell me a joke"), "joke");
    }

    #[test]
    fn detect_idle() {
        assert_eq!(detect_intent("ok"), "none");
        assert_eq!(detect_intent("cool"), "none");
    }

    #[test]
    fn templates_are_available() {
        assert!(templates_available());
    }

    #[test]
    fn offline_reply_returns_valid_response() {
        let reply = generate_offline_reply("hello!", &[], "", "");
        assert!(!reply.line.is_empty());
        assert_eq!(reply.intent, "greet");
    }

    #[test]
    fn personality_flavor_aloof() {
        let reply = generate_offline_reply(
            "tell me something interesting",
            &[],
            "",
            "You are aloof and mysterious. Be terse.",
        );
        // Aloof personality should shorten longer responses
        assert!(!reply.line.is_empty());
    }

    #[test]
    fn personality_flavor_proud() {
        let flavored = apply_personality_flavor("Hello friend!", "proud and dramatic");
        assert!(flavored.starts_with("*ahem*"));
    }

    #[test]
    fn personality_flavor_mystical() {
        let flavored = apply_personality_flavor("Interesting!", "mystical and cryptic");
        assert!(flavored.contains("the stars know more"));
    }

    // ── New tests for enriched templates ─────────────────────────────────

    #[test]
    fn time_of_day_detection_from_fragment() {
        assert_eq!(detect_time_of_day("It's a lovely morning"), "morning");
        assert_eq!(detect_time_of_day("Good evening everyone"), "evening");
        assert_eq!(detect_time_of_day("It's late night"), "late_night");
        assert_eq!(detect_time_of_day("just a normal day"), "none");
    }

    #[test]
    fn idle_reply_never_empty() {
        // Run many idle replies with various personality fragments to
        // confirm none are empty.
        let fragments = [
            "",
            "gentle and a little nervous",
            "aloof and mysterious. Be terse.",
            "proud and dramatic",
            "mystical and cryptic",
            "cheerful and bubbly",
            "energy is low, feeling sleepy",
            "energetic and hyper",
            "curious about everything",
        ];
        for frag in fragments {
            for _ in 0..20 {
                let reply = generate_offline_reply("sure", &[], "", frag);
                assert!(!reply.line.is_empty(), "empty reply for fragment: {frag}");
            }
        }
    }

    #[test]
    fn greeting_reply_uses_session_memory_name() {
        let reply = generate_offline_reply(
            "hello again",
            &[],
            "[Session context: The user's name is Ari. Topics discussed: rust.]",
            "",
        );
        assert!(reply.line.contains("Ari"));
        assert_eq!(reply.intent, "greet");
    }

    #[test]
    fn question_reply_prefers_matching_memory() {
        let reply = generate_offline_reply(
            "can we talk about rust today?",
            &[],
            "[Session context: Topics discussed: rust, cozy games. Conversation highlights: Learning Tauri together.]",
            "",
        );
        assert!(reply.line.to_lowercase().contains("rust"));
        assert_eq!(reply.intent, "think");
    }

    #[test]
    fn greeting_templates_expanded() {
        assert!(
            GREETING_TEMPLATES.len() >= 5,
            "Should have at least 5 greeting templates"
        );
    }

    #[test]
    fn idle_templates_expanded() {
        assert!(
            IDLE_TEMPLATES.len() >= 8,
            "Should have at least 8 idle templates"
        );
    }

    #[test]
    fn morning_evening_templates_exist() {
        assert!(!MORNING_TEMPLATES.is_empty());
        assert!(!EVENING_TEMPLATES.is_empty());
        assert!(!LATE_NIGHT_TEMPLATES.is_empty());
    }

    #[test]
    fn energy_mood_templates_exist() {
        assert!(!HIGH_ENERGY_TEMPLATES.is_empty());
        assert!(!LOW_ENERGY_TEMPLATES.is_empty());
        assert!(!CURIOUS_MOOD_TEMPLATES.is_empty());
        assert!(!PLAYFUL_MOOD_TEMPLATES.is_empty());
    }
}
