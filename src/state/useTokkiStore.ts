import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  createInitialTokkiState,
  type AvatarId,
  type BehaviorTickPayload,
  type ChatMessage,
  type LlmResponse,
  type PersonalityConfig,
  type ProactiveMessage,
  type TokkiState
} from "../types/tokki";

const MAX_CHAT_MESSAGES = 200;
export const PRIVACY_MODE_STORAGE_KEY = "tokki_privacy_mode";

function loadPrivacyMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistPrivacyMode(value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value) {
      window.localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write issues and keep the in-memory preference.
  }
}

interface TokkiStore {
  state: TokkiState;
  connected: boolean;
  avatarId: AvatarId;
  chatMessages: ChatMessage[];
  currentReply: LlmResponse | null;
  isTyping: boolean;
  chatOpen: boolean;
  personality: PersonalityConfig | null;
  proactiveMessage: ProactiveMessage | null;
  settingsOpen: boolean;
  privacyMode: boolean;
  /** The reply currently being progressively revealed (null when idle). */
  streamingReply: LlmResponse | null;
  /** The portion of streamingReply.line revealed so far. */
  streamingContent: string;
  setConnected: (value: boolean) => void;
  setState: (state: TokkiState) => void;
  applyTick: (tick: BehaviorTickPayload) => void;
  setAvatarId: (id: AvatarId) => void;
  addChatMessage: (message: ChatMessage) => void;
  /** Bulk-load chat history (e.g. on startup restore). Replaces existing messages. */
  loadChatHistory: (messages: ChatMessage[]) => void;
  setCurrentReply: (reply: LlmResponse | null) => void;
  setIsTyping: (value: boolean) => void;
  setChatOpen: (value: boolean) => void;
  setPersonality: (personality: PersonalityConfig) => void;
  setProactiveMessage: (message: ProactiveMessage | null) => void;
  setSettingsOpen: (value: boolean) => void;
  setPrivacyMode: (value: boolean) => void;
  setStreamingReply: (reply: LlmResponse | null) => void;
  setStreamingContent: (content: string) => void;
  resetChat: () => void;
}

export const useTokkiStore = create<TokkiStore>()(
  subscribeWithSelector((set) => ({
    state: createInitialTokkiState(),
    connected: false,
    avatarId: "rabbit_v2",
    chatMessages: [],
    currentReply: null,
    isTyping: false,
    chatOpen: false,
    personality: null,
    proactiveMessage: null,
    settingsOpen: false,
    privacyMode: loadPrivacyMode(),
    streamingReply: null,
    streamingContent: "",
    setConnected: (value) => set({ connected: value }),
    setState: (state) => set({ state }),
    applyTick: (tick) => set({ state: tick.state }),
    setAvatarId: (id) => set({ avatarId: id }),
    addChatMessage: (message) =>
      set((prev) => {
        const next = [...prev.chatMessages, message];
        // Trim old messages when exceeding limit to prevent memory bloat
        return { chatMessages: next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next };
      }),
    loadChatHistory: (messages) =>
      set({ chatMessages: messages.length > MAX_CHAT_MESSAGES ? messages.slice(-MAX_CHAT_MESSAGES) : messages }),
    setCurrentReply: (reply) => set({ currentReply: reply }),
    setIsTyping: (value) => set({ isTyping: value }),
    setChatOpen: (value) => set({ chatOpen: value }),
    setPersonality: (personality) => set({ personality }),
    setProactiveMessage: (message) => set({ proactiveMessage: message }),
    setSettingsOpen: (value) => set({ settingsOpen: value }),
    setPrivacyMode: (value) => {
      persistPrivacyMode(value);
      set({ privacyMode: value });
    },
    setStreamingReply: (reply) => set({ streamingReply: reply }),
    setStreamingContent: (content) => set({ streamingContent: content }),
    resetChat: () =>
      set({ chatMessages: [], currentReply: null, isTyping: false, chatOpen: false, proactiveMessage: null, streamingReply: null, streamingContent: "" }),
  }))
);

// Fine-grained selectors for optimal re-render behavior
export const selectState = (s: TokkiStore): TokkiState => s.state;
export const selectEnergy = (s: TokkiStore): number => s.state.energy;
export const selectCurrentAction = (s: TokkiStore): TokkiState["current_action"] => s.state.current_action;
export const selectMood = (s: TokkiStore): string => s.state.current_action.mood;
export const selectConnected = (s: TokkiStore): boolean => s.connected;
export const selectAvatarId = (s: TokkiStore): AvatarId => s.avatarId;
export const selectChatMessages = (s: TokkiStore): ChatMessage[] => s.chatMessages;
export const selectChatMessagesLength = (s: TokkiStore): number => s.chatMessages.length;
export const selectCurrentReply = (s: TokkiStore): LlmResponse | null => s.currentReply;
export const selectIsTyping = (s: TokkiStore): boolean => s.isTyping;
export const selectChatOpen = (s: TokkiStore): boolean => s.chatOpen;
export const selectPersonality = (s: TokkiStore): PersonalityConfig | null => s.personality;
export const selectProactiveMessage = (s: TokkiStore): ProactiveMessage | null => s.proactiveMessage;
export const selectSettingsOpen = (s: TokkiStore): boolean => s.settingsOpen;
export const selectPrivacyMode = (s: TokkiStore): boolean => s.privacyMode;
export const selectStreamingReply = (s: TokkiStore): LlmResponse | null => s.streamingReply;
export const selectStreamingContent = (s: TokkiStore): string => s.streamingContent;
