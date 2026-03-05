export type Mood = "idle" | "curious" | "playful" | "sleepy" | "surprised";

export type TransitionReason = "timer" | "interaction" | "recovery" | "manual";

export type UserEventType =
  | "click"
  | "hover"
  | "drag_start"
  | "drag_end"
  | "poke";

export interface UserEvent {
  type: UserEventType;
  x?: number;
  y?: number;
  timestamp: number;
}

export interface BehaviorAction {
  id: string;
  animation: string;
  mood: Mood;
  duration_ms: number;
  interruptible: boolean;
}

export interface TokkiState {
  current_action: BehaviorAction;
  queue: BehaviorAction[];
  energy: number;
  last_interaction_at: number;
  tick_count: number;
}

export interface BehaviorTickPayload {
  state: TokkiState;
  reason: TransitionReason;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface LlmResponse {
  line: string;
  mood: Mood;
  animation: string;
  intent: string;
}

export interface ChatResponse {
  reply: LlmResponse;
  tick: BehaviorTickPayload;
}

export type AvatarId =
  | "rabbit_v1" | "rabbit_v2"
  | "cat_v1" | "cat_v2"
  | "dog_v1"
  | "fox_v1" | "fox_v2"
  | "dragon_v1"
  | "phoenix_v1"
  | "kitsune_v1"
  | "serpent_v1"
  | "penguin_v1"
  | "turtle_v1"
  | "owl_v1";

export interface SessionMemory {
  user_name: string | null;
  topics: string[];
  message_count: number;
  greet_count: number;
  mood_trend: string;
}

export function createInitialTokkiState(): TokkiState {
  return {
    current_action: {
      id: "idle_blink",
      animation: "idle.blink",
      mood: "idle",
      duration_ms: 1000,
      interruptible: true
    },
    queue: [],
    energy: 70,
    last_interaction_at: 0,
    tick_count: 0
  };
}
