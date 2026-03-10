import { beforeEach, describe, expect, it } from "vitest";
import {
  appendPersistedMessage,
  clearPersistedMessages,
  loadPersistedMessages,
  replacePersistedMessages,
  trimPersistedMessages,
  _setChatStorageBackend,
  type ChatStorageBackend,
} from "./chatStorage";
import type { ChatMessage } from "../types/tokki";

// ---------------------------------------------------------------------------
// In-memory test backend — exercises the public API without relying on IndexedDB
// ---------------------------------------------------------------------------

class TestMemoryBackend implements ChatStorageBackend {
  public messages: ChatMessage[] = [];

  async load(max: number): Promise<ChatMessage[]> {
    return this.messages.slice(-max);
  }

  async append(msg: ChatMessage): Promise<void> {
    this.messages.push(msg);
  }

  async trim(max: number): Promise<void> {
    if (this.messages.length > max) {
      this.messages = this.messages.slice(-max);
    }
  }

  async clear(): Promise<void> {
    this.messages = [];
  }
}

function makeMsg(content: string, offsetMs = 0): ChatMessage {
  return { role: "user", content, timestamp: 1_000_000 + offsetMs };
}

describe("chatStorage", () => {
  let backend: TestMemoryBackend;

  beforeEach(() => {
    backend = new TestMemoryBackend();
    _setChatStorageBackend(backend);
  });

  // Reset to automatic selection after each test so other suites are unaffected
  afterEach(() => {
    _setChatStorageBackend(null);
  });

  it("loadPersistedMessages returns empty array when no messages stored", async () => {
    const msgs = await loadPersistedMessages(200);
    expect(msgs).toEqual([]);
  });

  it("appendPersistedMessage stores a message", async () => {
    const msg = makeMsg("hello");
    await appendPersistedMessage(msg);
    const loaded = await loadPersistedMessages(200);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].content).toBe("hello");
  });

  it("loadPersistedMessages respects max limit", async () => {
    for (let i = 0; i < 10; i++) {
      await appendPersistedMessage(makeMsg(`msg-${i}`, i));
    }
    const loaded = await loadPersistedMessages(3);
    expect(loaded).toHaveLength(3);
    expect(loaded[2].content).toBe("msg-9");
  });

  it("trimPersistedMessages removes oldest entries beyond max", async () => {
    for (let i = 0; i < 5; i++) {
      await appendPersistedMessage(makeMsg(`msg-${i}`, i));
    }
    await trimPersistedMessages(3);
    const loaded = await loadPersistedMessages(200);
    expect(loaded).toHaveLength(3);
    expect(loaded[0].content).toBe("msg-2");
    expect(loaded[2].content).toBe("msg-4");
  });

  it("trimPersistedMessages is a no-op when under max", async () => {
    await appendPersistedMessage(makeMsg("only one"));
    await trimPersistedMessages(5);
    const loaded = await loadPersistedMessages(200);
    expect(loaded).toHaveLength(1);
  });

  it("clearPersistedMessages removes all stored messages", async () => {
    await appendPersistedMessage(makeMsg("a"));
    await appendPersistedMessage(makeMsg("b"));
    await clearPersistedMessages();
    const loaded = await loadPersistedMessages(200);
    expect(loaded).toHaveLength(0);
  });

  it("replacePersistedMessages swaps in a new ordered history", async () => {
    await appendPersistedMessage(makeMsg("old-a"));
    await appendPersistedMessage(makeMsg("old-b", 1));

    await replacePersistedMessages([
      { role: "assistant", content: "new-a", timestamp: 5 },
      { role: "user", content: "new-b", timestamp: 6 },
    ]);

    const loaded = await loadPersistedMessages(200);
    expect(loaded).toEqual([
      { role: "assistant", content: "new-a", timestamp: 5 },
      { role: "user", content: "new-b", timestamp: 6 },
    ]);
  });

  it("preserves both user and assistant roles", async () => {
    const user: ChatMessage = { role: "user", content: "hi", timestamp: 1 };
    const assistant: ChatMessage = { role: "assistant", content: "hello!", timestamp: 2 };
    await appendPersistedMessage(user);
    await appendPersistedMessage(assistant);
    const loaded = await loadPersistedMessages(200);
    expect(loaded[0].role).toBe("user");
    expect(loaded[1].role).toBe("assistant");
  });

  it("is resilient to backend errors — load returns empty array", async () => {
    _setChatStorageBackend({
      load: async () => { throw new Error("IDB unavailable"); },
      append: async () => {},
      trim: async () => {},
      clear: async () => {},
    });
    const result = await loadPersistedMessages(200);
    expect(result).toEqual([]);
  });

  it("is resilient to backend errors — append does not throw", async () => {
    _setChatStorageBackend({
      load: async () => [],
      append: async () => { throw new Error("disk full"); },
      trim: async () => {},
      clear: async () => {},
    });
    await expect(appendPersistedMessage(makeMsg("x"))).resolves.toBeUndefined();
  });
});
