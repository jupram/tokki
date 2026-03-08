use rand::{rngs::StdRng, Rng, SeedableRng};

use super::models::{
    BehaviorAction, BehaviorTickPayload, Mood, TokkiState, TransitionReason, UserEvent,
    UserEventType,
};

#[derive(Debug)]
pub struct BehaviorEngine {
    rng: StdRng,
    state: TokkiState,
}

impl BehaviorEngine {
    pub fn new(seed: u64) -> Self {
        Self {
            rng: StdRng::seed_from_u64(seed),
            state: TokkiState::initial(),
        }
    }

    pub fn reseed(&mut self, seed: u64) {
        self.rng = StdRng::seed_from_u64(seed);
        self.state = TokkiState::initial();
    }

    pub fn current_state(&self) -> TokkiState {
        self.state.clone()
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

        if event.is_some() {
            self.state.last_interaction_at = self.state.tick_count;
            self.state.energy = ((self.state.energy as u16 + 12).min(100)) as u8;
        } else {
            self.state.energy = self.state.energy.saturating_sub(3);
        }

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

    fn random_idle_action(&mut self) -> BehaviorAction {
        // 5% chance of a rare special idle
        if self.rng.gen_range(0..20) == 0 {
            return self.rare_idle_action();
        }

        match self.rng.gen_range(0..=2) {
            0 => BehaviorAction {
                id: "idle_blink".to_string(),
                animation: "idle.blink".to_string(),
                mood: Mood::Idle,
                duration_ms: 1_000,
                interruptible: true,
            },
            1 => BehaviorAction {
                id: "idle_hop".to_string(),
                animation: "idle.hop".to_string(),
                mood: Mood::Playful,
                duration_ms: 950,
                interruptible: true,
            },
            _ => BehaviorAction {
                id: "idle_look".to_string(),
                animation: "idle.look".to_string(),
                mood: Mood::Curious,
                duration_ms: 1_250,
                interruptible: true,
            },
        }
    }

    fn rare_idle_action(&mut self) -> BehaviorAction {
        match self.rng.gen_range(0..=3) {
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
            _ => BehaviorAction {
                id: "idle_headturn".to_string(),
                animation: "idle.headturn".to_string(),
                mood: Mood::Curious,
                duration_ms: 1_100,
                interruptible: true,
            },
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

    fn poke_event() -> UserEvent {
        UserEvent {
            kind: UserEventType::Poke,
            x: None,
            y: None,
            timestamp: 1,
        }
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
}
