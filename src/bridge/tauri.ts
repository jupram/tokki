import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, PhysicalPosition, currentMonitor } from "@tauri-apps/api/window";
import {
  createInitialTokkiState,
  type AvatarId,
  type BehaviorAction,
  type BehaviorTickPayload,
  type ChatMessage,
  type ChatResponse,
  type LlmResponse,
  type PersonalityConfig,
  type ProactiveMessage,
  type ProviderConfig,
  type ProviderHealth,
  type ProviderKind,
  type ProviderInfo,
  type SessionMemory,
  type TokkiState,
  type TransitionReason,
  type UserEvent
} from "../types/tokki";

// ---------------------------------------------------------------------------
// Memory Context — structured frontend view of the user/companion relationship
// ---------------------------------------------------------------------------

export interface MemoryContext {
  userName: string | null;
  companionName: string;
  bondLevel: number;
  topTopics: string[];
  lastInteractionAge: string;
  conversationCount: number;
  personalityTraits: string[];
  isFirstSession: boolean;
}

export interface ExportMemoryOptions {
  includeChatHistory?: boolean;
}

export interface ImportMemoryResult {
  avatarId: AvatarId;
  personality: PersonalityConfig;
  userName: string | null;
  chatHistoryImported: boolean;
  chatHistory: ChatMessage[];
}

interface PortableMemoryExportPayload {
  format_version: number;
  exported_at: string;
  session: SessionMemory;
  personality: {
    name: string;
    preset: string;
    humor: number;
    reaction_intensity: number;
    chattiness: number;
  };
  provider: {
    provider: ProviderKind;
    endpoint: string | null;
    model: string | null;
    max_tokens: number;
    temperature: number;
  };
  avatar_id: AvatarId;
  chat_history?: ChatMessage[];
}
type PortableMemoryImportPayload = Partial<PortableMemoryExportPayload> & {
  format_version?: unknown;
  session?: unknown;
  personality?: unknown;
  provider?: unknown;
  avatar_id?: unknown;
  chat_history?: unknown;
};

interface NativeImportMemoryResult {
  avatar_id: AvatarId;
  personality: PersonalityConfig;
  user_name: string | null;
  chat_history_imported: boolean;
  chat_history: ChatMessage[];
}

import {
  createOnboardingProfile,
  getDefaultPersonalityForAvatar,
  loadOnboardingProfile,
  normalizeAvatarId,
} from "../utils/onboardingProfile";
import { createProviderConfig, sanitizeProviderConfig } from "../utils/providerConfig";
import {
  appendPersistedMessage,
  clearPersistedMessages,
  loadPersistedMessages,
  replacePersistedMessages,
  trimPersistedMessages,
} from "./chatStorage";

const BEHAVIOR_TICK_EVENT = "tokki://behavior_tick";
const PROACTIVE_MESSAGE_EVENT = "tokki://proactive_message";
const FALLBACK_PROVIDER_CONFIG_KEY = "tokki_provider_config";
const FALLBACK_SESSION_MEMORY_KEY = "tokki_session_memory";
const MAX_FALLBACK_CHAT_HISTORY = 200;
const MAX_MESSAGE_LENGTH = 2000;
const PORTABLE_MEMORY_VERSION = 3;
const MAX_IMPORT_STRING_LENGTH = 200;
const MAX_IMPORT_TOPIC_LENGTH = 100;
const MAX_IMPORT_ARRAY_LENGTH = 50;
const MAX_IMPORT_CHAT_MESSAGE_LENGTH = 2000;

type TickHandler = (payload: BehaviorTickPayload) => void;

const fallbackListeners = new Set<TickHandler>();
let fallbackLoop: ReturnType<typeof setInterval> | null = null;
let fallbackState: TokkiState = createInitialTokkiState();
let fallbackSeed = 1337;
let fallbackChatHistory: ChatMessage[] = [];
let fallbackAvatarId: AvatarId = "rabbit_v2";
let fallbackPersonality: PersonalityConfig = getDefaultPersonalityForAvatar(fallbackAvatarId);
let fallbackProviderConfig: ProviderConfig = createProviderConfig();
let fallbackProviderApiKeys: Partial<Record<ProviderKind, string>> = {};

// Lazy promise that pre-loads persistent chat history into fallbackChatHistory on first use.
let _fallbackStorageReady: Promise<void> | null = null;

function ensureFallbackStorageLoaded(): Promise<void> {
  if (_fallbackStorageReady) return _fallbackStorageReady;
  _fallbackStorageReady = loadPersistedMessages(MAX_FALLBACK_CHAT_HISTORY)
    .then((msgs) => {
      if (msgs.length > 0) {
        if (fallbackChatHistory.length === 0) {
          fallbackChatHistory = msgs;
        } else {
          // Merge: stored messages + any added before the load completed.
          // De-dup by timestamp (last write wins for identical timestamps).
          const byTime = new Map<number, ChatMessage>();
          for (const m of msgs) byTime.set(m.timestamp, m);
          for (const m of fallbackChatHistory) byTime.set(m.timestamp, m);
          fallbackChatHistory = [...byTime.values()]
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-MAX_FALLBACK_CHAT_HISTORY);
        }
      }
    })
    .catch(() => {
      // Storage errors are non-fatal; continue with the in-memory history.
    });
  return _fallbackStorageReady;
}

export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return "__TAURI_INTERNALS__" in window;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function truncateAtCharBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return [...value].slice(0, maxLength).join("");
}

function sanitizeText(value: unknown, fallback = "", maxLength = MAX_IMPORT_STRING_LENGTH): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return truncateAtCharBoundary(value.trim(), maxLength);
}

function sanitizeOptionalText(
  value: unknown,
  fallback: string | null,
  maxLength = MAX_IMPORT_STRING_LENGTH,
): string | null {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = truncateAtCharBoundary(value.trim(), maxLength);
  return trimmed || null;
}

function clampNonNegativeInt(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
}

function sanitizeTimestamp(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value);
}

function createEmptySessionMemory(userName: string | null = null): SessionMemory {
  return {
    user_name: userName,
    topics: [],
    preferences: [],
    profile_facts: [],
    conversation_highlights: [],
    mood_history: [],
    active_time_bands: [],
    first_message_at: null,
    last_message_at: null,
    message_count: 0,
    greet_count: 0,
    mood_trend: "",
  };
}

function sanitizeSessionMemory(value: unknown, fallbackUserName: string | null): SessionMemory {
  if (!isRecord(value)) {
    return createEmptySessionMemory(fallbackUserName);
  }

  const preferences = Array.isArray(value.preferences)
    ? value.preferences.slice(0, MAX_IMPORT_ARRAY_LENGTH).map((preference) => {
      const record = isRecord(preference) ? preference : {};
      return {
        label: sanitizeText(record.label),
        value: sanitizeText(record.value),
        mentions: clampNonNegativeInt(record.mentions, 1),
        last_mentioned_at: sanitizeTimestamp(record.last_mentioned_at),
      };
    })
    : [];

  const profileFacts = Array.isArray(value.profile_facts)
    ? value.profile_facts.slice(0, MAX_IMPORT_ARRAY_LENGTH).map((fact) => {
      const record = isRecord(fact) ? fact : {};
      return {
        facet: sanitizeText(record.facet, "", MAX_IMPORT_TOPIC_LENGTH),
        value: sanitizeText(record.value),
        mentions: clampNonNegativeInt(record.mentions, 1),
        last_updated_at: sanitizeTimestamp(record.last_updated_at),
      };
    })
    : [];

  const conversationHighlights = Array.isArray(value.conversation_highlights)
    ? value.conversation_highlights.slice(0, MAX_IMPORT_ARRAY_LENGTH).map((highlight) => {
      const record = isRecord(highlight) ? highlight : {};
      return {
        summary: sanitizeText(record.summary),
        category: sanitizeText(record.category, "", MAX_IMPORT_TOPIC_LENGTH),
        captured_at: sanitizeTimestamp(record.captured_at),
      };
    })
    : [];

  const activeTimeBands = Array.isArray(value.active_time_bands)
    ? value.active_time_bands.slice(0, MAX_IMPORT_ARRAY_LENGTH).map((band) => {
      const record = isRecord(band) ? band : {};
      return {
        band: sanitizeText(record.band, "", MAX_IMPORT_TOPIC_LENGTH),
        count: clampNonNegativeInt(record.count),
        last_seen_at: sanitizeTimestamp(record.last_seen_at),
      };
    })
    : [];

  return {
    user_name: sanitizeOptionalText(value.user_name, fallbackUserName),
    topics: Array.isArray(value.topics)
      ? value.topics
        .slice(0, MAX_IMPORT_ARRAY_LENGTH)
        .map((topic) => sanitizeText(topic, "", MAX_IMPORT_TOPIC_LENGTH))
        .filter(Boolean)
      : [],
    preferences,
    profile_facts: profileFacts,
    conversation_highlights: conversationHighlights,
    mood_history: Array.isArray(value.mood_history)
      ? value.mood_history
        .slice(0, MAX_IMPORT_ARRAY_LENGTH)
        .map((mood) => sanitizeText(mood, "", MAX_IMPORT_TOPIC_LENGTH))
        .filter(Boolean)
      : [],
    active_time_bands: activeTimeBands,
    first_message_at: sanitizeTimestamp(value.first_message_at),
    last_message_at: sanitizeTimestamp(value.last_message_at),
    message_count: clampNonNegativeInt(value.message_count),
    greet_count: clampNonNegativeInt(value.greet_count),
    mood_trend: sanitizeText(value.mood_trend, "", MAX_IMPORT_TOPIC_LENGTH),
  };
}

function readStoredFallbackSessionMemory(): SessionMemory | null {
  if (!hasStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(FALLBACK_SESSION_MEMORY_KEY);
  if (!raw) {
    return null;
  }

  try {
    const onboardingProfile = loadOnboardingProfile();
    return sanitizeSessionMemory(JSON.parse(raw), onboardingProfile?.userName ?? null);
  } catch {
    return null;
  }
}

function persistFallbackSessionMemory(memory: SessionMemory): void {
  if (!hasStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(FALLBACK_SESSION_MEMORY_KEY, JSON.stringify(memory));
  } catch {
    // Ignore storage failures so fallback mode can keep running.
  }
}

function sanitizeChatHistory(value: unknown): { imported: boolean; messages: ChatMessage[] } {
  if (!Array.isArray(value)) {
    return { imported: false, messages: [] };
  }

  const messages = value
    .map((message) => {
      const record = isRecord(message) ? message : {};
      return {
        role: sanitizeText(record.role).toLowerCase() === "user" ? "user" as const : "assistant" as const,
        content: sanitizeText(record.content, "", MAX_IMPORT_CHAT_MESSAGE_LENGTH),
        timestamp: sanitizeTimestamp(record.timestamp) ?? Date.now(),
      };
    })
    .slice(-MAX_FALLBACK_CHAT_HISTORY);

  return { imported: true, messages };
}

function parsePortableMemoryBundle(json: string): {
  avatarId: AvatarId;
  personality: PersonalityConfig;
  sessionMemory: SessionMemory;
  chatHistoryImported: boolean;
  chatHistory: ChatMessage[];
} {
  let parsed: PortableMemoryImportPayload;
  try {
    parsed = JSON.parse(json) as PortableMemoryImportPayload;
  } catch {
    throw new Error("That memory bundle isn't valid JSON yet.");
  }

  if (!isRecord(parsed)) {
    throw new Error("That memory bundle is missing its Tokki details.");
  }

  const formatVersion = typeof parsed.format_version === "number"
    ? Math.round(parsed.format_version)
    : 0;
  if (formatVersion < 1 || formatVersion > PORTABLE_MEMORY_VERSION) {
    throw new Error(`This memory bundle uses format ${formatVersion}, which Tokki can't open here yet.`);
  }

  const avatarId = normalizeAvatarId(parsed.avatar_id);
  if (!avatarId) {
    throw new Error("That memory bundle is missing a supported avatar.");
  }

  const onboardingProfile = loadOnboardingProfile();
  const sessionMemory = sanitizeSessionMemory(parsed.session, onboardingProfile?.userName ?? null);
  const profile = createOnboardingProfile({
    avatarId,
    userName: sessionMemory.user_name,
    personality: isRecord(parsed.personality) ? parsed.personality as Partial<PersonalityConfig> : undefined,
  });
  const { imported: chatHistoryImported, messages: chatHistory } = sanitizeChatHistory(parsed.chat_history);

  return {
    avatarId,
    personality: profile.personality,
    sessionMemory,
    chatHistoryImported,
    chatHistory,
  };
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read that file."));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  });
}

function mapNativeImportMemoryResult(result: NativeImportMemoryResult): ImportMemoryResult {
  return {
    avatarId: result.avatar_id,
    personality: result.personality,
    userName: result.user_name,
    chatHistoryImported: result.chat_history_imported,
    chatHistory: result.chat_history,
  };
}

async function applyFallbackImportedMemory(
  bundle: ReturnType<typeof parsePortableMemoryBundle>,
): Promise<ImportMemoryResult> {
  fallbackAvatarId = bundle.avatarId;
  fallbackPersonality = { ...bundle.personality };
  persistFallbackSessionMemory(bundle.sessionMemory);

  if (bundle.chatHistoryImported) {
    fallbackChatHistory = [...bundle.chatHistory];
    _fallbackStorageReady = Promise.resolve();
    await replacePersistedMessages(bundle.chatHistory);
  }

  return {
    avatarId: bundle.avatarId,
    personality: bundle.personality,
    userName: bundle.sessionMemory.user_name,
    chatHistoryImported: bundle.chatHistoryImported,
    chatHistory: bundle.chatHistory,
  };
}

function resolveExportFilename(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return `tokki-export-${Date.now()}.json`;
  }

  const normalized = trimmed.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? trimmed;
}

function buildFallbackPortableMemoryExport(
  session: SessionMemory,
  personality: PersonalityConfig,
  providerConfig: ProviderConfig,
  avatarId: AvatarId,
  chatHistory?: ChatMessage[],
): PortableMemoryExportPayload {
  return {
    format_version: PORTABLE_MEMORY_VERSION,
    exported_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    session,
    personality: {
      name: personality.name,
      preset: personality.preset,
      humor: personality.humor,
      reaction_intensity: personality.reaction_intensity,
      chattiness: personality.chattiness,
    },
    provider: {
      provider: providerConfig.provider,
      endpoint: providerConfig.endpoint ?? null,
      model: providerConfig.model ?? null,
      max_tokens: providerConfig.max_tokens,
      temperature: providerConfig.temperature,
    },
    avatar_id: avatarId,
    ...(chatHistory ? { chat_history: chatHistory } : {}),
  };
}

async function downloadPortableMemoryExport(
  path: string,
  payload: PortableMemoryExportPayload,
): Promise<void> {
  if (
    typeof document === "undefined" ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function" ||
    typeof URL.revokeObjectURL !== "function"
  ) {
    throw new Error("memory export is unavailable in this browser environment");
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = resolveExportFilename(path);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function providerNeedsApiKey(provider: ProviderKind): boolean {
  return provider === "defensive_hub" || provider === "open_ai";
}

function hasFallbackProviderApiKey(provider: ProviderKind): boolean {
  const key = fallbackProviderApiKeys[provider];
  return typeof key === "string" && key.trim().length > 0;
}

function fallbackProviderInfo(provider: ProviderKind): ProviderInfo {
  const apiKeyRequired = providerNeedsApiKey(provider);
  const apiKeyConfigured = !apiKeyRequired || hasFallbackProviderApiKey(provider);

  switch (provider) {
    case "defensive_hub":
      return {
        provider,
        provider_name: "DefensiveHub",
        requires_network: true,
        api_key_required: apiKeyRequired,
        api_key_configured: apiKeyConfigured,
      };
    case "open_ai":
      return {
        provider,
        provider_name: "OpenAI-compatible",
        requires_network: true,
        api_key_required: apiKeyRequired,
        api_key_configured: apiKeyConfigured,
      };
    case "ollama":
      return {
        provider,
        provider_name: "Ollama",
        requires_network: false,
        api_key_required: apiKeyRequired,
        api_key_configured: apiKeyConfigured,
      };
    case "offline":
    default:
      return {
        provider: "offline",
        provider_name: "Offline (Template)",
        requires_network: false,
        api_key_required: false,
        api_key_configured: true,
      };
  }
}

function fallbackProviderHealth(provider: ProviderKind): ProviderHealth {
  const info = fallbackProviderInfo(provider);

  if (provider === "offline") {
    return {
      ...info,
      status: "healthy",
      reason: "offline mode ready: template responses are available",
    };
  }

  if (info.api_key_required && !info.api_key_configured) {
    return {
      ...info,
      status: "degraded",
      reason: `${info.provider_name} API key is not configured; Tokki will fall back to offline replies`,
    };
  }

  return {
    ...info,
    status: "healthy",
    reason: provider === "ollama"
      ? "Ollama is configured and ready for local requests"
      : `${info.provider_name} is configured and ready for requests`,
  };
}

function readStoredFallbackProviderConfig(): ProviderConfig {
  if (!hasStorage()) {
    return createProviderConfig();
  }

  const raw = window.localStorage.getItem(FALLBACK_PROVIDER_CONFIG_KEY);
  if (!raw) {
    fallbackProviderApiKeys = {};
    return createProviderConfig();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProviderConfig>;
    return sanitizeProviderConfig({
      ...createProviderConfig(
        parsed.provider === "defensive_hub"
          || parsed.provider === "open_ai"
          || parsed.provider === "ollama"
          || parsed.provider === "offline"
          ? parsed.provider
          : "offline",
      ),
      ...parsed,
      api_key: null,
    });
  } catch {
    fallbackProviderApiKeys = {};
    return createProviderConfig();
  }
}

function syncFallbackProviderConfig(): ProviderConfig {
  fallbackProviderConfig = readStoredFallbackProviderConfig();
  return fallbackProviderConfig;
}

function persistFallbackProviderConfig(config: ProviderConfig): void {
  fallbackProviderConfig = sanitizeProviderConfig({ ...config, api_key: null });

  if (!hasStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(
      FALLBACK_PROVIDER_CONFIG_KEY,
      JSON.stringify(fallbackProviderConfig),
    );
  } catch {
    // Ignore storage failures so the preview runtime can keep going.
  }
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

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "unknown error";
}

function compactErrorMessage(message: string, maxLength = 96): string {
  const compact = message.trim().replace(/\s+/g, " ");
  if (!compact) {
    return "provider unavailable";
  }

  if (compact.length > maxLength) {
    return `${compact.slice(0, maxLength)}…`;
  }

  return compact;
}

async function buildChatFallbackResponse(message: string, error: unknown): Promise<ChatResponse> {
  const providerInfo = await getProviderInfo().catch(() => null);
  const reply = fallbackChatReply(message);
  const reason = compactErrorMessage(normalizeErrorMessage(error));
  const providerLabel = providerInfo?.provider_name ?? "your current provider";
  const prefix = providerInfo?.provider === "offline"
    ? `I hit a local offline hiccup (${reason}).`
    : `I couldn't reach ${providerLabel} (${reason}), so I'm replying in offline mode.`;

  const tick = isTauriRuntime()
    ? await invoke<TokkiState>("get_current_state")
      .then((state) => ({ state, reason: "manual" as const }))
      .catch(() => emitFallback("manual"))
    : emitFallback("manual");

  return {
    reply: {
      ...reply,
      line: `${prefix} ${reply.line}`,
      intent: "offline_fallback",
    },
    tick,
  };
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
  // Return a shallow copy to match Tauri deserialization behavior
  return { ...fallbackState, current_action: { ...fallbackState.current_action }, queue: [...fallbackState.queue] };
}

export async function advanceTick(): Promise<BehaviorTickPayload> {
  if (isTauriRuntime()) {
    return invoke<BehaviorTickPayload>("advance_tick");
  }
  return emitFallback("timer");
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
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("message must not be empty");
  }
  const capped = trimmed.length > MAX_MESSAGE_LENGTH ? trimmed.slice(0, MAX_MESSAGE_LENGTH) : trimmed;

  if (isTauriRuntime()) {
    try {
      return await invoke<ChatResponse>("send_chat_message", { message: capped });
    } catch (error) {
      console.error("send_chat_message failed, using bridge offline fallback", error);
      return buildChatFallbackResponse(capped, error);
    }
  }

  // Ensure previous session's history is loaded before we append new messages.
  await ensureFallbackStorageLoaded();

  const now = Date.now();
  const userMsg: ChatMessage = { role: "user", content: capped, timestamp: now };
  fallbackChatHistory.push(userMsg);
  void appendPersistedMessage(userMsg);

  // Simulate typing delay
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

  const reply = fallbackChatReply(capped);
  const assistantMsg: ChatMessage = { role: "assistant", content: reply.line, timestamp: Date.now() };
  fallbackChatHistory.push(assistantMsg);
  void appendPersistedMessage(assistantMsg);

  if (fallbackChatHistory.length > MAX_FALLBACK_CHAT_HISTORY) {
    fallbackChatHistory = fallbackChatHistory.slice(-MAX_FALLBACK_CHAT_HISTORY);
    void trimPersistedMessages(MAX_FALLBACK_CHAT_HISTORY);
  }

  const tick = emitFallback("manual");

  return { reply, tick };
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  if (isTauriRuntime()) {
    return invoke<ChatMessage[]>("get_chat_history");
  }
  await ensureFallbackStorageLoaded();
  return [...fallbackChatHistory];
}

/**
 * Clear all persisted and in-memory fallback chat history.
 * Intended for use in tests and the "clear conversation" feature.
 */
export async function clearFallbackChatStorage(): Promise<void> {
  await clearPersistedMessages();
  fallbackChatHistory = [];
  _fallbackStorageReady = null;
}

/**
 * Clear the current conversation transcript.
 * Clears runtime chat history and persisted storage in both Tauri and browser modes.
 * Long-term session memory (personality, preferences, topics) is preserved.
 */
export async function clearChatHistory(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("clear_chat_history");
    return;
  }
  await clearFallbackChatStorage();
}

export async function setAvatar(avatarId: AvatarId): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("set_avatar", { avatarId });
    return;
  }

  if (fallbackAvatarId !== avatarId) {
    fallbackAvatarId = avatarId;
    fallbackPersonality = getDefaultPersonalityForAvatar(avatarId);
  }
}

export async function getSessionMemory(): Promise<SessionMemory> {
  if (isTauriRuntime()) {
    return invoke<SessionMemory>("get_session_memory");
  }

  const onboardingProfile = loadOnboardingProfile();
  return readStoredFallbackSessionMemory() ?? createEmptySessionMemory(onboardingProfile?.userName ?? null);
}

// ---------------------------------------------------------------------------
// Bond Level Computation
// ---------------------------------------------------------------------------

/**
 * Compute a 0–100 bond level from raw session memory metrics.
 *
 * 0-20  Strangers (just met)
 * 21-40 Acquaintances (few conversations)
 * 41-60 Friends (regular interactions)
 * 61-80 Close friends (deep conversations, many topics)
 * 81-100 Best friends (long history, many highlights)
 */
export function computeBondLevel(memory: SessionMemory): number {
  const msgScore = memory.message_count;
  const factScore = memory.profile_facts.length * 6;
  const highlightScore = memory.conversation_highlights.length * 4;
  const topicScore = memory.topics.length * 3;
  const prefScore = memory.preferences.length * 2;
  const raw = msgScore + factScore + highlightScore + topicScore + prefScore;
  return Math.min(100, raw);
}

// ---------------------------------------------------------------------------
// Last Interaction Age — human-readable relative time
// ---------------------------------------------------------------------------

function formatInteractionAge(timestampMs: number | null): string {
  if (timestampMs == null || timestampMs <= 0) return "never";

  const nowMs = Date.now();
  // timestamps from the Rust side may be in seconds (unix epoch)
  const ts = timestampMs < 1e12 ? timestampMs * 1000 : timestampMs;
  const diffMs = nowMs - ts;

  if (diffMs < 0) return "just now";
  const diffMin = diffMs / 60_000;
  if (diffMin < 2) return "just now";
  if (diffMin < 30) return "a few minutes ago";

  const diffHours = diffMin / 60;
  if (diffHours < 1) return "less than an hour ago";

  const nowDate = new Date(nowMs);
  const tsDate = new Date(ts);
  const sameDay =
    nowDate.getFullYear() === tsDate.getFullYear() &&
    nowDate.getMonth() === tsDate.getMonth() &&
    nowDate.getDate() === tsDate.getDate();

  if (sameDay) return "earlier today";

  const yesterday = new Date(nowMs);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === tsDate.getFullYear() &&
    yesterday.getMonth() === tsDate.getMonth() &&
    yesterday.getDate() === tsDate.getDate();

  if (isYesterday) return "yesterday";

  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return `${diffDays} days ago`;
  return "a while ago";
}

// ---------------------------------------------------------------------------
// Personality Trait Inference from memory data
// ---------------------------------------------------------------------------

function inferPersonalityTraits(memory: SessionMemory): string[] {
  const traits: string[] = [];
  if (memory.message_count >= 50) traits.push("talkative");
  else if (memory.message_count >= 10) traits.push("conversational");
  if (memory.topics.length >= 5) traits.push("curious");
  if (memory.conversation_highlights.length >= 3) traits.push("thoughtful");
  if (memory.preferences.length >= 4) traits.push("opinionated");
  if (memory.mood_trend === "playful" || memory.mood_trend === "curious") traits.push("engaged");
  if (memory.active_time_bands.some((b) => b.band === "night" && b.count >= 3)) traits.push("night-owl");
  if (memory.active_time_bands.some((b) => b.band === "morning" && b.count >= 3)) traits.push("early-riser");
  return traits;
}

// ---------------------------------------------------------------------------
// getMemoryContext — structured memory for frontend consumption
// ---------------------------------------------------------------------------

export async function getMemoryContext(): Promise<MemoryContext> {
  const memory = await getSessionMemory();
  const onboardingProfile = loadOnboardingProfile();

  const userName = memory.user_name
    ?? onboardingProfile?.userName
    ?? (hasStorage() ? localStorage.getItem("tokki_user_name") : null)
    ?? null;

  const companionName =
    onboardingProfile?.personality?.name
    ?? (hasStorage() ? localStorage.getItem("tokki_pet_name") : null)
    ?? "Tokki";

  const bondLevel = computeBondLevel(memory);
  const topTopics = memory.topics.slice(0, 5);
  const lastInteractionAge = formatInteractionAge(memory.last_message_at);
  const conversationCount = memory.message_count;
  const personalityTraits = inferPersonalityTraits(memory);
  const isFirstSession = memory.message_count === 0 && memory.greet_count <= 1;

  return {
    userName,
    companionName,
    bondLevel,
    topTopics,
    lastInteractionAge,
    conversationCount,
    personalityTraits,
    isFirstSession,
  };
}

// ---------------------------------------------------------------------------
// Personalized greeting builder — used by the startup greeting in
// TokkiCharacter to make daily greetings memory-aware.
// ---------------------------------------------------------------------------

export function buildPersonalizedGreeting(ctx: MemoryContext): string {
  const h = new Date().getHours();
  const name = ctx.userName;

  if (ctx.isFirstSession) {
    return name
      ? `Hi ${name}! I'm ${ctx.companionName}! Nice to meet you! ✨`
      : `Hi there! I'm ${ctx.companionName}! Nice to meet you! ✨`;
  }

  // Returning user — vary by time-of-day and bond level
  const timeGreeting =
    h >= 5 && h < 12
      ? "Good morning"
      : h >= 12 && h < 17
        ? "Good afternoon"
        : h >= 17 && h < 21
          ? "Good evening"
          : "Hey, night owl";

  if (ctx.bondLevel >= 60 && name) {
    const affectionate = [
      `${timeGreeting}, ${name}! Missed you! 💕`,
      `Welcome back, ${name}! I was thinking about you ✨`,
      `${timeGreeting}, ${name}! So glad you're here 🌟`,
    ];
    return affectionate[Math.floor(Math.random() * affectionate.length)];
  }

  if (name) {
    return `${timeGreeting}, ${name}! 👋`;
  }

  // Fallback without name
  const generic =
    h >= 5 && h < 12
      ? "Good morning! Rise and shine~"
      : h >= 12 && h < 17
        ? "Good afternoon! How's your day?"
        : h >= 17 && h < 21
          ? "Good evening! Time to unwind~"
          : "Hey, night owl! Can't sleep?";
  return generic;
}

export async function getPersonality(): Promise<PersonalityConfig> {
  if (isTauriRuntime()) {
    return invoke<PersonalityConfig>("get_personality");
  }
  return { ...fallbackPersonality };
}

export async function setPersonality(personality: PersonalityConfig): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("set_personality", { personality });
    return;
  }

  fallbackPersonality = { ...personality };
}

export async function setHumorLevel(level: number): Promise<void> {
  const clamped = Math.min(100, Math.max(0, level));
  if (isTauriRuntime()) {
    await invoke("set_humor_level", { level: clamped });
    return;
  }

  fallbackPersonality = { ...fallbackPersonality, humor: clamped };
}

export async function loadPersistentMemory(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("load_persistent_memory");
  }
}

export async function savePersistentMemory(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("save_persistent_memory");
  }
}

type ProactiveHandler = (message: ProactiveMessage) => void;

export async function subscribeProactiveMessage(handler: ProactiveHandler): Promise<() => void> {
  if (isTauriRuntime()) {
    const unlisten = await listen<ProactiveMessage>(PROACTIVE_MESSAGE_EVENT, (event) => {
      handler(event.payload);
    });
    return () => {
      void unlisten();
    };
  }

  // No fallback for proactive messages in browser mode
  return () => {};
}

export async function reportMouseShake(): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("report_mouse_shake");
  }
}

export async function getProviderConfig(): Promise<ProviderConfig> {
  if (isTauriRuntime()) {
    return invoke<ProviderConfig>("get_provider_config");
  }

  const stored = syncFallbackProviderConfig();
  return {
    ...stored,
    api_key: fallbackProviderApiKeys[stored.provider] ?? null,
  };
}

export async function setProviderConfig(config: ProviderConfig): Promise<ProviderInfo> {
  if (isTauriRuntime()) {
    return invoke<ProviderInfo>("set_provider_config", { config });
  }

  const normalized = sanitizeProviderConfig(config);
  if (normalized.api_key) {
    fallbackProviderApiKeys[normalized.provider] = normalized.api_key;
  }

  persistFallbackProviderConfig(normalized);
  return fallbackProviderInfo(normalized.provider);
}

export async function getProviderInfo(): Promise<ProviderInfo> {
  if (isTauriRuntime()) {
    return invoke<ProviderInfo>("get_provider_info");
  }

  return fallbackProviderInfo(syncFallbackProviderConfig().provider);
}

export async function checkProviderHealth(): Promise<ProviderHealth> {
  if (isTauriRuntime()) {
    return invoke<ProviderHealth>("check_provider_health");
  }

  return fallbackProviderHealth(syncFallbackProviderConfig().provider);
}

export async function exportMemory(
  path: string,
  options: ExportMemoryOptions = {},
): Promise<void> {
  const includeChatHistory = options.includeChatHistory ?? false;
  if (isTauriRuntime()) {
    await invoke("export_memory", { path, includeChatHistory });
    return;
  }

  const [session, personality, providerConfig] = await Promise.all([
    getSessionMemory(),
    getPersonality(),
    getProviderConfig(),
  ]);
  const chatHistory = includeChatHistory ? await getChatHistory() : undefined;
  const payload = buildFallbackPortableMemoryExport(
    session,
    personality,
    providerConfig,
    fallbackAvatarId,
    chatHistory,
  );
  await downloadPortableMemoryExport(path, payload);
}

export async function importMemory(path: string): Promise<ImportMemoryResult> {
  if (isTauriRuntime()) {
    const result = await invoke<NativeImportMemoryResult>("import_memory", { path });
    return mapNativeImportMemoryResult(result);
  }

  throw new Error("Memory import from a path is only available in the desktop app.");
}

export async function importMemoryJson(json: string): Promise<ImportMemoryResult> {
  if (isTauriRuntime()) {
    const result = await invoke<NativeImportMemoryResult>("import_memory_json", { json });
    return mapNativeImportMemoryResult(result);
  }

  return applyFallbackImportedMemory(parsePortableMemoryBundle(json));
}

export async function importMemoryFile(file: File): Promise<ImportMemoryResult> {
  const json = await readFileText(file);
  return importMemoryJson(json);
}

/** Move the window to the bottom-right corner of the primary monitor, above the taskbar. */
export async function moveToBottomRight(): Promise<void> {
  if (!isTauriRuntime()) return;
  const win = getCurrentWindow();
  const monitor = await currentMonitor();
  if (!monitor) return;

  // monitor.size is already in physical pixels
  const { width: screenW, height: screenH } = monitor.size;
  const scaleFactor = monitor.scaleFactor;
  // Convert logical window size to physical pixels
  const winW = Math.round(320 * scaleFactor);
  const winH = Math.round(380 * scaleFactor);
  const taskbarPx = Math.round(48 * scaleFactor);
  const margin = Math.round(12 * scaleFactor);

  const x = screenW - winW - margin;
  const y = screenH - winH - taskbarPx - margin;

  await win.setPosition(new PhysicalPosition(x, y));
}
