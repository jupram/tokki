import type { AvatarId, BehaviorAction } from "../types/tokki";

export type TokkiAssetId = AvatarId;
export type TokkiAnimationStateId =
  | "idle_blink"
  | "idle_hop"
  | "idle_look"
  | "idle_sneeze"
  | "idle_slowblink"
  | "idle_yawn"
  | "idle_headturn"
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

const ACTION_MAP: Record<string, Omit<ActionViewModel, "assetId">> = {
  idle_blink: {
    stateId: "idle_blink",
    stateClass: "state-idle-blink",
    toneClass: "tone-idle",
    label: "Blinking"
  },
  idle_hop: {
    stateId: "idle_hop",
    stateClass: "state-idle-hop",
    toneClass: "tone-playful",
    label: "Hopping"
  },
  idle_look: {
    stateId: "idle_look",
    stateClass: "state-idle-look",
    toneClass: "tone-curious",
    label: "Looking Around"
  },
  rest_nap: {
    stateId: "rest_nap",
    stateClass: "state-rest-nap",
    toneClass: "tone-sleepy",
    label: "Napping"
  },
  react_poke: {
    stateId: "react_poke",
    stateClass: "state-react-poke",
    toneClass: "tone-surprised",
    label: "Surprised"
  },
  react_hover: {
    stateId: "react_hover",
    stateClass: "state-react-hover",
    toneClass: "tone-curious",
    label: "Watching You"
  },
  react_drag: {
    stateId: "react_drag",
    stateClass: "state-react-drag",
    toneClass: "tone-surprised",
    label: "Being Dragged"
  },
  react_click: {
    stateId: "react_click",
    stateClass: "state-react-click",
    toneClass: "tone-playful",
    label: "Responding"
  },
  idle_sneeze: {
    stateId: "idle_sneeze",
    stateClass: "state-idle-sneeze",
    toneClass: "tone-surprised",
    label: "Sneezing"
  },
  idle_slowblink: {
    stateId: "idle_slowblink",
    stateClass: "state-idle-slowblink",
    toneClass: "tone-sleepy",
    label: "Slow Blink"
  },
  idle_yawn: {
    stateId: "idle_yawn",
    stateClass: "state-idle-yawn",
    toneClass: "tone-sleepy",
    label: "Yawning"
  },
  idle_headturn: {
    stateId: "idle_headturn",
    stateClass: "state-idle-headturn",
    toneClass: "tone-curious",
    label: "Looking Around"
  }
};

const FALLBACK: Omit<ActionViewModel, "assetId"> = {
  stateId: "idle_blink",
  stateClass: "state-idle-blink",
  toneClass: "tone-idle",
  label: "Idle"
};

export function mapActionToView(action: BehaviorAction, avatarId: TokkiAssetId = "rabbit_v1"): ActionViewModel {
  const base = ACTION_MAP[action.id] ?? FALLBACK;
  return { ...base, assetId: avatarId };
}
