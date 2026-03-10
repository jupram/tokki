import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tauriBridge from "../bridge/tauri";
import { useTokkiStore } from "../state/useTokkiStore";
import { createInitialTokkiState } from "../types/tokki";
import { ONBOARDING_PROFILE_KEY } from "../utils/onboardingProfile";
import { TokkiCharacter } from "./TokkiCharacter";

vi.mock("../bridge/tauri", () => {
  const makeTick = () => ({
    state: createInitialTokkiState(),
    reason: "timer" as const,
  });

  return {
    checkProviderHealth: vi.fn(async () => ({
      provider: "offline" as const,
      provider_name: "Offline (Template)",
      status: "healthy" as const,
      reason: "offline mode ready",
      requires_network: false,
      api_key_required: false,
      api_key_configured: true,
    })),
    getCurrentState: vi.fn(async () => createInitialTokkiState()),
    getChatHistory: vi.fn(async () => []),
    getMemoryContext: vi.fn(async () => null),
    getPersonality: vi.fn(async () => ({
      name: "Miso",
      preset: "gentle" as const,
      humor: 0.5,
      reaction_intensity: 0.6,
      chattiness: 0.5,
    })),
    getProviderConfig: vi.fn(async () => ({
      provider: "offline" as const,
      endpoint: null,
      model: null,
      api_key: null,
      max_tokens: 256,
      temperature: 0.7,
    })),
    getProviderInfo: vi.fn(async () => ({
      provider: "offline" as const,
      provider_name: "Offline (Template)",
      requires_network: false,
      api_key_required: false,
      api_key_configured: true,
    })),
    clearChatHistory: vi.fn(async () => undefined),
    exportMemory: vi.fn(async () => undefined),
    importMemoryFile: vi.fn(async () => ({
      avatarId: "fox_v2" as const,
      userName: "Ari",
      personality: {
        name: "Ember",
        preset: "clever" as const,
        humor: 70,
        reaction_intensity: 65,
        chattiness: 55,
      },
      chatHistoryImported: true,
      chatHistory: [
        { role: "user" as const, content: "Do you remember me?", timestamp: 10 },
        { role: "assistant" as const, content: "Always.", timestamp: 11 },
      ],
    })),
    handleUserInteraction: vi.fn(async () => makeTick()),
    moveToBottomRight: vi.fn(async () => undefined),
    reportMouseShake: vi.fn(async () => undefined),
    sendChatMessage: vi.fn(async () => ({
      tick: makeTick(),
      reply: {
        line: "Hi!",
        mood: "idle" as const,
        animation: "idle.blink",
        intent: "none" as const,
      },
    })),
    setPersonality: vi.fn(async () => undefined),
    setAvatar: vi.fn(async () => undefined),
    startBehaviorLoop: vi.fn(async () => undefined),
    startWindowDrag: vi.fn(async () => undefined),
    stopBehaviorLoop: vi.fn(async () => undefined),
    subscribeBehaviorTick: vi.fn(async () => () => undefined),
    subscribeProactiveMessage: vi.fn(async () => () => undefined),
  };
});

vi.mock("../utils/weather", () => ({
  fetchWeather: vi.fn(async () => null),
}));

vi.mock("../audio/sfx", () => ({
  isAmbientEnabled: vi.fn(() => true),
  sfxCelebrate: vi.fn(),
  sfxClick: vi.fn(),
  sfxPet: vi.fn(),
  sfxReceive: vi.fn(),
  sfxSend: vi.fn(),
  setAmbientEnabled: vi.fn(),
  updateAmbientMood: vi.fn(),
}));

describe("TokkiCharacter interaction surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriBridge.getMemoryContext).mockRejectedValue(new Error("memory unavailable"));
    localStorage.clear();
    localStorage.setItem("tokki_last_greeting", new Date().toDateString());
    useTokkiStore.setState({
      state: createInitialTokkiState(),
      connected: false,
      avatarId: "rabbit_v2",
      chatMessages: [],
      currentReply: null,
      isTyping: false,
      chatOpen: false,
      personality: null,
      proactiveMessage: null,
      settingsOpen: false,
    });
  });

  it("keeps game offers and overlays hidden", async () => {
    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    const stage = avatar.closest(".tokki-stage");
    expect(stage).toBeInstanceOf(HTMLElement);
    const stageEl = stage as HTMLElement;

    await waitFor(() => expect(tauriBridge.startBehaviorLoop).toHaveBeenCalledTimes(1));

    expect(screen.queryByRole("button", { name: /play!/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /not now/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("game-offer")).not.toBeInTheDocument();
    expect(document.querySelector(".game-overlay")).not.toBeInTheDocument();
    expect(avatar).not.toHaveClass("tokki-avatar--game");
    expect(stageEl).not.toHaveClass("tokki-stage--game-active");
    expect(screen.getByTestId("tokki-avatar")).toBeVisible();
  });

  it("adds drag tracking listeners only while a drag gesture is active", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    expect(addSpy.mock.calls.filter(([eventName]) => eventName === "mouseup")).toHaveLength(0);

    fireEvent.mouseDown(avatar, { button: 0, screenX: 100, screenY: 100 });
    expect(addSpy.mock.calls.filter(([eventName]) => eventName === "mouseup")).toHaveLength(1);

    fireEvent.mouseMove(window, { screenX: 120, screenY: 100 });
    await waitFor(() => expect(tauriBridge.startWindowDrag).toHaveBeenCalledTimes(1));

    fireEvent.mouseUp(window);
    expect(removeSpy.mock.calls.filter(([eventName]) => eventName === "mouseup")).toHaveLength(1);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("skips startup profile sync when App already restored a saved profile", async () => {
    localStorage.setItem("tokki_avatar_id", "cat_v1");
    const restoredPersonality = {
      name: "Ember",
      preset: "clever" as const,
      humor: 70,
      reaction_intensity: 65,
      chattiness: 55,
    };
    useTokkiStore.setState({
      avatarId: "fox_v2",
      personality: restoredPersonality,
    });

    render(<TokkiCharacter skipStartupProfileSync />);

    await waitFor(() => expect(tauriBridge.startBehaviorLoop).toHaveBeenCalledTimes(1));

    expect(tauriBridge.setAvatar).not.toHaveBeenCalled();
    expect(tauriBridge.getPersonality).not.toHaveBeenCalled();
    expect(useTokkiStore.getState().avatarId).toBe("fox_v2");
    expect(useTokkiStore.getState().personality).toEqual(restoredPersonality);
  });
});

describe("TokkiCharacter chat surfaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tauriBridge.getMemoryContext).mockRejectedValue(new Error("memory unavailable"));
    localStorage.clear();
    localStorage.setItem("tokki_last_greeting", new Date().toDateString());
    useTokkiStore.setState({
      state: createInitialTokkiState(),
      connected: false,
      avatarId: "rabbit_v2",
      chatMessages: [],
      currentReply: null,
      isTyping: false,
      chatOpen: false,
      personality: null,
      proactiveMessage: null,
      settingsOpen: false,
    });
  });

  it("shows chat history and bubble when chat panel is open", async () => {
    const replyLine = "Reply shown in history";
    useTokkiStore.setState({
      chatOpen: true,
      isTyping: false,
      currentReply: {
        line: replyLine,
        mood: "idle",
        animation: "idle.blink",
        intent: "none",
      },
      chatMessages: [
        { role: "user", content: "Ping", timestamp: Date.now() - 10_000 },
        { role: "assistant", content: replyLine, timestamp: Date.now() },
      ],
    });

    const { container } = render(<TokkiCharacter />);

    // Chat history log is now shown in the panel
    expect(await screen.findByRole("log", { name: /chat history/i })).toBeInTheDocument();
    // Chat bubble also still rendered above the avatar
    expect(await screen.findByTestId("chat-bubble")).toBeInTheDocument();
    // Chat input is present in the panel
    const chatPanel = container.querySelector(".tokki-chat-panel");
    expect(chatPanel).toBeInstanceOf(HTMLElement);
    expect((chatPanel as HTMLElement).querySelector(".chat-input")).toBeInTheDocument();
  });

  it("keeps settings inside the popup shell", async () => {
    useTokkiStore.setState({
      chatOpen: true,
      settingsOpen: true,
      personality: {
        name: "Miso",
        preset: "gentle",
        humor: 60,
        reaction_intensity: 55,
        chattiness: 50,
      },
    });

    const { container } = render(<TokkiCharacter />);

    const popup = await screen.findByTestId("chat-panel");
    const settingsPanel = await screen.findByTestId("settings-panel");

    expect(settingsPanel.closest('[data-testid="chat-panel"]')).toBe(popup);
    expect(container.querySelector(".tokki-settings-btn")).toBeNull();
    expect(screen.queryByTestId("relationship-snapshot")).not.toBeInTheDocument();
  });

  it("shows a compact relationship snapshot inside the companion popup", async () => {
    vi.mocked(tauriBridge.getMemoryContext).mockResolvedValue({
      userName: "Ari",
      companionName: "Miso",
      bondLevel: 58,
      topTopics: ["stargazing", "tea rituals"],
      lastInteractionAge: "earlier today",
      conversationCount: 12,
      personalityTraits: ["curious", "thoughtful"],
      isFirstSession: false,
    });
    useTokkiStore.setState({
      chatOpen: true,
      personality: {
        name: "Miso",
        preset: "gentle",
        humor: 60,
        reaction_intensity: 55,
        chattiness: 50,
      },
    });

    render(<TokkiCharacter />);

    const snapshot = await screen.findByTestId("relationship-snapshot");
    expect(snapshot).toHaveTextContent(/growing warmer/i);
    expect(snapshot).toHaveTextContent(/stargazing/i);
    expect(snapshot).toHaveTextContent(/tea rituals/i);
    expect(snapshot).toHaveTextContent(/last hello earlier today/i);
  });

  it("renders typing feedback in the chat bubble and history when panel is open", async () => {
    useTokkiStore.setState({
      chatOpen: true,
      isTyping: true,
      currentReply: null,
      chatMessages: [{ role: "user", content: "Hello?", timestamp: Date.now() }],
    });

    const { container } = render(<TokkiCharacter />);

    // Typing feedback should appear in the chat bubble
    expect(container.querySelector(".chat-bubble")).toBeInTheDocument();
    // Chat history typing indicator is shown too (panel is open)
    await waitFor(() => {
      expect(container.querySelector(".chat-history__typing")).toBeInTheDocument();
    });
  });

  it("sends contextual quick prompts through the chat pipeline", async () => {
    useTokkiStore.setState({
      chatOpen: true,
      isTyping: false,
      currentReply: null,
      chatMessages: [],
    });

    render(<TokkiCharacter />);

    fireEvent.click(await screen.findByRole("button", { name: /mood check-in/i }));

    await waitFor(() => {
      expect(tauriBridge.sendChatMessage).toHaveBeenCalledWith(expect.stringMatching(/how are you feeling right now/i));
    });
  });

  it("clears the conversation after persisted history is erased", async () => {
    useTokkiStore.setState({
      chatOpen: true,
      currentReply: {
        line: "Let's keep talking!",
        mood: "playful",
        animation: "idle.blink",
        intent: "none",
      },
      chatMessages: [
        { role: "user", content: "Hi Tokki", timestamp: Date.now() - 10_000 },
        { role: "assistant", content: "Let's keep talking!", timestamp: Date.now() },
      ],
    });

    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    fireEvent.contextMenu(avatar);
    fireEvent.click(await screen.findByRole("menuitem", { name: /clear conversation/i }));

    await waitFor(() => {
      expect(tauriBridge.clearChatHistory).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(useTokkiStore.getState().chatMessages).toEqual([]);
      expect(useTokkiStore.getState().currentReply).toBeNull();
    });

    expect(screen.getByText(/conversation cleared/i)).toBeInTheDocument();
  });

  it("keeps the conversation visible when transcript clearing fails", async () => {
    vi.mocked(tauriBridge.clearChatHistory).mockRejectedValueOnce(new Error("storage offline"));
    useTokkiStore.setState({
      chatOpen: true,
      currentReply: {
        line: "Let's keep talking!",
        mood: "playful",
        animation: "idle.blink",
        intent: "none",
      },
      chatMessages: [
        { role: "user", content: "Hi Tokki", timestamp: Date.now() - 10_000 },
        { role: "assistant", content: "Let's keep talking!", timestamp: Date.now() },
      ],
    });

    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    fireEvent.contextMenu(avatar);
    fireEvent.click(await screen.findByRole("menuitem", { name: /clear conversation/i }));

    await waitFor(() => {
      expect(tauriBridge.clearChatHistory).toHaveBeenCalledTimes(1);
    });

    expect(useTokkiStore.getState().chatMessages).toHaveLength(2);
    expect(useTokkiStore.getState().currentReply?.line).toBe("Let's keep talking!");
    expect(screen.getByText(/couldn't fully clear this conversation yet/i)).toBeInTheDocument();
  });

  it("exports memories with chat history from the context menu", async () => {
    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    fireEvent.contextMenu(avatar);
    fireEvent.click(await screen.findByRole("menuitem", { name: /export memories \+ chat/i }));

    await waitFor(() => {
      expect(tauriBridge.exportMemory).toHaveBeenCalledWith(
        expect.stringMatching(/^tokki-memories-and-chat-\d{4}-\d{2}-\d{2}\.json$/),
        { includeChatHistory: true },
      );
    });

    expect(screen.getByText(/memories and conversation exported/i)).toBeInTheDocument();
  });

  it("shows an error toast when memory export fails", async () => {
    vi.mocked(tauriBridge.exportMemory).mockRejectedValueOnce(new Error("disk full"));

    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    fireEvent.contextMenu(avatar);
    fireEvent.click(await screen.findByRole("menuitem", { name: /export memories only/i }));

    await waitFor(() => {
      expect(tauriBridge.exportMemory).toHaveBeenCalledWith(
        expect.stringMatching(/^tokki-memories-\d{4}-\d{2}-\d{2}\.json$/),
        { includeChatHistory: false },
      );
    });

    expect(screen.getByText(/couldn't export your memories just now/i)).toBeInTheDocument();
  });

  it("imports a memory bundle from the context menu and hydrates the session", async () => {
    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    fireEvent.contextMenu(avatar);
    fireEvent.click(await screen.findByRole("menuitem", { name: /import memory bundle/i }));

    const input = screen.getByTestId("memory-import-input");
    const file = new File(["{}"], "tokki-import.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(tauriBridge.importMemoryFile).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      const state = useTokkiStore.getState();
      expect(state.avatarId).toBe("fox_v2");
      expect(state.personality?.name).toBe("Ember");
      expect(state.chatOpen).toBe(true);
      expect(state.chatMessages).toEqual([
        { role: "user", content: "Do you remember me?", timestamp: 10 },
        { role: "assistant", content: "Always.", timestamp: 11 },
      ]);
    });

    expect(screen.getByText(/memories and conversation imported/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(ONBOARDING_PROFILE_KEY) ?? "{}")).toMatchObject({
      avatarId: "fox_v2",
      userName: "Ari",
      personality: { name: "Ember" },
    });
  });

  it("shows an error toast when memory import fails", async () => {
    vi.mocked(tauriBridge.importMemoryFile).mockRejectedValueOnce(new Error("bad bundle"));

    render(<TokkiCharacter />);

    const avatar = await screen.findByTestId("tokki-avatar");
    fireEvent.contextMenu(avatar);
    fireEvent.click(await screen.findByRole("menuitem", { name: /import memory bundle/i }));

    const input = screen.getByTestId("memory-import-input");
    const file = new File(["{}"], "tokki-import.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(tauriBridge.importMemoryFile).toHaveBeenCalledWith(file);
    });

    expect(screen.getByText(/couldn't import that memory bundle/i)).toBeInTheDocument();
  });
});
