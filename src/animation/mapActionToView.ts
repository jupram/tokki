import type { BehaviorAction } from "../types/tokki";

export interface ActionViewModel {
  emoji: string;
  cssClass: string;
  label: string;
}

const ACTION_MAP: Record<string, ActionViewModel> = {
  idle_blink: { emoji: "🐰", cssClass: "idle", label: "Blinking" },
  idle_hop: { emoji: "🐇", cssClass: "playful", label: "Hopping" },
  idle_look: { emoji: "🐰", cssClass: "curious", label: "Looking Around" },
  rest_nap: { emoji: "😴", cssClass: "sleepy", label: "Napping" },
  react_poke: { emoji: "😲", cssClass: "surprised", label: "Surprised" },
  react_hover: { emoji: "🙂", cssClass: "curious", label: "Watching You" },
  react_drag: { emoji: "😵", cssClass: "surprised", label: "Being Dragged" },
  react_click: { emoji: "😊", cssClass: "playful", label: "Responding" }
};

const FALLBACK_VIEW: ActionViewModel = {
  emoji: "🐰",
  cssClass: "idle",
  label: "Idle"
};

export function mapActionToView(action: BehaviorAction): ActionViewModel {
  return ACTION_MAP[action.id] ?? FALLBACK_VIEW;
}
