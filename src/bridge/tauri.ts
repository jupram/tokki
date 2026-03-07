import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import {
  createInitialTokkiState,
  type AvatarId,
  type BehaviorAction,
  type BehaviorTickPayload,
  type ChatMessage,
  type ChatResponse,
  type LlmResponse,
  type SessionMemory,
  type TokkiState,
  type TransitionReason,
  type UserEvent
} from "../types/tokki";

const BEHAVIOR_TICK_EVENT = "tokki://behavior_tick";
const LLM_NOT_CONFIGURED = "llm not configured";
const INVALID_LLM_ENDPOINT =
  "invalid llm endpoint: use /v1/responses or /v1/chat/completions (OpenAI-compatible)";

type TickHandler = (payload: BehaviorTickPayload) => void;

export interface LlmRequestOptions {
  endpoint?: string;
  model?: string;
}

const fallbackListeners = new Set<TickHandler>();
let fallbackLoop: ReturnType<typeof setInterval> | null = null;
let fallbackState: TokkiState = createInitialTokkiState();
let fallbackSeed = 1337;
let fallbackChatHistory: ChatMessage[] = [];
// Limit the number of messages kept in in-memory fallback chat history.
// 200 is a conservative upper bound chosen to prevent unbounded growth
// while still supporting reasonably long sessions; adjust if usage or
// memory constraints change.
const MAX_FALLBACK_CHAT_HISTORY = 200;

const COLLAPSED_WINDOW_SIZE = { width: 180, height: 180 };
const EXPANDED_WINDOW_SIZE = { width: 320, height: 290 };

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return "__TAURI_INTERNALS__" in window;
}

function sanitizeValue(value?: string): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveLlmEndpoint(overrideEndpoint?: string): string | null {
  const fromOverride = sanitizeValue(overrideEndpoint);
  if (fromOverride) {
    return fromOverride;
  }

  return sanitizeValue(import.meta.env.VITE_LLM_ENDPOINT as string | undefined);
}

function isStandardLlmEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  const path = url.pathname.replace(/\/+$/, "").toLowerCase();
  if (path.endsWith("/v1/responses") || path.endsWith("/v1/chat/completions")) {
    return true;
  }

  return (
    path.includes("/openai/deployments/") &&
    (path.endsWith("/chat/completions") || path.endsWith("/responses"))
  );
}

function seededRandom(): number {
  fallbackSeed = (fallbackSeed * 1664525 + 1013904223) >>> 0;
  return fallbackSeed / 2 ** 32;
}

function randomIdleAction(): BehaviorAction {
  const actions: BehaviorAction[] = [
    {
      id: "idle_blink",
      animation: "idle.blink",
      mood: "idle",
      duration_ms: 1000,
      interruptible: true
    },
    {
      id: "idle_hop",
      animation: "idle.hop",
      mood: "playful",
      duration_ms: 900,
      interruptible: true
    },
    {
      id: "idle_look",
      animation: "idle.look",
      mood: "curious",
      duration_ms: 1250,
      interruptible: true
    }
  ];
  const pick = Math.floor(seededRandom() * actions.length);
  return actions[pick];
}

function interactionAction(eventType: UserEvent["type"]): BehaviorAction {
  switch (eventType) {
    case "poke":
      return {
        id: "react_poke",
        animation: "react.poke",
        mood: "surprised",
        duration_ms: 650,
        interruptible: false
      };
    case "hover":
      return {
        id: "react_hover",
        animation: "react.hover",
        mood: "curious",
        duration_ms: 600,
        interruptible: true
      };
    case "drag_start":
    case "drag_end":
      return {
        id: "react_drag",
        animation: "react.drag",
        mood: "surprised",
        duration_ms: 700,
        interruptible: false
      };
    case "click":
    default:
      return {
        id: "react_click",
        animation: "react.click",
        mood: "playful",
        duration_ms: 550,
        interruptible: true
      };
  }
}

function updateFallbackState(
  reason: TransitionReason,
  event?: UserEvent
): BehaviorTickPayload {
  fallbackState.tick_count += 1;

  let nextAction = randomIdleAction();
  if (event) {
    nextAction = interactionAction(event.type);
    fallbackState.last_interaction_at = fallbackState.tick_count;
    fallbackState.energy = Math.min(100, fallbackState.energy + 10);
  } else {
    fallbackState.energy = Math.max(0, fallbackState.energy - 2);
  }

  if (!event && fallbackState.energy < 20) {
    nextAction = {
      id: "rest_nap",
      animation: "rest.nap",
      mood: "sleepy",
      duration_ms: 1500,
      interruptible: true
    };
  }

  fallbackState = {
    ...fallbackState,
    current_action: nextAction
  };

  return {
    state: fallbackState,
    reason
  };
}

function emitFallback(reason: TransitionReason, event?: UserEvent): BehaviorTickPayload {
  const tick = updateFallbackState(reason, event);
  fallbackListeners.forEach((handler) => handler(tick));
  return tick;
}

const CANNED_REPLIES: Array<{ line: string; mood: LlmResponse["mood"]; intent: string }> = [
  { line: "Hi there! I'm Tokki, your desktop buddy!", mood: "playful", intent: "greet" },
  { line: "Hmm, that's interesting... let me think about that!", mood: "curious", intent: "think" },
  { line: "Hehe, you're fun to talk to!", mood: "playful", intent: "joke" },
  { line: "I'm just a little rabbit living on your screen~", mood: "idle", intent: "none" },
  { line: "*wiggles ears* Did you need something?", mood: "curious", intent: "help" },
  { line: "Zzz... oh! Sorry, dozed off for a sec.", mood: "sleepy", intent: "none" },
  { line: "Whoa, that's quite a question!", mood: "surprised", intent: "think" },
];

function fallbackChatReply(message: string): LlmResponse {
  const lower = message.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return { ...CANNED_REPLIES[0], animation: "idle.hop" };
  }
  if (lower.includes("?")) {
    return { ...CANNED_REPLIES[1], animation: "idle.look" };
  }
  const pick = Math.floor(seededRandom() * CANNED_REPLIES.length);
  return { ...CANNED_REPLIES[pick], animation: "idle.blink" };
}

function toLlmResponse(line: string): LlmResponse {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("?")) {
    return { line: trimmed, mood: "curious", animation: "idle.look", intent: "think" };
  }
  if (lower.includes("!") || lower.includes("great")) {
    return { line: trimmed, mood: "playful", animation: "idle.hop", intent: "chat" };
  }
  return { line: trimmed, mood: "idle", animation: "idle.blink", intent: "chat" };
}

function appendFallbackHistory(message: ChatMessage): void {
  fallbackChatHistory.push(message);
  if (fallbackChatHistory.length > MAX_FALLBACK_CHAT_HISTORY) {
    fallbackChatHistory.splice(0, fallbackChatHistory.length - MAX_FALLBACK_CHAT_HISTORY);
  }
}

async function sendFallbackChatMessage(message: string): Promise<ChatResponse> {
  const now = Date.now();
  appendFallbackHistory({
    role: "user",
    content: message,
    timestamp: now
  });

  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

  const reply = fallbackChatReply(message);
  appendFallbackHistory({
    role: "assistant",
    content: reply.line,
    timestamp: Date.now()
  });

  const tick = emitFallback("manual");
  return { reply, tick };
}

export function parseBehaviorTickPayload(value: unknown): BehaviorTickPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<BehaviorTickPayload>;
  if (!payload.state || typeof payload.state !== "object") {
    return null;
  }

  const reason = payload.reason;
  if (
    reason !== "timer" &&
    reason !== "interaction" &&
    reason !== "recovery" &&
    reason !== "manual"
  ) {
    return null;
  }

  return payload as BehaviorTickPayload;
}

export async function startBehaviorLoop(seed?: number): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("start_behavior_loop", { seed });
    return;
  }

  if (typeof seed === "number" && Number.isFinite(seed)) {
    fallbackSeed = seed >>> 0;
  }

  if (fallbackLoop) {
    return;
  }

  fallbackLoop = setInterval(() => {
    emitFallback("timer");
  }, 1200);
}

export async function stopBehaviorLoop(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("stop_behavior_loop");
    return;
  }

  if (fallbackLoop) {
    clearInterval(fallbackLoop);
    fallbackLoop = null;
  }
}

export async function handleUserInteraction(
  event: UserEvent
): Promise<BehaviorTickPayload> {
  if (isTauriRuntime()) {
    return invoke<BehaviorTickPayload>("handle_user_interaction", { event });
  }

  return emitFallback("interaction", event);
}

export async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await getCurrentWindow().startDragging();
}

export async function setChatPanelOpen(open: boolean): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const target = open ? EXPANDED_WINDOW_SIZE : COLLAPSED_WINDOW_SIZE;
  try {
    await getCurrentWindow().setSize(new LogicalSize(target.width, target.height));
  } catch {
    return;
  }
}

export async function getCurrentState(): Promise<TokkiState> {
  if (isTauriRuntime()) {
    return invoke<TokkiState>("get_current_state");
  }
  return fallbackState;
}

export async function subscribeBehaviorTick(handler: TickHandler): Promise<() => void> {
  if (isTauriRuntime()) {
    const unlisten = await listen<unknown>(BEHAVIOR_TICK_EVENT, (event) => {
      const parsed = parseBehaviorTickPayload(event.payload);
      if (parsed) {
        handler(parsed);
      }
    });
    return () => {
      void unlisten();
    };
  }

  fallbackListeners.add(handler);
  return () => {
    fallbackListeners.delete(handler);
  };
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  const llmText = await requestLlmReply(message);
  if (llmText === LLM_NOT_CONFIGURED) {
    return sendFallbackChatMessage(message);
  }
  if (!llmText.trim()) {
    return sendFallbackChatMessage(message);
  }

  const now = Date.now();
  const reply = toLlmResponse(llmText);
  appendFallbackHistory({ role: "user", content: message, timestamp: now });
  appendFallbackHistory({
    role: "assistant",
    content: reply.line,
    timestamp: Date.now()
  });
export async function getChatHistory(): Promise<readonly ChatMessage[]> {
  return fallbackChatHistory;
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  return [...fallbackChatHistory];
}

export async function setAvatar(avatarId: AvatarId): Promise<void> {
  void avatarId;
}

export async function getSessionMemory(): Promise<SessionMemory> {
  return {
    user_name: null,
    topics: [],
    message_count: 0,
    greet_count: 0,
    mood_trend: ""
  };
}

export async function requestLlmReply(
  prompt: string,
  options: LlmRequestOptions = {}
): Promise<string> {
  const endpoint = resolveLlmEndpoint(options.endpoint);
  if (endpoint && !isStandardLlmEndpoint(endpoint)) {
    throw new Error(INVALID_LLM_ENDPOINT);
  }

  if (isTauriRuntime()) {
    return invoke<string>("request_llm_reply", {
      request: {
        prompt,
        endpoint: endpoint ?? undefined,
        model: options.model
      }
    });
  }

  return LLM_NOT_CONFIGURED;
}
