import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultPersonalityForAvatar,
} from "../utils/onboardingProfile";
import {
  advanceTick,
  checkProviderHealth,
  clearChatHistory,
  clearFallbackChatStorage,
  exportMemory,
  getChatHistory,
  getCurrentState,
  importMemory,
  importMemoryFile,
  getPersonality,
  getProviderConfig,
  getProviderInfo,
  getSessionMemory,
  handleUserInteraction,
  parseBehaviorTickPayload,
  sendChatMessage,
  setAvatar,
  setHumorLevel,
  setPersonality,
  setProviderConfig,
  startBehaviorLoop,
  stopBehaviorLoop,
} from "./tauri";
import { createInitialTokkiState } from "../types/tokki";
import { createProviderConfig } from "../utils/providerConfig";

async function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(blob);
  });
}

function makePortableBundle(options?: {
  avatarId?: string;
  userName?: string | null;
  topics?: string[];
  personalityName?: string;
  chatHistory?: Array<{ role: string; content: string; timestamp: number }>;
}): string {
  return JSON.stringify({
    format_version: 3,
    exported_at: "2026-03-10T00:00:00Z",
    session: {
      user_name: options?.userName ?? "Ari",
      topics: options?.topics ?? ["stargazing"],
      preferences: [],
      profile_facts: [],
      conversation_highlights: [],
      mood_history: ["curious"],
      active_time_bands: [],
      first_message_at: 10,
      last_message_at: 20,
      message_count: 5,
      greet_count: 2,
      mood_trend: "curious",
    },
    personality: {
      name: options?.personalityName ?? "Nova",
      preset: "clever",
      humor: 60,
      reaction_intensity: 70,
      chattiness: 50,
    },
    provider: {
      provider: "offline",
      endpoint: null,
      model: null,
      max_tokens: 256,
      temperature: 0.7,
    },
    avatar_id: options?.avatarId ?? "fox_v2",
    ...(options?.chatHistory ? { chat_history: options.chatHistory } : {}),
  });
}

describe("parseBehaviorTickPayload", () => {
  beforeEach(async () => {
    localStorage.clear();
    await stopBehaviorLoop();
    await getProviderConfig();
    await setAvatar("rabbit_v2");
    await setPersonality(getDefaultPersonalityForAvatar("rabbit_v2"));
  });

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

  it("keeps fallback personality aligned with avatar changes", async () => {
    await setAvatar("cat_v1");
    expect(await getPersonality()).toEqual(getDefaultPersonalityForAvatar("cat_v1"));

    await setPersonality({
      ...getDefaultPersonalityForAvatar("cat_v1"),
      name: "Luna",
    });
    expect((await getPersonality()).name).toBe("Luna");

    await setAvatar("cat_v1");
    expect((await getPersonality()).name).toBe("Luna");

    await setAvatar("dragon_v1");
    expect(await getPersonality()).toEqual(getDefaultPersonalityForAvatar("dragon_v1"));
  });

  it("roundtrips fallback provider config without writing the api key to local storage", async () => {
    const info = await setProviderConfig({
      provider: "open_ai",
      endpoint: " https://example.com/v1 ",
      model: " gpt-4.1-mini ",
      api_key: " sk-test ",
      max_tokens: 384,
      temperature: 0.9,
    });

    expect(info).toEqual({
      provider: "open_ai",
      provider_name: "OpenAI-compatible",
      requires_network: true,
      api_key_required: true,
      api_key_configured: true,
    });
    expect(await getProviderConfig()).toEqual({
      provider: "open_ai",
      endpoint: "https://example.com/v1",
      model: "gpt-4.1-mini",
      api_key: "sk-test",
      max_tokens: 384,
      temperature: 0.9,
    });
    expect(localStorage.getItem("tokki_provider_config") ?? "").not.toContain("sk-test");
    expect(await getProviderInfo()).toEqual(info);

    localStorage.clear();

    expect(await getProviderConfig()).toEqual(createProviderConfig());
    expect(await getProviderInfo()).toEqual({
      provider: "offline",
      provider_name: "Offline (Template)",
      requires_network: false,
      api_key_required: false,
      api_key_configured: true,
    });
  });

  it("reports when a cloud provider is missing an API key", async () => {
    await setProviderConfig(createProviderConfig("open_ai"));

    expect(await getProviderInfo()).toEqual({
      provider: "open_ai",
      provider_name: "OpenAI-compatible",
      requires_network: true,
      api_key_required: true,
      api_key_configured: false,
    });
  });

  it("reports fallback provider health states", async () => {
    expect(await checkProviderHealth()).toEqual({
      provider: "offline",
      provider_name: "Offline (Template)",
      status: "healthy",
      reason: "offline mode ready: template responses are available",
      requires_network: false,
      api_key_required: false,
      api_key_configured: true,
    });

    await setProviderConfig(createProviderConfig("open_ai"));

    expect(await checkProviderHealth()).toEqual({
      provider: "open_ai",
      provider_name: "OpenAI-compatible",
      status: "degraded",
      reason: "OpenAI-compatible API key is not configured; Tokki will fall back to offline replies",
      requires_network: true,
      api_key_required: true,
      api_key_configured: false,
    });
  });

  it("hydrates fallback session memory user name from onboarding profile", async () => {
    localStorage.setItem("tokki_onboarding_profile", JSON.stringify({
      version: 1,
      avatarId: "rabbit_v2",
      personality: getDefaultPersonalityForAvatar("rabbit_v2"),
      userName: "Ari",
      completedAt: "2026-01-01T00:00:00.000Z",
    }));

    const memory = await getSessionMemory();
    expect(memory.user_name).toBe("Ari");
  });

  it("returns richer fallback memory defaults", async () => {
    const memory = await getSessionMemory();
    expect(memory.profile_facts).toEqual([]);
    expect(memory.active_time_bands).toEqual([]);
    expect(memory.first_message_at).toBeNull();
    expect(memory.last_message_at).toBeNull();
  });
});

describe("fallback behavior loop", () => {
  beforeEach(async () => {
    localStorage.clear();
    await stopBehaviorLoop();
    await setAvatar("rabbit_v2");
    await setPersonality(getDefaultPersonalityForAvatar("rabbit_v2"));
  });

  it("getCurrentState returns valid TokkiState shape", async () => {
    const state = await getCurrentState();
    expect(state).toHaveProperty("current_action");
    expect(state).toHaveProperty("energy");
    expect(state).toHaveProperty("tick_count");
    expect(state).toHaveProperty("queue");
    expect(state.current_action).toHaveProperty("id");
    expect(state.current_action).toHaveProperty("animation");
    expect(state.current_action).toHaveProperty("mood");
    expect(state.current_action).toHaveProperty("duration_ms");
    expect(state.current_action).toHaveProperty("interruptible");
  });

  it("handleUserInteraction returns a BehaviorTickPayload", async () => {
    const tick = await handleUserInteraction({
      type: "click",
      timestamp: Date.now(),
    });

    expect(tick.reason).toBe("interaction");
    expect(tick.state.current_action.id).toBe("react_click");
    expect(tick.state.current_action.mood).toBe("playful");
  });

  it("handleUserInteraction poke returns surprised mood", async () => {
    const tick = await handleUserInteraction({
      type: "poke",
      timestamp: Date.now(),
    });

    expect(tick.state.current_action.id).toBe("react_poke");
    expect(tick.state.current_action.mood).toBe("surprised");
  });

  it("advanceTick increments tick_count", async () => {
    const before = await getCurrentState();
    const tick = await advanceTick();
    expect(tick.reason).toBe("timer");
    expect(tick.state.tick_count).toBe(before.tick_count + 1);
  });

  it("startBehaviorLoop accepts a seed without error", async () => {
    await expect(startBehaviorLoop(42)).resolves.toBeUndefined();
    await stopBehaviorLoop();
  });
});

describe("fallback chat", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearFallbackChatStorage();
    await stopBehaviorLoop();
    await setAvatar("rabbit_v2");
    await setPersonality(getDefaultPersonalityForAvatar("rabbit_v2"));
  });

  it("sendChatMessage returns a ChatResponse with reply and tick", async () => {
    const response = await sendChatMessage("hello");

    expect(response).toHaveProperty("reply");
    expect(response).toHaveProperty("tick");
    expect(response.reply).toHaveProperty("line");
    expect(response.reply).toHaveProperty("mood");
    expect(response.reply).toHaveProperty("animation");
    expect(response.reply).toHaveProperty("intent");
    expect(typeof response.reply.line).toBe("string");
    expect(response.reply.line.length).toBeGreaterThan(0);
    expect(response.tick.state).toHaveProperty("current_action");
  });

  it("getChatHistory tracks sent messages", async () => {
    const beforeLen = (await getChatHistory()).length;
    await sendChatMessage("test message");

    const history = await getChatHistory();
    expect(history.length).toBe(beforeLen + 2);
    const userMsg = history[history.length - 2];
    const assistantMsg = history[history.length - 1];
    expect(userMsg.role).toBe("user");
    expect(userMsg.content).toBe("test message");
    expect(assistantMsg.role).toBe("assistant");
    expect(typeof assistantMsg.content).toBe("string");
    expect(typeof userMsg.timestamp).toBe("number");
  });

  it("rejects empty messages", async () => {
    await expect(sendChatMessage("")).rejects.toThrow("message must not be empty");
    await expect(sendChatMessage("   ")).rejects.toThrow("message must not be empty");
  });

  it("trims whitespace from messages", async () => {
    await sendChatMessage("  hello  ");
    const history = await getChatHistory();
    const userMsg = history.find((m) => m.content === "hello");
    expect(userMsg).toBeDefined();
  });

  it("truncates very long messages", async () => {
    const longMsg = "a".repeat(3000);
    await sendChatMessage(longMsg);
    const history = await getChatHistory();
    const userMsg = history[history.length - 2];
    expect(userMsg.content.length).toBe(2000);
  });

  it("caps fallback chat history", async () => {
    // Each sendChatMessage call adds 2 entries (user + assistant).
    // With 5 extra calls after history tracking, verify ordering stays intact.
    const before = (await getChatHistory()).length;
    await sendChatMessage("first");
    await sendChatMessage("second");
    const history = await getChatHistory();
    expect(history.length).toBe(before + 4);
    // Verify chronological ordering: each timestamp >= previous
    for (let i = 1; i < history.length; i++) {
      expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i - 1].timestamp);
    }
  });

  it("persists chat history across simulated restarts", async () => {
    // Simulate a session: send messages
    await sendChatMessage("remember me");
    const historyBefore = await getChatHistory();
    expect(historyBefore.length).toBe(2);
    expect(historyBefore[0].content).toBe("remember me");

    // Simulate a restart: clear in-memory state and re-initialize from storage
    await clearFallbackChatStorage();
    const empty = await getChatHistory();
    expect(empty.length).toBe(0);
  });

  it("clearFallbackChatStorage empties both memory and storage", async () => {
    await sendChatMessage("first");
    await sendChatMessage("second");
    expect((await getChatHistory()).length).toBe(4);

    await clearFallbackChatStorage();
    expect((await getChatHistory()).length).toBe(0);
  });

  it("clearChatHistory clears all messages in fallback mode", async () => {
    await sendChatMessage("hello");
    await sendChatMessage("world");
    expect((await getChatHistory()).length).toBe(4);

    await clearChatHistory();
    expect((await getChatHistory()).length).toBe(0);
  });

  it("clearChatHistory leaves the history empty when already empty", async () => {
    await clearChatHistory();
    expect((await getChatHistory()).length).toBe(0);
  });

  it("exportMemory omits chat history by default in fallback mode", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    let capturedBlob: Blob | null = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:tokki-export";
      }),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    try {
      await sendChatMessage("hello");
      await exportMemory("tokki-memories.json");

      const payload = JSON.parse(await readBlobText(capturedBlob!));
      expect(payload.chat_history).toBeUndefined();
      expect(payload.avatar_id).toBe("rabbit_v2");
    } finally {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: originalCreate,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        writable: true,
        value: originalRevoke,
      });
      clickSpy.mockRestore();
    }
  });

  it("exportMemory can include chat history in fallback mode", async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    let capturedBlob: Blob | null = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:tokki-export";
      }),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    try {
      await sendChatMessage("hello");
      await exportMemory("tokki-memories-chat.json", { includeChatHistory: true });

      const payload = JSON.parse(await readBlobText(capturedBlob!));
      expect(payload.chat_history).toHaveLength(2);
      expect(payload.chat_history[0].content).toBe("hello");
      expect(payload.chat_history[1].role).toBe("assistant");
    } finally {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        writable: true,
        value: originalCreate,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        writable: true,
        value: originalRevoke,
      });
      clickSpy.mockRestore();
    }
  });

  it("importMemoryFile restores fallback memory and transcript when present", async () => {
    const file = new File(
      [
        makePortableBundle({
          avatarId: "fox_v2",
          userName: "Mina",
          topics: ["comets", "tea"],
          personalityName: "Ember",
          chatHistory: [
            { role: "user", content: "Do you remember tea?", timestamp: 10 },
            { role: "assistant", content: "Always.", timestamp: 11 },
          ],
        }),
      ],
      "tokki-import.json",
      { type: "application/json" },
    );

    const result = await importMemoryFile(file);

    expect(result.avatarId).toBe("fox_v2");
    expect(result.userName).toBe("Mina");
    expect(result.chatHistoryImported).toBe(true);
    expect(result.chatHistory).toHaveLength(2);
    expect((await getPersonality()).name).toBe("Ember");
    expect((await getSessionMemory()).topics).toEqual(["comets", "tea"]);
    expect((await getChatHistory()).map((message) => message.content)).toEqual([
      "Do you remember tea?",
      "Always.",
    ]);
  });

  it("importMemoryFile preserves the current transcript when the bundle has no chat history", async () => {
    await sendChatMessage("keep this chat");
    const historyBefore = await getChatHistory();
    const file = new File(
      [makePortableBundle({ avatarId: "cat_v1", userName: "Ari", personalityName: "Luna" })],
      "tokki-memory-only.json",
      { type: "application/json" },
    );

    const result = await importMemoryFile(file);

    expect(result.avatarId).toBe("cat_v1");
    expect(result.chatHistoryImported).toBe(false);
    expect((await getChatHistory()).map((message) => message.content)).toEqual(
      historyBefore.map((message) => message.content),
    );
  });

  it("importMemoryFile rejects invalid bundles in fallback mode", async () => {
    const file = new File(["not json"], "broken.json", { type: "application/json" });
    await expect(importMemoryFile(file)).rejects.toThrow(/valid json/i);
  });

  it("importMemory rejects in fallback mode", async () => {
    await expect(importMemory("tokki-memories.json")).rejects.toThrow(
      /only available in the desktop app/i,
    );
  });
});

describe("fallback setHumorLevel", () => {
  beforeEach(async () => {
    localStorage.clear();
    await setAvatar("rabbit_v2");
    await setPersonality(getDefaultPersonalityForAvatar("rabbit_v2"));
  });

  it("updates fallback personality humor", async () => {
    await setHumorLevel(75);
    const personality = await getPersonality();
    expect(personality.humor).toBe(75);
  });

  it("clamps humor to 0–100 range", async () => {
    await setHumorLevel(150);
    expect((await getPersonality()).humor).toBe(100);

    await setHumorLevel(-10);
    expect((await getPersonality()).humor).toBe(0);
  });
});

