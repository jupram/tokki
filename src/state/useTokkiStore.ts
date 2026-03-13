import { create } from "zustand";
import {
  createInitialTokkiState,
  type AvatarId,
  type BehaviorTickPayload,
  type LlmResponse,
  type TokkiState
} from "../types/tokki";

interface TokkiStore {
  state: TokkiState;
  connected: boolean;
  avatarId: AvatarId;
  currentReply: LlmResponse | null;
  isTyping: boolean;
  chatOpen: boolean;
  setConnected: (value: boolean) => void;
  setState: (state: TokkiState) => void;
  applyTick: (tick: BehaviorTickPayload) => void;
  setAvatarId: (id: AvatarId) => void;
  setCurrentReply: (reply: LlmResponse | null) => void;
  setIsTyping: (value: boolean) => void;
  setChatOpen: (value: boolean) => void;
}

export const useTokkiStore = create<TokkiStore>((set) => ({
  state: createInitialTokkiState(),
  connected: false,
  avatarId: "rabbit_v1",
  currentReply: null,
  isTyping: false,
  chatOpen: false,
  setConnected: (value) => set({ connected: value }),
  setState: (state) => set({ state }),
  applyTick: (tick) => set({ state: tick.state }),
  setAvatarId: (id) => set({ avatarId: id }),
  setCurrentReply: (reply) => set({ currentReply: reply }),
  setIsTyping: (value) => set({ isTyping: value }),
  setChatOpen: (value) => set({ chatOpen: value }),
}));
