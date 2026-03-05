import { describe, expect, it } from "vitest";
import { parseBehaviorTickPayload, requestLlmReply } from "./tauri";
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

describe("requestLlmReply", () => {
  it("returns fallback text when endpoint is not configured", async () => {
    await expect(requestLlmReply("hello", { endpoint: "  " })).resolves.toBe(
      "llm not configured"
    );
  });

  it("rejects non-standard endpoints", async () => {
    await expect(
      requestLlmReply("hello", {
        endpoint: "https://defensiveapi.azurewebsites.net/codexinference/RunModel"
      })
    ).rejects.toThrow(
      "invalid llm endpoint: use /v1/responses or /v1/chat/completions (OpenAI-compatible)"
    );
  });
});
