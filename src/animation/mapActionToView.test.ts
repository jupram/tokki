import { describe, expect, it } from "vitest";
import { mapActionToView } from "./mapActionToView";

describe("mapActionToView", () => {
  it("returns mapped view for known actions", () => {
    const view = mapActionToView({
      id: "react_poke",
      animation: "react.poke",
      mood: "surprised",
      duration_ms: 500,
      interruptible: false
    });

    expect(view.label).toBe("Surprised");
    expect(view.cssClass).toBe("surprised");
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
    expect(view.emoji).toBe("🐰");
  });
});
