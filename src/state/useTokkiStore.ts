import { create } from "zustand";
import {
  createInitialTokkiState,
  type BehaviorTickPayload,
  type TokkiState
} from "../types/tokki";

interface TokkiStore {
  state: TokkiState;
  connected: boolean;
  setConnected: (value: boolean) => void;
  setState: (state: TokkiState) => void;
  applyTick: (tick: BehaviorTickPayload) => void;
}

export const useTokkiStore = create<TokkiStore>((set) => ({
  state: createInitialTokkiState(),
  connected: false,
  setConnected: (value) => set({ connected: value }),
  setState: (state) => set({ state }),
  applyTick: (tick) => set({ state: tick.state })
}));
