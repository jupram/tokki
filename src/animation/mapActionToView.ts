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
  | "idle_stretch"
  | "rest_nap"
  | "react_poke"
  | "react_hover"
  | "react_drag"
  | "react_click"
  | "react_wake"
  | "react_pet";

export interface ActionViewModel {
  assetId: TokkiAssetId;
  stateId: TokkiAnimationStateId;
  stateClass: string;
  toneClass: string;
  label: string;
}

type ActionViewTemplate = Omit<ActionViewModel, "assetId">;

const ACTION_MAP: Record<TokkiAnimationStateId, ActionViewTemplate> = {
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
  },
  idle_stretch: {
    stateId: "idle_stretch",
    stateClass: "state-idle-stretch",
    toneClass: "tone-playful",
    label: "Stretching"
  },
  react_wake: {
    stateId: "react_wake",
    stateClass: "state-react-wake",
    toneClass: "tone-surprised",
    label: "Waking Up"
  },
  react_pet: {
    stateId: "react_pet",
    stateClass: "state-react-pet",
    toneClass: "tone-playful",
    label: "Being Petted"
  }
};

const ACTION_ID_BY_ANIMATION: Record<string, TokkiAnimationStateId> = {
  "idle.blink": "idle_blink",
  "idle.hop": "idle_hop",
  "idle.look": "idle_look",
  "idle.sneeze": "idle_sneeze",
  "idle.slowblink": "idle_slowblink",
  "idle.yawn": "idle_yawn",
  "idle.headturn": "idle_headturn",
  "idle.stretch": "idle_stretch",
  "rest.nap": "rest_nap",
  "react.poke": "react_poke",
  "react.hover": "react_hover",
  "react.drag": "react_drag",
  "react.click": "react_click",
  "react.wake": "react_wake",
  "react.pet": "react_pet"
};

const FALLBACK: ActionViewTemplate = {
  stateId: "idle_blink",
  stateClass: "state-idle-blink",
  toneClass: "tone-idle",
  label: "Idle"
};

function normalizeActionId(action: BehaviorAction): TokkiAnimationStateId | null {
  const normalizedId = typeof action.id === "string"
    ? action.id.replace(/\./g, "_")
    : "";
  if (normalizedId in ACTION_MAP) {
    return normalizedId as TokkiAnimationStateId;
  }

  return typeof action.animation === "string"
    ? ACTION_ID_BY_ANIMATION[action.animation] ?? null
    : null;
}

export function mapActionToView(action: BehaviorAction, avatarId: TokkiAssetId = "rabbit_v2"): ActionViewModel {
  const actionId = normalizeActionId(action);
  const base = actionId ? ACTION_MAP[actionId] : FALLBACK;
  return { ...base, assetId: avatarId };
}
