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
