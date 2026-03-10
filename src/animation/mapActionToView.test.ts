import { describe, expect, it } from "vitest";
import { mapActionToView } from "./mapActionToView";

describe("mapActionToView", () => {
  it.each([
    ["idle_blink", "idle.blink", "state-idle-blink", "tone-idle"],
    ["idle_hop", "idle.hop", "state-idle-hop", "tone-playful"],
    ["idle_look", "idle.look", "state-idle-look", "tone-curious"],
    ["idle_sneeze", "idle.sneeze", "state-idle-sneeze", "tone-surprised"],
    ["idle_slowblink", "idle.slowblink", "state-idle-slowblink", "tone-sleepy"],
    ["idle_yawn", "idle.yawn", "state-idle-yawn", "tone-sleepy"],
    ["idle_headturn", "idle.headturn", "state-idle-headturn", "tone-curious"],
    ["idle_stretch", "idle.stretch", "state-idle-stretch", "tone-playful"],
    ["rest_nap", "rest.nap", "state-rest-nap", "tone-sleepy"],
    ["react_poke", "react.poke", "state-react-poke", "tone-surprised"],
    ["react_hover", "react.hover", "state-react-hover", "tone-curious"],
    ["react_drag", "react.drag", "state-react-drag", "tone-surprised"],
    ["react_click", "react.click", "state-react-click", "tone-playful"],
    ["react_wake", "react.wake", "state-react-wake", "tone-surprised"],
    ["react_pet", "react.pet", "state-react-pet", "tone-playful"]
  ])("maps %s to the correct visual state", (id, animation, stateClass, toneClass) => {
    const view = mapActionToView({
      id,
      animation,
      mood: "idle",
      duration_ms: 500,
      interruptible: false
    });

    expect(view.assetId).toBe("rabbit_v2");
    expect(view.stateId).toBe(id);
    expect(view.stateClass).toBe(stateClass);
    expect(view.toneClass).toBe(toneClass);
  });
 
  it("accepts dotted action ids without falling back to idle", () => {
    const view = mapActionToView({
      id: "react.poke",
      animation: "react.poke",
      mood: "surprised",
      duration_ms: 500,
      interruptible: false
    });

    expect(view.stateId).toBe("react_poke");
    expect(view.stateClass).toBe("state-react-poke");
    expect(view.toneClass).toBe("tone-surprised");
  });

  it("falls back to the animation name when the action id drifts", () => {
    const view = mapActionToView({
      id: "curious_hover_v2",
      animation: "react.hover",
      mood: "curious",
      duration_ms: 500,
      interruptible: true
    });

    expect(view.stateId).toBe("react_hover");
    expect(view.stateClass).toBe("state-react-hover");
    expect(view.toneClass).toBe("tone-curious");
  });

  it("handles malformed action payloads without throwing", () => {
    const view = mapActionToView({
      id: null,
      animation: null,
      mood: "idle",
      duration_ms: 100,
      interruptible: true
    } as unknown as Parameters<typeof mapActionToView>[0]);

    expect(view.stateId).toBe("idle_blink");
    expect(view.stateClass).toBe("state-idle-blink");
    expect(view.toneClass).toBe("tone-idle");
  });

  it("maps rare idle animations via dotted action id", () => {
    const sneeze = mapActionToView({
      id: "idle.sneeze",
      animation: "idle.sneeze",
      mood: "idle",
      duration_ms: 800,
      interruptible: true
    });
    expect(sneeze.stateClass).toBe("state-idle-sneeze");
    expect(sneeze.toneClass).toBe("tone-surprised");

    const stretch = mapActionToView({
      id: "idle.stretch",
      animation: "idle.stretch",
      mood: "idle",
      duration_ms: 1200,
      interruptible: true
    });
    expect(stretch.stateClass).toBe("state-idle-stretch");
    expect(stretch.toneClass).toBe("tone-playful");
  });

  it("maps react.wake to a waking-up animation", () => {
    const view = mapActionToView({
      id: "react.wake",
      animation: "react.wake",
      mood: "surprised",
      duration_ms: 600,
      interruptible: false
    });
    expect(view.stateId).toBe("react_wake");
    expect(view.stateClass).toBe("state-react-wake");
    expect(view.toneClass).toBe("tone-surprised");
  });

  it("maps react.pet to a playful petting animation", () => {
    const view = mapActionToView({
      id: "react.pet",
      animation: "react.pet",
      mood: "playful",
      duration_ms: 500,
      interruptible: true
    });
    expect(view.stateId).toBe("react_pet");
    expect(view.stateClass).toBe("state-react-pet");
    expect(view.toneClass).toBe("tone-playful");
  });

  it("returns fallback view for unknown actions", () => {
    const view = mapActionToView({
      id: "unknown",
      animation: "unknown",
      mood: "idle",
      duration_ms: 100,
      interruptible: true
    });

    expect(view.label).toBe("Idle");
    expect(view.assetId).toBe("rabbit_v2");
    expect(view.stateClass).toBe("state-idle-blink");
    expect(view.toneClass).toBe("tone-idle");
  });
});
