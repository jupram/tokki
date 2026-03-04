use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Mood {
    Idle,
    Curious,
    Playful,
    Sleepy,
    Surprised,
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
