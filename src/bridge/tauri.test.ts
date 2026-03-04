import { describe, expect, it } from "vitest";
import { parseBehaviorTickPayload } from "./tauri";
import { createInitialTokkiState } from "../types/tokki";

describe("parseBehaviorTickPayload", () => {
  it("accepts valid payloads", () => {
    const payload = {
      state: createInitialTokkiState(),
      reason: "timer"
    };

    expect(parseBehaviorTickPayload(payload)).toEqual(payload);
  });

  it("rejects invalid payloads", () => {
    expect(parseBehaviorTickPayload(null)).toBeNull();
    expect(parseBehaviorTickPayload({ reason: "timer" })).toBeNull();
    expect(
      parseBehaviorTickPayload({
        state: createInitialTokkiState(),
        reason: "unknown"
      })
    ).toBeNull();
  });
});
