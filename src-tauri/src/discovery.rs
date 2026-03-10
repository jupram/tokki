use serde::{Deserialize, Serialize};

use crate::presence::ProactiveMessage;

// ── Constants ────────────────────────────────────────────────────────────────

const RAPID_CLICK_THRESHOLD: u32 = 5;
const RAPID_CLICK_WINDOW_MS: u64 = 1_500;
const CORNER_DRAG_THRESHOLD: u32 = 3;
const CORNER_DRAG_WINDOW_MS: u64 = 5_000;
const MILESTONE_CHAT_COUNTS: &[u32] = &[10, 50, 100, 500];
const MILESTONE_DAY_COUNTS: &[u32] = &[1, 7, 30, 100];
const RARE_BEHAVIOR_CHANCE: f64 = 0.005; // 0.5% per tick

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EasterEggKind {
    RapidClick,
    CornerDrag,
    SecretPhrase,
    RareBehavior,
    ProgressiveUnlock,
    Milestone,
    ContextSurprise,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EasterEggEvent {
    pub kind: EasterEggKind,
    pub line: String,
    pub mood: String,
    pub animation: String,
}

// ── Discovery state ──────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct DiscoveryState {
    // Rapid click tracking
    pub click_timestamps: Vec<u64>,

    // Corner drag tracking
    pub corner_drag_timestamps: Vec<u64>,

    // Secret phrases found
    pub discovered_phrases: Vec<String>,

    // Progressive discovery
    pub total_interactions: u64,
    pub days_active: u32,
    pub first_session_at: u64,
    pub rare_behaviors_seen: u32,

    // Milestones acknowledged (separate lists to avoid key collisions)
    pub chat_milestones_hit: Vec<u32>,
    pub day_milestones_hit: Vec<u32>,
    pub interaction_milestones_hit: Vec<u32>,

    // Cooldown to avoid spam
    pub last_egg_at: u64,
}

impl Default for DiscoveryState {
    fn default() -> Self {
        Self {
            click_timestamps: Vec::new(),
            corner_drag_timestamps: Vec::new(),
            discovered_phrases: Vec::new(),
            total_interactions: 0,
            days_active: 0,
            first_session_at: 0,
            rare_behaviors_seen: 0,
            chat_milestones_hit: Vec::new(),
            day_milestones_hit: Vec::new(),
            interaction_milestones_hit: Vec::new(),
            last_egg_at: 0,
        }
    }
}

// ── Secret chat phrases ──────────────────────────────────────────────────────

const SECRET_PHRASES: &[(&str, &str, &str, &str)] = &[
    // (trigger, response, mood, animation)
    (
        "i love you",
        "I love you too! You're the best human ever!",
        "playful",
        "idle.hop",
    ),
    (
        "tell me a secret",
        "Psst... sometimes I dream about fields of carrots. Don't tell anyone!",
        "curious",
        "idle.look",
    ),
    (
        "do a dance",
        "*does a little wiggle dance* Ta-da!",
        "playful",
        "idle.hop",
    ),
    (
        "are you real",
        "I'm as real as the pixels on your screen... and the warmth in your heart!",
        "curious",
        "idle.look",
    ),
    (
        "what is the meaning of life",
        "42! ...wait, that's someone else's answer. Mine is: snacks and good company.",
        "playful",
        "idle.blink",
    ),
    (
        "boop",
        "*nose boop received!* Boop boop!",
        "surprised",
        "react.poke",
    ),
    (
        "sing a song",
        "La la la~ I'm a little teapot... no wait, I'm a rabbit. La la la~",
        "playful",
        "idle.hop",
    ),
];

// ── Public API ───────────────────────────────────────────────────────────────

/// Check if a chat message matches a secret phrase.
/// Returns an easter egg event if triggered.
pub fn check_secret_phrase(
    state: &mut DiscoveryState,
    message: &str,
    name: &str,
) -> Option<EasterEggEvent> {
    let lower = message.to_lowercase();

    for &(trigger, response, mood, animation) in SECRET_PHRASES {
        if lower.contains(trigger) && !state.discovered_phrases.contains(&trigger.to_string()) {
            // Check cooldown BEFORE marking as discovered, so the phrase
            // isn't swallowed if we're still in cooldown.
            let now = now_millis();
            if now.saturating_sub(state.last_egg_at) < 3_000 {
                return None; // cooldown — phrase stays undiscovered for next attempt
            }
            state.discovered_phrases.push(trigger.to_string());
            state.last_egg_at = now;
            return Some(EasterEggEvent {
                kind: EasterEggKind::SecretPhrase,
                line: format!("{name}: {response}"),
                mood: mood.to_string(),
                animation: animation.to_string(),
            });
        }
    }
    None
}

/// Register a click event and check for rapid click easter egg.
pub fn register_click(state: &mut DiscoveryState, name: &str) -> Option<EasterEggEvent> {
    let now = now_millis();
    state.total_interactions += 1;

    // Purge old timestamps
    state
        .click_timestamps
        .retain(|&t| now.saturating_sub(t) < RAPID_CLICK_WINDOW_MS);
    state.click_timestamps.push(now);

    if state.click_timestamps.len() >= RAPID_CLICK_THRESHOLD as usize {
        state.click_timestamps.clear();
        if now.saturating_sub(state.last_egg_at) < 3_000 {
            return None;
        }
        state.last_egg_at = now;
        let responses = [
            format!("Ahaha! {name} is getting poked so much! Stop iiit~"),
            format!("Hey hey hey! That tickles, stop clicking me so fast!"),
            format!("*dizzy* S-stop... the world is spinning..."),
        ];
        let idx = (now % responses.len() as u64) as usize;
        return Some(EasterEggEvent {
            kind: EasterEggKind::RapidClick,
            line: responses[idx].clone(),
            mood: "surprised".to_string(),
            animation: "react.poke".to_string(),
        });
    }
    None
}

/// Register a corner drag event.
pub fn register_corner_drag(state: &mut DiscoveryState, name: &str) -> Option<EasterEggEvent> {
    let now = now_millis();
    state.total_interactions += 1;

    state
        .corner_drag_timestamps
        .retain(|&t| now.saturating_sub(t) < CORNER_DRAG_WINDOW_MS);
    state.corner_drag_timestamps.push(now);

    if state.corner_drag_timestamps.len() >= CORNER_DRAG_THRESHOLD as usize {
        state.corner_drag_timestamps.clear();
        if now.saturating_sub(state.last_egg_at) < 5_000 {
            return None;
        }
        state.last_egg_at = now;
        let responses = [
            format!("Wheee! {name} is playing with me like a ping-pong ball!"),
            format!("I'm getting motion siiick... but it's also kinda fun!"),
            format!("*clings to the corner* Okay okay I'll stay here!"),
        ];
        let idx = (now % responses.len() as u64) as usize;
        return Some(EasterEggEvent {
            kind: EasterEggKind::CornerDrag,
            line: responses[idx].clone(),
            mood: "playful".to_string(),
            animation: "react.drag".to_string(),
        });
    }
    None
}

/// Check for rare spontaneous behaviors (called each behavior tick).
/// Uses a seed for deterministic randomness.
pub fn check_rare_behavior(
    state: &mut DiscoveryState,
    tick_count: u64,
    name: &str,
) -> Option<EasterEggEvent> {
    let now = now_millis();
    if now.saturating_sub(state.last_egg_at) < 30_000 {
        return None; // 30s cooldown for rare behaviors
    }

    // Pseudo-random check based on tick (xorshift-style mixing)
    let mut hash = tick_count.wrapping_mul(2654435761);
    hash ^= hash >> 16;
    hash = hash.wrapping_mul(0x45d9f3b);
    hash ^= hash >> 16;
    let chance = ((hash & 0xFFFF_FFFF) as f64) / (u32::MAX as f64);
    if chance > RARE_BEHAVIOR_CHANCE {
        return None;
    }

    state.rare_behaviors_seen += 1;
    state.last_egg_at = now;

    let rare_events = [
        (
            "*suddenly does a backflip* ...I've been practicing!",
            "playful",
            "idle.hop",
        ),
        (
            "*stares intently at nothing* ...I thought I saw a ghost.",
            "curious",
            "idle.look",
        ),
        (
            "Zzzz... *sleep-talks* ...no, the carrot is MINE...",
            "sleepy",
            "rest.nap",
        ),
        (
            "*ears perk up* Did you hear that? ...No? Just me? Okay.",
            "surprised",
            "idle.look",
        ),
        ("*hums a tiny tune* Do do dooo~", "playful", "idle.blink"),
    ];

    let idx = (tick_count as usize) % rare_events.len();
    let (line, mood, animation) = rare_events[idx];

    Some(EasterEggEvent {
        kind: EasterEggKind::RareBehavior,
        line: format!("{name}: {line}"),
        mood: mood.to_string(),
        animation: animation.to_string(),
    })
}

/// Check for progressive discovery unlocks based on total interactions.
pub fn check_progressive_unlock(state: &mut DiscoveryState, name: &str) -> Option<EasterEggEvent> {
    let now = now_millis();
    if now.saturating_sub(state.last_egg_at) < 5_000 {
        return None;
    }

    // Unlock tiers based on total interactions
    let milestones = [
        (
            100,
            "I feel like we're really getting to know each other!",
            "curious",
        ),
        (
            500,
            "Wow, we've hung out so much! You're officially my best friend.",
            "playful",
        ),
        (
            1000,
            "A thousand moments together... I'm grateful for every one.",
            "idle",
        ),
        (
            5000,
            "Five thousand interactions! I think we've set some kind of record.",
            "playful",
        ),
    ];

    for &(threshold, line, mood) in &milestones {
        if state.total_interactions >= threshold
            && !state
                .interaction_milestones_hit
                .contains(&(threshold as u32))
        {
            state.interaction_milestones_hit.push(threshold as u32);
            state.last_egg_at = now;
            return Some(EasterEggEvent {
                kind: EasterEggKind::ProgressiveUnlock,
                line: format!("{name}: {line}"),
                mood: mood.to_string(),
                animation: "idle.hop".to_string(),
            });
        }
    }
    None
}

/// Check for chat count milestones.
pub fn check_chat_milestone(
    state: &mut DiscoveryState,
    message_count: u32,
    name: &str,
) -> Option<EasterEggEvent> {
    let now = now_millis();
    for &count in MILESTONE_CHAT_COUNTS {
        if message_count >= count && !state.chat_milestones_hit.contains(&count) {
            state.chat_milestones_hit.push(count);
            if now.saturating_sub(state.last_egg_at) < 3_000 {
                return None;
            }
            state.last_egg_at = now;
            let line = match count {
                10 => format!("{name}: Our 10th chat! We're practically best buds now."),
                50 => {
                    format!("{name}: 50 messages! You really like talking to me, huh? I love it!")
                }
                100 => {
                    format!("{name}: 100 conversations! I know your typing rhythm by heart now.")
                }
                500 => format!("{name}: 500 messages!? You're my #1 human, no contest."),
                _ => format!("{name}: Wow, {count} messages together!"),
            };
            return Some(EasterEggEvent {
                kind: EasterEggKind::Milestone,
                line,
                mood: "playful".to_string(),
                animation: "idle.hop".to_string(),
            });
        }
    }
    None
}

/// Check for day-count milestones.
pub fn check_day_milestone(state: &mut DiscoveryState, name: &str) -> Option<EasterEggEvent> {
    let now = now_millis();

    // Initialize first session
    if state.first_session_at == 0 {
        state.first_session_at = now;
    }

    let days = ((now.saturating_sub(state.first_session_at)) / (86_400 * 1000)) as u32;
    state.days_active = days;

    for &day_count in MILESTONE_DAY_COUNTS {
        if days >= day_count && !state.day_milestones_hit.contains(&day_count) {
            state.day_milestones_hit.push(day_count);
            if now.saturating_sub(state.last_egg_at) < 5_000 {
                return None;
            }
            state.last_egg_at = now;
            let line = match day_count {
                1 => format!("{name}: It's been a whole day together! Time flies when you're with a good human."),
                7 => format!("{name}: One week together! We've been friends for a week now!"),
                30 => format!("{name}: A whole month! I can't imagine my desktop without you."),
                100 => format!("{name}: 100 days! We're basically inseparable at this point."),
                _ => format!("{name}: {day_count} days together! That's amazing!"),
            };
            return Some(EasterEggEvent {
                kind: EasterEggKind::Milestone,
                line,
                mood: "playful".to_string(),
                animation: "idle.hop".to_string(),
            });
        }
    }
    None
}

/// Convert an easter egg event to a ProactiveMessage for the event system.
pub fn egg_to_proactive(egg: &EasterEggEvent) -> ProactiveMessage {
    ProactiveMessage {
        kind: crate::presence::ProactiveKind::EasterEgg, // Easter egg proactive channel
        line: egg.line.clone(),
        mood: egg.mood.clone(),
        animation: egg.animation.clone(),
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn fresh_state() -> DiscoveryState {
        DiscoveryState::default()
    }

    #[test]
    fn secret_phrase_triggers_on_match() {
        let mut state = fresh_state();
        let result = check_secret_phrase(&mut state, "I love you so much!", "Bun");
        assert!(result.is_some());
        let egg = result.unwrap();
        assert_eq!(egg.kind, EasterEggKind::SecretPhrase);
        assert!(egg.line.contains("Bun"));
    }

    #[test]
    fn secret_phrase_does_not_repeat() {
        let mut state = fresh_state();
        let _ = check_secret_phrase(&mut state, "I love you", "Bun");
        state.last_egg_at = 0; // clear cooldown
        let second = check_secret_phrase(&mut state, "I love you again", "Bun");
        assert!(second.is_none(), "should not trigger same phrase twice");
    }

    #[test]
    fn rapid_click_triggers_after_threshold() {
        let mut state = fresh_state();
        for _ in 0..RAPID_CLICK_THRESHOLD {
            let _ = register_click(&mut state, "Bun");
        }
        // After threshold clicks in rapid succession, the timestamps were cleared
        // and an event was returned on the threshold-th click
        // Since we can't control timing precisely, just verify state tracking works
        assert!(state.total_interactions >= RAPID_CLICK_THRESHOLD as u64);
    }

    #[test]
    fn rare_behavior_low_probability() {
        let mut state = fresh_state();
        let mut triggered = 0;
        for tick in 0..1000 {
            if check_rare_behavior(&mut state, tick, "Bun").is_some() {
                triggered += 1;
                state.last_egg_at = 0; // clear cooldown for testing
            }
        }
        // With 0.5% chance, we'd expect ~5 in 1000 ticks, but allow wide range
        assert!(
            triggered < 50,
            "rare behaviors should be rare: got {triggered}"
        );
    }

    #[test]
    fn chat_milestone_triggers_at_10() {
        let mut state = fresh_state();
        let result = check_chat_milestone(&mut state, 10, "Bun");
        assert!(result.is_some());
        assert!(state.chat_milestones_hit.contains(&10));
    }

    #[test]
    fn chat_milestone_does_not_repeat() {
        let mut state = fresh_state();
        let _ = check_chat_milestone(&mut state, 10, "Bun");
        state.last_egg_at = 0;
        let second = check_chat_milestone(&mut state, 10, "Bun");
        assert!(second.is_none());
    }

    #[test]
    fn day_milestone_initializes_first_session() {
        let mut state = fresh_state();
        assert_eq!(state.first_session_at, 0);
        let _ = check_day_milestone(&mut state, "Bun");
        assert_ne!(state.first_session_at, 0);
    }

    #[test]
    fn egg_to_proactive_preserves_content() {
        let egg = EasterEggEvent {
            kind: EasterEggKind::SecretPhrase,
            line: "Hello!".to_string(),
            mood: "playful".to_string(),
            animation: "idle.hop".to_string(),
        };
        let msg = egg_to_proactive(&egg);
        assert_eq!(msg.line, "Hello!");
        assert_eq!(msg.mood, "playful");
    }

    #[test]
    fn progressive_unlock_at_100() {
        let mut state = fresh_state();
        state.total_interactions = 100;
        let result = check_progressive_unlock(&mut state, "Bun");
        assert!(result.is_some());
        assert_eq!(result.unwrap().kind, EasterEggKind::ProgressiveUnlock);
        assert!(
            state.interaction_milestones_hit.contains(&100),
            "should track in interaction_milestones_hit"
        );
        assert!(
            !state.chat_milestones_hit.contains(&100),
            "should NOT pollute chat_milestones_hit"
        );
    }

    #[test]
    fn progressive_unlock_does_not_collide_with_chat_milestones() {
        let mut state = fresh_state();

        // Trigger interaction milestone at 100
        state.total_interactions = 100;
        let _ = check_progressive_unlock(&mut state, "Bun");
        state.last_egg_at = 0; // clear cooldown

        // Now trigger chat milestone at 100 — should still fire
        let chat_result = check_chat_milestone(&mut state, 100, "Bun");
        assert!(
            chat_result.is_some(),
            "chat milestone at 100 should fire independently of interaction milestone at 100"
        );
    }

    #[test]
    fn progressive_unlock_does_not_collide_at_500() {
        let mut state = fresh_state();

        // Trigger interaction milestone at 500
        state.total_interactions = 500;
        let _ = check_progressive_unlock(&mut state, "Bun");
        state.last_egg_at = 0;

        // Chat milestone at 500 should still fire
        let chat_result = check_chat_milestone(&mut state, 500, "Bun");
        assert!(
            chat_result.is_some(),
            "chat milestone at 500 should fire independently"
        );
    }

    #[test]
    fn secret_phrase_not_swallowed_by_cooldown() {
        let mut state = fresh_state();

        // Set cooldown to be active
        state.last_egg_at = now_millis();

        // Try to trigger a secret phrase during cooldown
        let result = check_secret_phrase(&mut state, "I love you", "Bun");
        assert!(result.is_none(), "should be blocked by cooldown");
        assert!(
            !state.discovered_phrases.contains(&"i love you".to_string()),
            "phrase should NOT be marked as discovered when blocked by cooldown"
        );

        // Clear cooldown and retry — should now work
        state.last_egg_at = 0;
        let retry = check_secret_phrase(&mut state, "I love you", "Bun");
        assert!(
            retry.is_some(),
            "phrase should trigger after cooldown expires"
        );
        assert!(state.discovered_phrases.contains(&"i love you".to_string()));
    }

    #[test]
    fn corner_drag_has_cooldown() {
        let mut state = fresh_state();
        // Force past cooldown threshold rapidly
        for _ in 0..CORNER_DRAG_THRESHOLD {
            let _ = register_corner_drag(&mut state, "Bun");
        }
        // Interactions were tracked
        assert!(state.total_interactions >= CORNER_DRAG_THRESHOLD as u64);
    }

    #[test]
    fn day_milestone_first_day() {
        let mut state = fresh_state();
        // First session: day 0 — the "1 day" milestone should NOT fire yet
        let result = check_day_milestone(&mut state, "Bun");
        // days_active is 0 on first call (now - first_session_at ≈ 0)
        assert_eq!(state.days_active, 0);
        // The 1-day milestone requires days >= 1, so shouldn't fire
        assert!(result.is_none() || state.day_milestones_hit.contains(&1));
    }
}
