use rand::{rngs::StdRng, Rng, SeedableRng};

use super::models::{
    BehaviorAction, BehaviorTickPayload, Mood, PersonalityPreset, TokkiState, TransitionReason,
    UserEvent, UserEventType,
};

/// Weights for the three core idle actions: (blink, hop, look).
struct IdleWeights {
    blink: u32,
    hop: u32,
    look: u32,
}

/// Per-personality tuning knobs for the behavior engine.
struct PersonalityProfile {
    idle_weights: IdleWeights,
    /// Probability of a rare animation expressed as `1 / rare_denom`.
    rare_denom: u32,
}

fn profile_for(preset: &PersonalityPreset) -> PersonalityProfile {
    match preset {
        PersonalityPreset::Gentle => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 4,
                hop: 2,
                look: 3,
            },
            rare_denom: 10, // 10%
        },
        PersonalityPreset::Aloof => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 3,
                hop: 1,
                look: 5,
            },
            rare_denom: 8, // 12.5%
        },
        PersonalityPreset::Clever => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 2,
                hop: 3,
                look: 4,
            },
            rare_denom: 7, // ~14%
        },
        PersonalityPreset::Proud => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 3,
                hop: 2,
                look: 4,
            },
            rare_denom: 10,
        },
        PersonalityPreset::Radiant => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 2,
                hop: 4,
                look: 3,
            },
            rare_denom: 8,
        },
        PersonalityPreset::Mystical => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 3,
                hop: 1,
                look: 5,
            },
            rare_denom: 7,
        },
        PersonalityPreset::Stoic => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 5,
                hop: 1,
                look: 3,
            },
            rare_denom: 12, // ~8%
        },
        PersonalityPreset::Cheerful => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 2,
                hop: 5,
                look: 2,
            },
            rare_denom: 8,
        },
        PersonalityPreset::Wise => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 4,
                hop: 1,
                look: 4,
            },
            rare_denom: 10,
        },
        PersonalityPreset::Serene => PersonalityProfile {
            idle_weights: IdleWeights {
                blink: 5,
                hop: 1,
                look: 3,
            },
            rare_denom: 11, // ~9%
        },
    }
}

#[derive(Debug)]
pub struct BehaviorEngine {
    rng: StdRng,
    state: TokkiState,
    personality: PersonalityPreset,
}

impl BehaviorEngine {
    pub fn new(seed: u64) -> Self {
        Self {
            rng: StdRng::seed_from_u64(seed),
            state: TokkiState::initial(),
            personality: PersonalityPreset::Gentle,
        }
    }

    pub fn reseed(&mut self, seed: u64) {
        self.rng = StdRng::seed_from_u64(seed);
        self.state = TokkiState::initial();
    }

    pub fn current_state(&self) -> TokkiState {
        self.state.clone()
    }

    pub fn set_energy(&mut self, energy: u8) {
        self.state.energy = energy.min(100);
    }

    /// Sync the engine's personality with the current user-selected preset.
    pub fn set_personality(&mut self, preset: PersonalityPreset) {
        self.personality = preset;
    }

    pub fn personality(&self) -> &PersonalityPreset {
        &self.personality
    }

    pub fn apply_action(&mut self, action: BehaviorAction) {
        self.state.tick_count = self.state.tick_count.saturating_add(1);
        self.state.last_interaction_at = self.state.tick_count;
        self.state.current_action = action;
    }

    pub fn tick(
        &mut self,
        reason: TransitionReason,
        event: Option<UserEvent>,
    ) -> BehaviorTickPayload {
        self.state.tick_count = self.state.tick_count.saturating_add(1);

        let mut next_action = if let Some(ref current_event) = event {
            self.interaction_action(current_event)
        } else {
            self.random_idle_action()
        };

        // ── Energy model (momentum-based) ──────────────────────────────────
        if event.is_some() {
            self.state.last_interaction_at = self.state.tick_count;
            self.state.consecutive_interactions =
                self.state.consecutive_interactions.saturating_add(1);

            // Recovery scales with current energy — the more energetic, the
            // more a new interaction fuels hyper behavior.
            let recovery = match self.state.energy {
                81..=100 => 15,
                61..=80 => 12,
                41..=60 => 10,
                _ => 8,
            };
            self.state.energy = ((self.state.energy as u16 + recovery).min(100)) as u8;
        } else {
            self.state.consecutive_interactions = 0;

            // Decay accelerates as energy drops — tiredness has momentum.
            let drain = match self.state.energy {
                81..=100 => 2,
                61..=80 => 3,
                41..=60 => 4,
                _ => 5,
            };
            self.state.energy = self.state.energy.saturating_sub(drain);
        }

        // ── Hyperactivity burst ────────────────────────────────────────────
        // When energy is high from lots of interactions, bias toward playful.
        if event.is_none() && self.state.energy > 80 {
            if self.rng.gen_range(0..3) == 0 {
                next_action = Self::hyper_action();
            }
        }

        // ── Sleep override ─────────────────────────────────────────────────
        if event.is_none() && self.state.energy < 20 {
            next_action = Self::sleep_action();
        }

        self.state.current_action = next_action;

        BehaviorTickPayload {
            state: self.state.clone(),
            reason,
        }
    }

    fn interaction_action(&self, event: &UserEvent) -> BehaviorAction {
        match event.kind {
            UserEventType::Poke => BehaviorAction {
                id: "react_poke".to_string(),
                animation: "react.poke".to_string(),
                mood: Mood::Surprised,
                duration_ms: 650,
                interruptible: false,
            },
            UserEventType::Hover => BehaviorAction {
                id: "react_hover".to_string(),
                animation: "react.hover".to_string(),
                mood: Mood::Curious,
                duration_ms: 700,
                interruptible: true,
            },
            UserEventType::DragStart | UserEventType::DragEnd => BehaviorAction {
                id: "react_drag".to_string(),
                animation: "react.drag".to_string(),
                mood: Mood::Surprised,
                duration_ms: 800,
                interruptible: false,
            },
            UserEventType::Click => BehaviorAction {
                id: "react_click".to_string(),
                animation: "react.click".to_string(),
                mood: Mood::Playful,
                duration_ms: 500,
                interruptible: true,
            },
        }
    }

    /// Pick an idle action influenced by personality preset and current mood.
    fn random_idle_action(&mut self) -> BehaviorAction {
        let profile = profile_for(&self.personality);
        let current_mood = self.state.current_action.mood.clone();
        let ticks_since = self
            .state
            .tick_count
            .saturating_sub(self.state.last_interaction_at);

        // Rare action check — probability is personality-dependent.
        if self.rng.gen_range(0..profile.rare_denom) == 0 {
            return self.rare_idle_action(&current_mood, ticks_since);
        }

        // Start with personality base weights, then apply mood modifiers.
        let mut w_blink = profile.idle_weights.blink;
        let mut w_hop = profile.idle_weights.hop;
        let mut w_look = profile.idle_weights.look;

        match current_mood {
            Mood::Sleepy => {
                w_blink += 3;
                w_hop = w_hop.saturating_sub(1);
            }
            Mood::Playful => {
                w_hop += 3;
                w_blink = w_blink.saturating_sub(1);
            }
            Mood::Curious => {
                w_look += 3;
                w_blink = w_blink.saturating_sub(1);
            }
            Mood::Surprised => {
                w_hop += 1;
                w_look += 1;
            }
            Mood::Idle => {}
        }

        // Long time without interaction biases toward sleepy.
        if ticks_since > 30 {
            w_blink += 2;
            w_hop = w_hop.saturating_sub(1);
        }

        let total = w_blink + w_hop + w_look;
        let roll = self.rng.gen_range(0..total);

        if roll < w_blink {
            BehaviorAction {
                id: "idle_blink".to_string(),
                animation: "idle.blink".to_string(),
                mood: Mood::Idle,
                duration_ms: 1_000,
                interruptible: true,
            }
        } else if roll < w_blink + w_hop {
            BehaviorAction {
                id: "idle_hop".to_string(),
                animation: "idle.hop".to_string(),
                mood: Mood::Playful,
                duration_ms: 950,
                interruptible: true,
            }
        } else {
            BehaviorAction {
                id: "idle_look".to_string(),
                animation: "idle.look".to_string(),
                mood: Mood::Curious,
                duration_ms: 1_250,
                interruptible: true,
            }
        }
    }

    /// Pick a rare idle animation. Mood and inactivity influence which rare
    /// action is more likely (e.g. sleepy mood → yawn/slowblink).
    fn rare_idle_action(&mut self, current_mood: &Mood, ticks_since: u64) -> BehaviorAction {
        // Weighted pool: (weight, action_index).
        // 0=sneeze, 1=slowblink, 2=yawn, 3=headturn, 4=stretch
        let mut weights: [u32; 5] = [2, 2, 2, 2, 2];

        match current_mood {
            Mood::Sleepy => {
                weights[1] += 3; // slowblink
                weights[2] += 3; // yawn
                weights[4] += 2; // stretch
            }
            Mood::Curious => {
                weights[3] += 4; // headturn
            }
            Mood::Playful => {
                weights[0] += 2; // sneeze (surprise element)
            }
            _ => {}
        }

        // Inactive for a long time → more sleepy rares.
        if ticks_since > 20 {
            weights[2] += 2; // yawn
            weights[4] += 2; // stretch
        }

        let total: u32 = weights.iter().sum();
        let mut roll = self.rng.gen_range(0..total);

        for (i, &w) in weights.iter().enumerate() {
            if roll < w {
                return match i {
                    0 => BehaviorAction {
                        id: "idle_sneeze".to_string(),
                        animation: "idle.sneeze".to_string(),
                        mood: Mood::Surprised,
                        duration_ms: 800,
                        interruptible: true,
                    },
                    1 => BehaviorAction {
                        id: "idle_slowblink".to_string(),
                        animation: "idle.slowblink".to_string(),
                        mood: Mood::Sleepy,
                        duration_ms: 1_500,
                        interruptible: true,
                    },
                    2 => BehaviorAction {
                        id: "idle_yawn".to_string(),
                        animation: "idle.yawn".to_string(),
                        mood: Mood::Sleepy,
                        duration_ms: 1_800,
                        interruptible: true,
                    },
                    3 => BehaviorAction {
                        id: "idle_headturn".to_string(),
                        animation: "idle.headturn".to_string(),
                        mood: Mood::Curious,
                        duration_ms: 1_100,
                        interruptible: true,
                    },
                    _ => BehaviorAction {
                        id: "idle_stretch".to_string(),
                        animation: "idle.stretch".to_string(),
                        mood: Mood::Idle,
                        duration_ms: 1_400,
                        interruptible: true,
                    },
                };
            }
            roll -= w;
        }

        // Fallback (unreachable in practice).
        BehaviorAction {
            id: "idle_blink".to_string(),
            animation: "idle.blink".to_string(),
            mood: Mood::Idle,
            duration_ms: 1_000,
            interruptible: true,
        }
    }

    /// Burst action triggered during hyperactive energy levels (>80).
    fn hyper_action() -> BehaviorAction {
        BehaviorAction {
            id: "idle_hop".to_string(),
            animation: "idle.hop".to_string(),
            mood: Mood::Playful,
            duration_ms: 750,
            interruptible: true,
        }
    }

    fn sleep_action() -> BehaviorAction {
        BehaviorAction {
            id: "rest_nap".to_string(),
            animation: "rest.nap".to_string(),
            mood: Mood::Sleepy,
            duration_ms: 1_600,
            interruptible: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::models::{TransitionReason, UserEvent, UserEventType};

    fn event(kind: UserEventType) -> UserEvent {
        UserEvent {
            kind,
            x: None,
            y: None,
            timestamp: 1,
        }
    }

    fn poke_event() -> UserEvent {
        event(UserEventType::Poke)
    }

    #[test]
    fn same_seed_produces_same_sequence() {
        let mut first = BehaviorEngine::new(7);
        let mut second = BehaviorEngine::new(7);

        let mut first_ids = Vec::new();
        let mut second_ids = Vec::new();

        for _ in 0..25 {
            first_ids.push(
                first
                    .tick(TransitionReason::Timer, None)
                    .state
                    .current_action
                    .id,
            );
            second_ids.push(
                second
                    .tick(TransitionReason::Timer, None)
                    .state
                    .current_action
                    .id,
            );
        }

        assert_eq!(first_ids, second_ids);
        assert_eq!(first.current_state().energy, second.current_state().energy);
    }

    #[test]
    fn different_seeds_diverge() {
        let mut first = BehaviorEngine::new(7);
        let mut second = BehaviorEngine::new(9);

        let mut diverged = false;
        for _ in 0..30 {
            let first_action = first.tick(TransitionReason::Timer, None);
            let second_action = second.tick(TransitionReason::Timer, None);
            if first_action.state.current_action.id != second_action.state.current_action.id {
                diverged = true;
                break;
            }
        }

        assert!(diverged);
    }

    #[test]
    fn interaction_prioritizes_reaction_action() {
        let mut engine = BehaviorEngine::new(42);

        let tick = engine.tick(TransitionReason::Interaction, Some(poke_event()));

        assert_eq!(tick.state.current_action.id, "react_poke");
        assert_eq!(tick.reason, TransitionReason::Interaction);
        assert!(!tick.state.current_action.interruptible);
    }

    #[test]
    fn energy_stays_within_bounds() {
        let mut engine = BehaviorEngine::new(99);

        for _ in 0..200 {
            let _ = engine.tick(TransitionReason::Interaction, Some(poke_event()));
        }
        assert!(engine.current_state().energy <= 100);

        for _ in 0..300 {
            let _ = engine.tick(TransitionReason::Timer, None);
        }
        assert_eq!(engine.current_state().energy, 0);
    }

    #[test]
    fn interaction_energy_clamps_to_hundred_at_boundary() {
        let mut engine = BehaviorEngine::new(17);
        engine.set_energy(99);

        let tick = engine.tick(TransitionReason::Interaction, Some(poke_event()));

        assert_eq!(tick.state.energy, 100);
    }

    #[test]
    fn timer_tick_at_low_energy_floors_to_zero_and_sleeps() {
        let mut engine = BehaviorEngine::new(17);
        engine.set_energy(2);

        let tick = engine.tick(TransitionReason::Timer, None);

        assert_eq!(tick.state.energy, 0);
        assert_eq!(tick.state.current_action.id, "rest_nap");
    }

    #[test]
    fn apply_action_saturates_tick_count() {
        let mut engine = BehaviorEngine::new(17);
        engine.state.tick_count = u64::MAX;

        engine.apply_action(BehaviorAction {
            id: "manual_test".to_string(),
            animation: "idle.blink".to_string(),
            mood: Mood::Idle,
            duration_ms: 1,
            interruptible: true,
        });

        let state = engine.current_state();
        assert_eq!(state.tick_count, u64::MAX);
        assert_eq!(state.last_interaction_at, u64::MAX);
    }

    #[test]
    fn built_in_actions_always_have_positive_duration() {
        let mut engine = BehaviorEngine::new(17);
        let interaction_events = [
            event(UserEventType::Click),
            event(UserEventType::Hover),
            event(UserEventType::DragStart),
            event(UserEventType::DragEnd),
            event(UserEventType::Poke),
        ];

        for event in &interaction_events {
            assert!(engine.interaction_action(event).duration_ms > 0);
        }

        for _ in 0..32 {
            assert!(engine.random_idle_action().duration_ms > 0);
        }

        assert!(BehaviorEngine::sleep_action().duration_ms > 0);
        assert!(BehaviorEngine::hyper_action().duration_ms > 0);
    }

    // ── New tests for personality / mood / energy enhancements ──────────

    #[test]
    fn personality_influences_action_distribution() {
        // Cheerful personality should produce more hops than Stoic.
        fn count_hops(preset: PersonalityPreset, seed: u64) -> usize {
            let mut engine = BehaviorEngine::new(seed);
            engine.set_personality(preset);
            engine.set_energy(70);
            let mut hops = 0;
            for _ in 0..200 {
                let tick = engine.tick(TransitionReason::Timer, None);
                if tick.state.current_action.id == "idle_hop" {
                    hops += 1;
                }
                // Keep energy up so sleep doesn't dominate.
                engine.set_energy(70);
            }
            hops
        }

        let cheerful_hops = count_hops(PersonalityPreset::Cheerful, 42);
        let stoic_hops = count_hops(PersonalityPreset::Stoic, 42);
        assert!(
            cheerful_hops > stoic_hops,
            "Cheerful ({cheerful_hops}) should hop more than Stoic ({stoic_hops})"
        );
    }

    #[test]
    fn mood_influences_next_action_distribution() {
        // When current mood is Sleepy, blink should dominate over hop.
        let mut engine = BehaviorEngine::new(77);
        engine.set_personality(PersonalityPreset::Gentle);
        engine.set_energy(60);

        // Force a sleepy mood via a yawn action.
        engine.state.current_action = BehaviorAction {
            id: "idle_yawn".to_string(),
            animation: "idle.yawn".to_string(),
            mood: Mood::Sleepy,
            duration_ms: 1_800,
            interruptible: true,
        };

        let mut blinks = 0u32;
        let mut hops = 0u32;
        for _ in 0..200 {
            let tick = engine.tick(TransitionReason::Timer, None);
            match tick.state.current_action.id.as_str() {
                "idle_blink" => blinks += 1,
                "idle_hop" => hops += 1,
                _ => {}
            }
            // Re-force sleepy mood and keep energy stable.
            engine.state.current_action.mood = Mood::Sleepy;
            engine.set_energy(60);
        }

        assert!(
            blinks > hops,
            "Sleepy mood: blinks ({blinks}) should exceed hops ({hops})"
        );
    }

    #[test]
    fn nonlinear_energy_decays_faster_at_low_levels() {
        let mut high = BehaviorEngine::new(1);
        high.set_energy(90);
        let _ = high.tick(TransitionReason::Timer, None);
        let high_after = high.current_state().energy;

        let mut low = BehaviorEngine::new(1);
        low.set_energy(30);
        let _ = low.tick(TransitionReason::Timer, None);
        let low_after = low.current_state().energy;

        let high_drain = 90 - high_after;
        let low_drain = 30 - low_after;
        assert!(
            low_drain > high_drain,
            "Low energy drain ({low_drain}) should exceed high energy drain ({high_drain})"
        );
    }

    #[test]
    fn nonlinear_energy_recovers_more_at_high_levels() {
        let mut high = BehaviorEngine::new(1);
        high.set_energy(85);
        let _ = high.tick(TransitionReason::Interaction, Some(poke_event()));
        let high_gain = high.current_state().energy.min(100) - 85_u8.min(100);

        let mut low = BehaviorEngine::new(1);
        low.set_energy(30);
        let _ = low.tick(TransitionReason::Interaction, Some(poke_event()));
        let low_gain = low.current_state().energy - 30;

        assert!(
            high_gain >= low_gain,
            "High-energy recovery ({high_gain}) should be >= low-energy recovery ({low_gain})"
        );
    }

    #[test]
    fn consecutive_interactions_tracked() {
        let mut engine = BehaviorEngine::new(42);

        let _ = engine.tick(TransitionReason::Interaction, Some(poke_event()));
        assert_eq!(engine.current_state().consecutive_interactions, 1);

        let _ = engine.tick(TransitionReason::Interaction, Some(poke_event()));
        assert_eq!(engine.current_state().consecutive_interactions, 2);

        // An idle tick resets the counter.
        engine.set_energy(60);
        let _ = engine.tick(TransitionReason::Timer, None);
        assert_eq!(engine.current_state().consecutive_interactions, 0);
    }

    #[test]
    fn rare_animations_include_stretch() {
        let mut engine = BehaviorEngine::new(42);
        engine.set_personality(PersonalityPreset::Gentle);
        let mut found_stretch = false;
        // Run enough ticks to likely hit rare actions including stretch.
        for _ in 0..500 {
            engine.set_energy(60);
            let tick = engine.tick(TransitionReason::Timer, None);
            if tick.state.current_action.id == "idle_stretch" {
                found_stretch = true;
                break;
            }
        }
        assert!(
            found_stretch,
            "idle_stretch should appear in extended tick runs"
        );
    }

    #[test]
    fn hyperactive_burst_triggers_above_80_energy() {
        let mut engine = BehaviorEngine::new(42);
        let mut got_playful = false;
        for _ in 0..50 {
            engine.set_energy(95);
            let tick = engine.tick(TransitionReason::Timer, None);
            if tick.state.current_action.mood == Mood::Playful {
                got_playful = true;
                break;
            }
        }
        assert!(got_playful, "Should see playful action when energy > 80");
    }

    #[test]
    fn set_personality_changes_engine_preset() {
        let mut engine = BehaviorEngine::new(1);
        assert_eq!(*engine.personality(), PersonalityPreset::Gentle);
        engine.set_personality(PersonalityPreset::Aloof);
        assert_eq!(*engine.personality(), PersonalityPreset::Aloof);
    }

    #[test]
    fn different_personalities_same_seed_diverge() {
        let mut gentle = BehaviorEngine::new(42);
        gentle.set_personality(PersonalityPreset::Gentle);

        let mut cheerful = BehaviorEngine::new(42);
        cheerful.set_personality(PersonalityPreset::Cheerful);

        let mut diverged = false;
        for _ in 0..50 {
            gentle.set_energy(70);
            cheerful.set_energy(70);
            let g = gentle.tick(TransitionReason::Timer, None);
            let c = cheerful.tick(TransitionReason::Timer, None);
            if g.state.current_action.id != c.state.current_action.id {
                diverged = true;
                break;
            }
        }
        assert!(
            diverged,
            "Different personalities should produce different action sequences"
        );
    }
}
