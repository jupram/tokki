import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialTokkiState } from "../../types/tokki";
import { useTokkiStore } from "../../state/useTokkiStore";
import {
  createOnboardingProfile,
  getDefaultPersonalityForAvatar,
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../utils/onboardingProfile";
import { AvatarPicker } from "./AvatarPicker";

const bridgeMocks = vi.hoisted(() => ({
  getPersonality: vi.fn(),
  setAvatar: vi.fn(),
  setPersonality: vi.fn(),
}));

vi.mock("../../bridge/tauri", () => ({
  getPersonality: bridgeMocks.getPersonality,
  setAvatar: bridgeMocks.setAvatar,
  setPersonality: bridgeMocks.setPersonality,
}));

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("AvatarPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    const rabbitPersonality = getDefaultPersonalityForAvatar("rabbit_v2");
    saveOnboardingProfile(createOnboardingProfile({
      avatarId: "rabbit_v2",
      personality: rabbitPersonality,
      userName: "Ari",
    }));

    useTokkiStore.setState({
      state: createInitialTokkiState(),
      connected: false,
      avatarId: "rabbit_v2",
      chatMessages: [],
      currentReply: null,
      isTyping: false,
      chatOpen: false,
      personality: rabbitPersonality,
      proactiveMessage: null,
      settingsOpen: false,
      streamingReply: null,
      streamingContent: "",
    });

    bridgeMocks.setAvatar.mockResolvedValue(undefined);
    bridgeMocks.getPersonality.mockResolvedValue(rabbitPersonality);
    bridgeMocks.setPersonality.mockResolvedValue(undefined);
  });

  it("shows the active avatar spotlight with its personality vibe", () => {
    render(<AvatarPicker />);

    expect(screen.getByTestId("avatar-picker-spotlight")).toHaveTextContent("Bun");
    expect(screen.getByTestId("avatar-picker-spotlight")).toHaveTextContent(/Gentle/i);
    expect(screen.getByTestId("avatar-picker-spotlight")).toHaveTextContent(/Current companion shape/i);
    expect(screen.getByTestId("avatar-rabbit_v2")).toHaveAttribute("aria-checked", "true");
  });

  it("keeps the current avatar active while a switch is pending, then persists on success", async () => {
    const foxPersonality = {
      ...getDefaultPersonalityForAvatar("fox_v2"),
      name: "Ember",
    };
    const deferredSwitch = createDeferred<void>();
    bridgeMocks.setAvatar.mockReturnValueOnce(deferredSwitch.promise);
    bridgeMocks.getPersonality.mockResolvedValueOnce(foxPersonality);

    render(<AvatarPicker />);

    fireEvent.click(screen.getByTestId("avatar-fox_v2"));

    expect(screen.getByTestId("avatar-rabbit_v2")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("avatar-fox_v2")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("avatar-picker-spotlight")).toHaveTextContent(/Switching…/i);
    expect(screen.getByText(/Holding your current form until everything syncs/i)).toBeInTheDocument();

    await act(async () => {
      deferredSwitch.resolve(undefined);
      await deferredSwitch.promise;
    });

    await waitFor(() => {
      expect(useTokkiStore.getState().avatarId).toBe("fox_v2");
      expect(useTokkiStore.getState().personality?.name).toBe("Ember");
    });

    expect(loadOnboardingProfile()).toMatchObject({
      avatarId: "fox_v2",
      userName: "Ari",
      personality: { name: "Ember" },
    });
    expect(screen.getByTestId("avatar-fox_v2")).toHaveAttribute("aria-checked", "true");
  });

  it("shows an inline recovery path when switching fails and succeeds on retry", async () => {
    const catPersonality = {
      ...getDefaultPersonalityForAvatar("cat_v1"),
      name: "Mochi",
    };
    bridgeMocks.setAvatar
      .mockRejectedValueOnce(new Error("switch failed"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    bridgeMocks.getPersonality.mockResolvedValueOnce(catPersonality);

    render(<AvatarPicker />);

    fireEvent.click(screen.getByTestId("avatar-cat_v1"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Couldn't switch to Cat just yet/i);
    expect(alert).toHaveTextContent(/Bun stayed close instead/i);
    expect(useTokkiStore.getState().avatarId).toBe("rabbit_v2");
    expect(bridgeMocks.setAvatar).toHaveBeenNthCalledWith(2, "rabbit_v2");
    expect(bridgeMocks.setPersonality).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Bun" }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

    await waitFor(() => {
      expect(useTokkiStore.getState().avatarId).toBe("cat_v1");
      expect(useTokkiStore.getState().personality?.name).toBe("Mochi");
    });

    expect(loadOnboardingProfile()).toMatchObject({
      avatarId: "cat_v1",
      userName: "Ari",
      personality: { name: "Mochi" },
    });
  });

  it("keeps keyboard navigation for previewing and choosing avatars", async () => {
    const catPersonality = {
      ...getDefaultPersonalityForAvatar("cat_v1"),
      name: "Mochi",
    };
    bridgeMocks.getPersonality.mockResolvedValueOnce(catPersonality);

    render(<AvatarPicker />);

    const grid = screen.getByTestId("avatar-picker-grid");
    fireEvent.keyDown(grid, { key: "ArrowRight" });

    expect(screen.getByTestId("avatar-cat_v1")).toHaveFocus();
    expect(screen.getByTestId("avatar-picker-spotlight")).toHaveTextContent(/Aloof/i);

    fireEvent.keyDown(grid, { key: "Enter" });

    await waitFor(() => {
      expect(bridgeMocks.setAvatar).toHaveBeenCalledWith("cat_v1");
      expect(useTokkiStore.getState().avatarId).toBe("cat_v1");
    });
  });
});
