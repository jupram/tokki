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
  | "rabbit_v2"
  | "cat_v1"
  | "dog_v1"
  | "fox_v2"
  | "dragon_v1"
  | "kitsune_v1"
  | "penguin_v1"
  | "owl_v1";

export const FRONTEND_AVATAR_IDS = [
  "rabbit_v2",
  "cat_v1",
  "dog_v1",
  "fox_v2",
  "dragon_v1",
  "kitsune_v1",
  "penguin_v1",
  "owl_v1",
] as const satisfies readonly AvatarId[];

export type PersonalityPreset =
  | "gentle"
  | "aloof"
  | "clever"
  | "proud"
  | "radiant"
  | "mystical"
  | "stoic"
  | "cheerful"
  | "wise"
  | "serene";

export interface PersonalityConfig {
  name: string;
  preset: PersonalityPreset;
  humor: number;
  reaction_intensity: number;
  chattiness: number;
}

export interface MemoryPreference {
  label: string;
  value: string;
  mentions: number;
  last_mentioned_at: number | null;
}

export interface MemoryHighlight {
  summary: string;
  category: string;
  captured_at: number | null;
}

export interface MemoryProfileFact {
  facet: string;
  value: string;
  mentions: number;
  last_updated_at: number | null;
}

export interface ActiveTimeBand {
  band: string;
  count: number;
  last_seen_at: number | null;
}

export interface SessionMemory {
  user_name: string | null;
  topics: string[];
  preferences: MemoryPreference[];
  profile_facts: MemoryProfileFact[];
  conversation_highlights: MemoryHighlight[];
  mood_history: string[];
  active_time_bands: ActiveTimeBand[];
  first_message_at: number | null;
  last_message_at: number | null;
  message_count: number;
  greet_count: number;
  mood_trend: string;
}

export type ProactiveKind =
  | "welcome_back"
  | "break_reminder"
  | "time_of_day"
  | "seasonal"
  | "mouse_shake"
  | "easter_egg";

export interface ProactiveMessage {
  kind: ProactiveKind;
  line: string;
  mood: string;
  animation: string;
}

export type ProviderKind = "defensive_hub" | "open_ai" | "ollama" | "offline";

export interface ProviderConfig {
  provider: ProviderKind;
  endpoint: string | null;
  model: string | null;
  api_key: string | null;
  max_tokens: number;
  temperature: number;
}

export interface ProviderInfo {
  provider: ProviderKind;
  provider_name: string;
  requires_network: boolean;
  api_key_required: boolean;
  api_key_configured: boolean;
}

export type ProviderHealthStatus = "healthy" | "degraded" | "unavailable";

export interface ProviderHealth {
  provider: ProviderKind;
  provider_name: string;
  status: ProviderHealthStatus;
  reason: string;
  requires_network: boolean;
  api_key_required: boolean;
  api_key_configured: boolean;
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
