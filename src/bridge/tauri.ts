import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  createInitialTokkiState,
  type BehaviorAction,
  type BehaviorTickPayload,
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

export async function requestLlmReply(
  prompt: string,
  options: LlmRequestOptions = {}
): Promise<string> {
  const endpoint = resolveLlmEndpoint(options.endpoint);
  if (!endpoint) {
    return LLM_NOT_CONFIGURED;
  }
  if (!isStandardLlmEndpoint(endpoint)) {
    throw new Error(INVALID_LLM_ENDPOINT);
  }

  if (isTauriRuntime()) {
    return invoke<string>("request_llm_reply", {
      request: {
        prompt,
        endpoint,
        model: options.model
      }
    });
  }

  return LLM_NOT_CONFIGURED;
}
