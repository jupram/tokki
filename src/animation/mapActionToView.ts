import type { BehaviorAction } from "../types/tokki";

export type TokkiAssetId = "rabbit_v1";
export type TokkiAnimationStateId =
  | "idle_blink"
  | "idle_hop"
  | "idle_look"
  | "rest_nap"
  | "react_poke"
  | "react_hover"
  | "react_drag"
  | "react_click";

export interface ActionViewModel {
  assetId: TokkiAssetId;
  stateId: TokkiAnimationStateId;
  stateClass: string;
  toneClass: string;
  label: string;
}

const ACTION_MAP: Record<string, ActionViewModel> = {
  idle_blink: {
    assetId: "rabbit_v1",
    stateId: "idle_blink",
    stateClass: "state-idle-blink",
    toneClass: "tone-idle",
    label: "Blinking"
  },
  idle_hop: {
    assetId: "rabbit_v1",
    stateId: "idle_hop",
    stateClass: "state-idle-hop",
    toneClass: "tone-playful",
    label: "Hopping"
  },
  idle_look: {
    assetId: "rabbit_v1",
    stateId: "idle_look",
    stateClass: "state-idle-look",
    toneClass: "tone-curious",
    label: "Looking Around"
  },
  rest_nap: {
    assetId: "rabbit_v1",
    stateId: "rest_nap",
    stateClass: "state-rest-nap",
    toneClass: "tone-sleepy",
    label: "Napping"
  },
  react_poke: {
    assetId: "rabbit_v1",
    stateId: "react_poke",
    stateClass: "state-react-poke",
    toneClass: "tone-surprised",
    label: "Surprised"
  },
  react_hover: {
    assetId: "rabbit_v1",
    stateId: "react_hover",
    stateClass: "state-react-hover",
    toneClass: "tone-curious",
    label: "Watching You"
  },
  react_drag: {
    assetId: "rabbit_v1",
    stateId: "react_drag",
    stateClass: "state-react-drag",
    toneClass: "tone-surprised",
    label: "Being Dragged"
  },
  react_click: {
    assetId: "rabbit_v1",
    stateId: "react_click",
    stateClass: "state-react-click",
    toneClass: "tone-playful",
    label: "Responding"
  }
};

const FALLBACK_VIEW: ActionViewModel = {
  assetId: "rabbit_v1",
  stateId: "idle_blink",
  stateClass: "state-idle-blink",
  toneClass: "tone-idle",
  label: "Idle"
};

export function mapActionToView(action: BehaviorAction): ActionViewModel {
  return ACTION_MAP[action.id] ?? FALLBACK_VIEW;
}
