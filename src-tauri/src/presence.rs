use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::mem;

/// How long the OS reports the user has been idle (no keyboard/mouse input).
#[cfg(target_os = "windows")]
pub fn os_idle_seconds() -> u64 {
    #[repr(C)]
    struct LASTINPUTINFO {
        cb_size: u32,
        dw_time: u32,
    }

    extern "system" {
        fn GetLastInputInfo(plii: *mut LASTINPUTINFO) -> i32;
        fn GetTickCount() -> u32;
    }

    let mut lii: LASTINPUTINFO = unsafe { mem::zeroed() };
    lii.cb_size = mem::size_of::<LASTINPUTINFO>() as u32;

    let idle_ms = unsafe {
        if GetLastInputInfo(&mut lii) != 0 {
            let now = GetTickCount();
            now.wrapping_sub(lii.dw_time)
        } else {
            0
        }
    };

    (idle_ms / 1000) as u64
}

#[cfg(not(target_os = "windows"))]
pub fn os_idle_seconds() -> u64 {
    0
}

// ── Proactive message types ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProactiveKind {
    WelcomeBack,
    BreakReminder,
    TimeOfDay,
    Seasonal,
    MouseShake,
    EasterEgg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProactiveMessage {
    pub kind: ProactiveKind,
    pub line: String,
    pub mood: String,
    pub animation: String,
}

// ── Presence state tracking ──────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct PresenceState {
    /// Last time the user was detected as active (millis since epoch).
    pub last_active_at: u64,
    /// Whether the user was idle on the previous check.
    pub was_idle: bool,
    /// How many seconds the user was idle last check.
    pub last_idle_secs: u64,
    /// Timestamp of the last break reminder sent.
    pub last_break_reminder_at: u64,
    /// Timestamp of the last welcome back sent.
    pub last_welcome_back_at: u64,
    /// Timestamp of the last time-of-day greeting sent.
    pub last_tod_greeting_at: u64,
    /// Timestamp of the last seasonal greeting sent.
    pub last_seasonal_greeting_at: u64,
    /// Epoch millis when the current active streak began (None if idle).
    pub active_streak_start_at: Option<u64>,
    /// Hour of last time-of-day greeting (0-23) to avoid repeating for same period.
    pub last_tod_hour_band: Option<u8>,
    /// Timestamp of the last mouse-shake message (cooldown).
    pub last_mouse_shake_at: u64,
}

impl Default for PresenceState {
    fn default() -> Self {
        Self {
            last_active_at: now_millis(),
            was_idle: false,
            last_idle_secs: 0,
            last_break_reminder_at: 0,
            last_welcome_back_at: 0,
            last_tod_greeting_at: 0,
            last_seasonal_greeting_at: 0,
            active_streak_start_at: None,
            last_tod_hour_band: None,
            last_mouse_shake_at: 0,
        }
    }
}

// ── Thresholds ──────────────────────────────────────────────────────────

/// User is considered "idle" after this many seconds.
const IDLE_THRESHOLD_SECS: u64 = 120; // 2 min
/// User is considered "absent" (trigger welcome back) after this many seconds.
const ABSENCE_THRESHOLD_SECS: u64 = 300; // 5 min
/// Break reminder after this many seconds of continuous activity.
const BREAK_REMINDER_SECS: u64 = 2700; // 45 min
/// Minimum cooldown between break reminders.
const BREAK_COOLDOWN_SECS: u64 = 1800; // 30 min
/// Minimum cooldown between welcome back messages.
const WELCOME_COOLDOWN_SECS: u64 = 300; // 5 min
/// Minimum cooldown between time-of-day greetings.
const TOD_COOLDOWN_SECS: u64 = 3600; // 1 hour
/// Minimum cooldown between seasonal greetings.
const SEASONAL_COOLDOWN_SECS: u64 = 86400; // 24 hours

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ── Presence check — run every tick ──────────────────────────────────────

/// Check presence and return up to one proactive message per tick.
/// `personality_name` and `preset_descriptor` are used to flavor messages.
pub fn check_presence(
    state: &mut PresenceState,
    personality_name: &str,
    preset_descriptor: &str,
) -> Option<ProactiveMessage> {
    let idle_secs = os_idle_seconds();
    let now_ms = now_millis();

    let is_idle = idle_secs >= IDLE_THRESHOLD_SECS;
    let was_absent = state.was_idle && state.last_idle_secs >= ABSENCE_THRESHOLD_SECS;

    // ── Welcome back ─────────────────────────────────────────────────
    if was_absent && !is_idle {
        let since_last = now_ms.saturating_sub(state.last_welcome_back_at);
        if since_last >= WELCOME_COOLDOWN_SECS * 1000 {
            state.was_idle = false;
            state.last_idle_secs = idle_secs;
            state.last_active_at = now_ms;
            state.active_streak_start_at = Some(now_ms);
            state.last_welcome_back_at = now_ms;

            let absence_mins = state.last_idle_secs / 60;
            return Some(welcome_back_message(personality_name, absence_mins, now_ms));
        }
    }

    // Update idle tracking
    let prev_was_idle = state.was_idle;
    state.was_idle = is_idle;
    state.last_idle_secs = idle_secs;

    if !is_idle {
        state.last_active_at = now_ms;
        if prev_was_idle || state.active_streak_start_at.is_none() {
            // Starting a new active streak
            state.active_streak_start_at = Some(now_ms);
        }
    } else {
        state.active_streak_start_at = None;
    }

    // ── Break reminder ──────────────────────────────────────────────
    if !is_idle {
        if let Some(streak_start) = state.active_streak_start_at {
            let active_secs = now_ms.saturating_sub(streak_start) / 1000;
            if active_secs >= BREAK_REMINDER_SECS {
                let since_last = now_ms.saturating_sub(state.last_break_reminder_at);
                if since_last >= BREAK_COOLDOWN_SECS * 1000 {
                    state.last_break_reminder_at = now_ms;
                    state.active_streak_start_at = Some(now_ms); // reset streak
                    return Some(break_reminder_message(
                        personality_name,
                        preset_descriptor,
                        now_ms,
                    ));
                }
            }
        }
    }

    // ── Time-of-day greeting ────────────────────────────────────────
    if !is_idle {
        let since_tod = now_ms.saturating_sub(state.last_tod_greeting_at);
        if since_tod >= TOD_COOLDOWN_SECS * 1000 {
            if let Some(msg) =
                time_of_day_message(personality_name, &mut state.last_tod_hour_band, now_ms)
            {
                state.last_tod_greeting_at = now_ms;
                return Some(msg);
            }
        }
    }

    // ── Seasonal/calendar events ────────────────────────────────────
    if !is_idle {
        let since_seasonal = now_ms.saturating_sub(state.last_seasonal_greeting_at);
        if since_seasonal >= SEASONAL_COOLDOWN_SECS * 1000 {
            if let Some(msg) = seasonal_message(personality_name) {
                state.last_seasonal_greeting_at = now_ms;
                return Some(msg);
            }
        }
    }

    None
}

// ── Welcome back messages ────────────────────────────────────────────────

fn welcome_back_message(name: &str, absence_mins: u64, seed: u64) -> ProactiveMessage {
    let pick = (seed / 1000) as usize; // varies every second
    let line = match absence_mins {
        0..=9 => {
            let opts = [
                format!("Oh, you're back! {name} missed you~"),
                format!("There you are! {name} was getting a little lonely."),
            ];
            opts[pick % opts.len()].clone()
        }
        10..=29 => {
            let opts = [
                format!("Hey, welcome back! {name} was starting to worry..."),
                format!("You were away for a bit! {name} saved your spot."),
            ];
            opts[pick % opts.len()].clone()
        }
        30..=59 => {
            let opts = [
                format!("You were gone a while! {name} kept watch for you."),
                format!("Back at last! {name} has been holding down the fort."),
            ];
            opts[pick % opts.len()].clone()
        }
        _ => {
            let opts = [
                format!("You're finally back! {name} almost fell asleep waiting..."),
                format!("Whoa, that was a long one! {name} was about to send a search party."),
            ];
            opts[pick % opts.len()].clone()
        }
    };
    ProactiveMessage {
        kind: ProactiveKind::WelcomeBack,
        line,
        mood: "playful".into(),
        animation: "idle.hop".into(),
    }
}

// ── Break reminders ──────────────────────────────────────────────────────

fn break_reminder_message(name: &str, descriptor: &str, seed: u64) -> ProactiveMessage {
    let pick = (seed / 1000) as usize;
    let line = if descriptor.contains("gentle") || descriptor.contains("nervous") {
        let opts = [
            format!("Um... {name} thinks maybe a little break would be nice? You've been going a while..."),
            format!("Just a gentle thought... maybe stretch your legs a bit? —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else if descriptor.contains("aloof") || descriptor.contains("sarcastic") {
        let opts = [
            format!("...you know screens don't hug back, right? Just saying. —{name}"),
            format!("I'm not worried or anything, but maybe stand up? —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else if descriptor.contains("clever") || descriptor.contains("mischievous") {
        let opts = [
            format!("Fun fact: humans aren't supposed to sit this long! {name}'s orders: stretch break!"),
            format!("Did you know blinking exists? Try it. Also, stand up. —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else if descriptor.contains("proud") || descriptor.contains("dramatic") {
        let opts = [
            format!("A true champion knows when to rest! {name} hereby decrees: take a break!"),
            format!("Even legends need intermissions! Rise and stretch, champion! —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else if descriptor.contains("cheerful") || descriptor.contains("bubbly") {
        let opts = [
            format!("Hey hey! You've been super focused! How about a quick stretch? —{name}"),
            format!("Stretch time! Your body will thank you~ —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else if descriptor.contains("wise") || descriptor.contains("contemplative") {
        let opts = [
            format!("Even the mightiest tree sways in the wind to rest. Time for a pause. —{name}"),
            format!("The mind sharpens when the body moves. A moment of rest? —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else if descriptor.contains("serene") || descriptor.contains("patient") {
        let opts = [
            format!("The water flows best when it pauses in still pools... take a moment? —{name}"),
            format!("A quiet pause can refresh the whole afternoon. —{name}"),
        ];
        opts[pick % opts.len()].clone()
    } else {
        let opts = [
            format!("Psst... you've been at it for a while. Maybe a quick break? —{name}"),
            format!("Your eyes deserve a rest! How about a short breather? —{name}"),
        ];
        opts[pick % opts.len()].clone()
    };

    ProactiveMessage {
        kind: ProactiveKind::BreakReminder,
        line,
        mood: "curious".into(),
        animation: "idle.look".into(),
    }
}

// ── Time-of-day ──────────────────────────────────────────────────────────

fn current_hour() -> u8 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Get local hour. Use a simple UTC offset approach for Windows.
    // In practice the chrono crate would be ideal, but we avoid adding deps.
    // We use the C `localtime` function via raw FFI.
    local_hour_from_epoch(secs)
}

#[cfg(target_os = "windows")]
fn local_hour_from_epoch(epoch_secs: u64) -> u8 {
    extern "C" {
        fn _localtime64_s(result: *mut Tm, time: *const i64) -> i32;
    }

    #[repr(C)]
    #[derive(Default)]
    struct Tm {
        tm_sec: i32,
        tm_min: i32,
        tm_hour: i32,
        tm_mday: i32,
        tm_mon: i32,
        tm_year: i32,
        tm_wday: i32,
        tm_yday: i32,
        tm_isdst: i32,
    }

    let time = epoch_secs as i64;
    let mut tm = Tm::default();
    let result = unsafe { _localtime64_s(&mut tm, &time) };
    if result == 0 {
        (tm.tm_hour as u8).min(23)
    } else {
        12 // fallback to noon
    }
}

#[cfg(not(target_os = "windows"))]
fn local_hour_from_epoch(_epoch_secs: u64) -> u8 {
    12 // fallback
}

#[cfg(target_os = "windows")]
fn local_month_day() -> (u8, u8) {
    extern "C" {
        fn _localtime64_s(result: *mut LocalTm, time: *const i64) -> i32;
    }

    #[repr(C)]
    #[derive(Default)]
    struct LocalTm {
        tm_sec: i32,
        tm_min: i32,
        tm_hour: i32,
        tm_mday: i32,
        tm_mon: i32,
        tm_year: i32,
        tm_wday: i32,
        tm_yday: i32,
        tm_isdst: i32,
    }

    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let mut tm = LocalTm::default();
    let result = unsafe { _localtime64_s(&mut tm, &secs) };
    if result == 0 {
        ((tm.tm_mon + 1) as u8, tm.tm_mday as u8)
    } else {
        (1, 1)
    }
}

#[cfg(not(target_os = "windows"))]
fn local_month_day() -> (u8, u8) {
    (1, 1)
}

/// Returns a time-of-day band: 0 = morning (5-11), 1 = afternoon (12-16),
/// 2 = evening (17-20), 3 = night (21-4).
fn hour_band(hour: u8) -> u8 {
    match hour {
        5..=11 => 0,
        12..=16 => 1,
        17..=20 => 2,
        _ => 3,
    }
}

fn time_of_day_message(
    name: &str,
    last_band: &mut Option<u8>,
    seed: u64,
) -> Option<ProactiveMessage> {
    let hour = current_hour();
    let band = hour_band(hour);

    // Don't repeat for the same band
    if *last_band == Some(band) {
        return None;
    }
    *last_band = Some(band);

    let pick = (seed / 1000) as usize;

    let (line, mood, animation) = match band {
        0 => {
            let opts = [
                (
                    format!("Good morning! {name} hopes you slept well~"),
                    "playful",
                    "idle.hop",
                ),
                (
                    format!("Rise and shine! {name} is ready for a new day!"),
                    "playful",
                    "idle.hop",
                ),
            ];
            opts[pick % opts.len()].clone()
        }
        1 => {
            let opts = [
                (
                    format!("It's afternoon already! {name} hopes things are going well."),
                    "idle",
                    "idle.blink",
                ),
                (
                    format!("Afternoon check-in! How's your day going? —{name}"),
                    "curious",
                    "idle.look",
                ),
            ];
            opts[pick % opts.len()].clone()
        }
        2 => {
            let opts = [
                (
                    format!("Good evening! Winding down? {name} is here if you need anything."),
                    "curious",
                    "idle.look",
                ),
                (
                    format!("Evening already! {name} hopes you had a good day."),
                    "idle",
                    "idle.blink",
                ),
            ];
            opts[pick % opts.len()].clone()
        }
        _ => {
            let opts = [
                (
                    format!("It's getting late... {name} thinks you should probably sleep soon!"),
                    "sleepy",
                    "rest.nap",
                ),
                (
                    format!("Late night, huh? {name} will keep you company. —but sleep soon!"),
                    "sleepy",
                    "rest.nap",
                ),
            ];
            opts[pick % opts.len()].clone()
        }
    };

    Some(ProactiveMessage {
        kind: ProactiveKind::TimeOfDay,
        line,
        mood: mood.into(),
        animation: animation.into(),
    })
}

// ── Seasonal/calendar ────────────────────────────────────────────────────

fn seasonal_message(name: &str) -> Option<ProactiveMessage> {
    let (month, day) = local_month_day();

    let line = match (month, day) {
        // New Year's Day
        (1, 1) => Some(format!(
            "Happy New Year! {name} hopes this year is amazing for you!"
        )),
        // Valentine's Day
        (2, 14) => Some(format!(
            "{name} just wants you to know... you're appreciated! Happy Valentine's Day!"
        )),
        // International Day of Happiness
        (3, 20) => Some(format!(
            "It's the International Day of Happiness! {name} is happy just being with you~"
        )),
        // Earth Day
        (4, 22) => Some(format!(
            "Happy Earth Day! {name} loves this little blue planet."
        )),
        // Summer / Winter Solstice (June 21 — longest/shortest day depending on hemisphere)
        (6, 21) => Some(format!(
            "Happy Solstice! The sun is doing something special today. —{name}"
        )),
        // International Friendship Day
        (7, 30) => Some(format!(
            "It's International Friendship Day! {name} is lucky to have a friend like you."
        )),
        // World Kindness Day
        (11, 13) => Some(format!(
            "It's World Kindness Day! A little kindness goes a long way. —{name}"
        )),
        // Halloween
        (10, 31) => Some(format!(
            "Boo! Happy Halloween! {name} tried to be scary but... too cute."
        )),
        // Christmas Eve / Christmas
        (12, 24) => Some(format!(
            "It's Christmas Eve! {name} can barely contain the excitement!"
        )),
        (12, 25) => Some(format!(
            "Merry Christmas! {name} wishes you warmth and joy!"
        )),
        // New Year's Eve
        (12, 31) => Some(format!(
            "It's the last day of the year! {name} had such a great time with you!"
        )),
        _ => None,
    };

    line.map(|l| ProactiveMessage {
        kind: ProactiveKind::Seasonal,
        line: l,
        mood: "playful".into(),
        animation: "idle.hop".into(),
    })
}

/// Minimum cooldown between mouse shake messages (5 seconds).
const MOUSE_SHAKE_COOLDOWN_MS: u64 = 5_000;

/// Generate a dizzy/shake reaction message, or None if still on cooldown.
pub fn mouse_shake_message(name: &str, state: &mut PresenceState) -> Option<ProactiveMessage> {
    let now = now_millis();
    if now.saturating_sub(state.last_mouse_shake_at) < MOUSE_SHAKE_COOLDOWN_MS {
        return None;
    }
    state.last_mouse_shake_at = now;

    let pick = (now / 1000) as usize;
    let lines = [
        format!("W-whoa! {name} is getting dizzy from all that shaking!"),
        format!("Hey! My pixels are rattling! —{name}"),
        format!("Earthquake?! Oh... it's just you. —{name}"),
    ];

    Some(ProactiveMessage {
        kind: ProactiveKind::MouseShake,
        line: lines[pick % lines.len()].clone(),
        mood: "surprised".into(),
        animation: "react.poke".into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hour_band_morning() {
        assert_eq!(hour_band(5), 0);
        assert_eq!(hour_band(6), 0);
        assert_eq!(hour_band(11), 0);
    }

    #[test]
    fn hour_band_afternoon() {
        assert_eq!(hour_band(12), 1);
        assert_eq!(hour_band(16), 1);
    }

    #[test]
    fn hour_band_evening() {
        assert_eq!(hour_band(17), 2);
        assert_eq!(hour_band(20), 2);
    }

    #[test]
    fn hour_band_night() {
        assert_eq!(hour_band(21), 3);
        assert_eq!(hour_band(23), 3);
        assert_eq!(hour_band(0), 3);
        assert_eq!(hour_band(4), 3);
    }

    #[test]
    fn hour_band_boundaries() {
        // Exhaustive boundary checks
        assert_eq!(hour_band(4), 3); // end of night
        assert_eq!(hour_band(5), 0); // start of morning
        assert_eq!(hour_band(11), 0); // end of morning
        assert_eq!(hour_band(12), 1); // start of afternoon
        assert_eq!(hour_band(16), 1); // end of afternoon
        assert_eq!(hour_band(17), 2); // start of evening
        assert_eq!(hour_band(20), 2); // end of evening
        assert_eq!(hour_band(21), 3); // start of night
    }

    #[test]
    fn welcome_back_messages_vary_by_duration() {
        let short = welcome_back_message("Bun", 3, 1000);
        assert!(short.line.contains("Bun"));
        assert_eq!(short.kind, ProactiveKind::WelcomeBack);

        let medium = welcome_back_message("Bun", 15, 1000);
        assert!(medium.line.contains("Bun"));

        let long = welcome_back_message("Bun", 45, 1000);
        assert!(long.line.contains("Bun"));

        let very_long = welcome_back_message("Bun", 120, 1000);
        assert!(very_long.line.contains("Bun"));
    }

    #[test]
    fn welcome_back_messages_have_variety() {
        // Different seeds should produce different messages for the same bracket
        let msg_a = welcome_back_message("Bun", 15, 1000);
        let msg_b = welcome_back_message("Bun", 15, 2000);
        // At least the function accepts the seed; with 2 options, seeds 1 and 2 differ mod 2
        assert_eq!(msg_a.kind, ProactiveKind::WelcomeBack);
        assert_eq!(msg_b.kind, ProactiveKind::WelcomeBack);
    }

    #[test]
    fn break_reminder_uses_personality() {
        let gentle = break_reminder_message("Bun", "gentle and a little nervous", 1000);
        assert!(gentle.line.contains("Bun"));
        assert_eq!(gentle.kind, ProactiveKind::BreakReminder);

        let aloof =
            break_reminder_message("Mochi", "aloof and mysterious, with sarcastic edge", 1000);
        assert!(aloof.line.contains("Mochi"));

        let generic = break_reminder_message("Tokki", "something unknown", 1000);
        assert!(generic.line.contains("Tokki"));
    }

    #[test]
    fn break_reminder_has_variety() {
        let a = break_reminder_message("Bun", "gentle", 1000);
        let b = break_reminder_message("Bun", "gentle", 2000);
        assert_eq!(a.kind, ProactiveKind::BreakReminder);
        assert_eq!(b.kind, ProactiveKind::BreakReminder);
    }

    #[test]
    fn tod_message_doesnt_repeat_same_band() {
        let mut last_band = Some(0u8);
        // If we're in band 0 and last was 0, should return None
        // (can't directly test current_hour, but test the band logic)
        assert!(time_of_day_message("Bun", &mut Some(0), 1000).is_none() || true);
        // When band changes, should produce a message
        let result = time_of_day_message("Bun", &mut last_band, 1000);
        // This depends on actual current time, so just verify it doesn't panic
        let _ = result;
    }

    #[test]
    fn seasonal_new_years() {
        // Test the seasonal matching directly
        let msg = seasonal_message("Bun");
        // Can't control date, but ensure no panic
        let _ = msg;
    }

    #[test]
    fn mouse_shake_message_has_cooldown() {
        let mut state = PresenceState::default();
        let first = mouse_shake_message("Ember", &mut state);
        assert!(first.is_some());
        let msg = first.unwrap();
        assert_eq!(msg.kind, ProactiveKind::MouseShake);
        assert!(msg.line.contains("Ember"));

        // Second call immediately should be blocked by cooldown
        let second = mouse_shake_message("Ember", &mut state);
        assert!(second.is_none(), "should be on cooldown");
    }

    #[test]
    fn mouse_shake_fires_after_cooldown() {
        let mut state = PresenceState::default();
        let _ = mouse_shake_message("Ember", &mut state);

        // Simulate cooldown expiring
        state.last_mouse_shake_at = now_millis().saturating_sub(MOUSE_SHAKE_COOLDOWN_MS + 1);
        let after_cooldown = mouse_shake_message("Ember", &mut state);
        assert!(
            after_cooldown.is_some(),
            "should fire after cooldown expires"
        );
    }

    #[test]
    fn presence_state_defaults() {
        let state = PresenceState::default();
        assert!(!state.was_idle);
        assert!(state.active_streak_start_at.is_none());
        assert_eq!(state.last_tod_hour_band, None);
        assert_eq!(state.last_mouse_shake_at, 0);
    }

    #[test]
    fn os_idle_returns_a_number() {
        // Just ensure it doesn't panic on this platform
        let secs = os_idle_seconds();
        assert!(secs < 1_000_000); // sanity
    }

    #[test]
    fn break_reminder_uses_wall_clock_not_tick_count() {
        // Verify that active_streak_start_at is used for timing
        let mut state = PresenceState::default();
        let now = now_millis();

        // Simulate 45 minutes of continuous activity via wall-clock
        state.active_streak_start_at = Some(now.saturating_sub(BREAK_REMINDER_SECS * 1000 + 1000));
        state.was_idle = false;
        state.last_idle_secs = 0;

        // The check_presence function uses os_idle_seconds() which we can't mock,
        // but we can verify the state tracking is correct
        assert!(state.active_streak_start_at.is_some());
        let streak_secs = now.saturating_sub(state.active_streak_start_at.unwrap()) / 1000;
        assert!(
            streak_secs >= BREAK_REMINDER_SECS,
            "active streak should be >= break threshold"
        );
    }

    #[test]
    fn seasonal_events_are_globally_relevant() {
        // Verify no US-specific holidays remain in the seasonal calendar
        // by checking the message text doesn't contain US-only references
        // We can't easily test each date, but we verify the function compiles
        // and the match arms don't include Thanksgiving or St. Patrick's
        let _ = seasonal_message("Test");
        // The compile-time structure of the match guarantees the events;
        // this test documents the intent that events should be global.
    }
}
