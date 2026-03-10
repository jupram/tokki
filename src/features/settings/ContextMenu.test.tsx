import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_MODE_STORAGE_KEY, useTokkiStore } from "../../state/useTokkiStore";
import { createInitialTokkiState, type SessionMemory } from "../../types/tokki";

const bridgeMocks = vi.hoisted(() => ({
  getSessionMemory: vi.fn(),
}));

vi.mock("../../bridge/tauri", () => ({
  getSessionMemory: bridgeMocks.getSessionMemory,
}));

import { ContextMenu } from "./ContextMenu";

const BASE_MEMORY: SessionMemory = {
  user_name: "Ari",
  topics: ["games", "tea"],
  preferences: [],
  profile_facts: [],
  conversation_highlights: [],
  mood_history: ["playful", "happy"],
  active_time_bands: [],
  first_message_at: 1,
  last_message_at: 2,
  message_count: 6,
  greet_count: 2,
  mood_trend: "playful",
};

function setViewport(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });
}

function createRect(width = 0, height = 0): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

function mockMenuRect(getHeight: () => number): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function mockRect(this: HTMLElement) {
    if (this.dataset.testid === "context-menu") {
      return createRect(220, getHeight());
    }
    return createRect();
  });
}

function renderMenu(x = 280, y = 340): void {
  render(
    <ContextMenu
      x={x}
      y={y}
      onClose={vi.fn()}
      onTellJoke={vi.fn()}
      onEnergyCheck={vi.fn()}
      onToggleChat={vi.fn()}
      onSettings={vi.fn()}
    />,
  );
}

describe("ContextMenu viewport behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    setViewport(320, 380);
    bridgeMocks.getSessionMemory.mockResolvedValue(BASE_MEMORY);
    useTokkiStore.setState({
      state: createInitialTokkiState(),
      connected: false,
      avatarId: "fox_v2",
      chatMessages: [],
      currentReply: null,
      isTyping: false,
      chatOpen: false,
      personality: {
        name: "Ember",
        preset: "clever",
        humor: 70,
        reaction_intensity: 65,
        chattiness: 55,
      },
      privacyMode: false,
      proactiveMessage: null,
      settingsOpen: false,
    });
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
    vi.restoreAllMocks();
  });

  it("clamps into the viewport before paint when opened near the edge", () => {
    mockMenuRect(() => 180);
    renderMenu();

    const menu = screen.getByTestId("context-menu");
    expect(menu.style.left).toBe("60px");
    expect(menu.style.top).toBe("160px");
  });

  it("reclamps when inline memory content makes the menu taller", async () => {
    mockMenuRect(() => (
      document.querySelector('[data-testid="context-menu"] .ctx-menu__memory') ? 360 : 180
    ));
    renderMenu();

    const menu = screen.getByTestId("context-menu");
    expect(menu.style.top).toBe("160px");

    fireEvent.click(screen.getByTestId("context-menu-memory"));

    await screen.findByText("Messages");
    await waitFor(() => {
      expect(menu.style.top).toBe("8px");
    });
  });

  it("hides memory details when privacy mode is enabled", async () => {
    useTokkiStore.setState({ privacyMode: true });
    bridgeMocks.getSessionMemory.mockResolvedValue({
      ...BASE_MEMORY,
      user_name: "Ari",
      topics: ["games", "tea"],
      preferences: [{ label: "Drink", value: "oolong", mentions: 3, last_mentioned_at: 5 }],
      profile_facts: [{ facet: "location", value: "Seattle", mentions: 2, last_updated_at: 6 }],
      conversation_highlights: [{ summary: "Talked about a hard day", category: "support", captured_at: 7 }],
    } satisfies SessionMemory);

    mockMenuRect(() => 220);
    renderMenu();

    fireEvent.click(screen.getByTestId("context-menu-memory"));

    await screen.findByText("Messages");
    expect(screen.getByText(/topics, profile facts, and remembered moments stay tucked away/i)).toBeInTheDocument();
    expect(screen.queryByText("Seattle")).not.toBeInTheDocument();
    expect(screen.queryByText("Talked about a hard day")).not.toBeInTheDocument();
    expect(screen.queryByText("games")).not.toBeInTheDocument();
  });
});
