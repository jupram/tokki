import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTokkiStore } from "./state/useTokkiStore";
import { createInitialTokkiState } from "./types/tokki";
import type { OnboardingProfile } from "./utils/onboardingProfile";

const bridgeMocks = vi.hoisted(() => ({
  setAvatar: vi.fn(),
  setPersonality: vi.fn(),
}));

const onboardingProfileMocks = vi.hoisted(() => ({
  isOnboardingComplete: vi.fn(),
  loadOnboardingProfile: vi.fn(),
}));

const tokkiCharacterMocks = vi.hoisted(() => ({
  render: vi.fn(({ skipStartupProfileSync }: { skipStartupProfileSync?: boolean }) => (
    <div
      data-testid="tokki-character"
      data-skip-startup-profile-sync={skipStartupProfileSync ? "yes" : "no"}
    >
      tokki-ready
    </div>
  )),
}));

vi.mock("./bridge/tauri", () => ({
  setAvatar: bridgeMocks.setAvatar,
  setPersonality: bridgeMocks.setPersonality,
}));

vi.mock("./utils/onboardingProfile", () => ({
  isOnboardingComplete: onboardingProfileMocks.isOnboardingComplete,
  loadOnboardingProfile: onboardingProfileMocks.loadOnboardingProfile,
}));

vi.mock("./core/TokkiCharacter", () => ({
  TokkiCharacter: tokkiCharacterMocks.render,
}));

vi.mock("./features/onboarding/OnboardingWizard", () => ({
  OnboardingWizard: () => <div data-testid="onboarding-wizard">onboarding</div>,
}));

import App from "./App";

const COMPLETED_PROFILE: OnboardingProfile = {
  version: 1,
  avatarId: "fox_v2",
  personality: {
    name: "Ember",
    preset: "clever",
    humor: 70,
    reaction_intensity: 65,
    chattiness: 55,
  },
  userName: "Saket",
  completedAt: "2026-01-01T00:00:00.000Z",
};

describe("App startup reliability", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    localStorage.clear();
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

    onboardingProfileMocks.loadOnboardingProfile.mockReturnValue(COMPLETED_PROFILE);
    onboardingProfileMocks.isOnboardingComplete.mockImplementation((profile: unknown) =>
      Boolean((profile as OnboardingProfile | null)?.completedAt),
    );
    bridgeMocks.setAvatar.mockResolvedValue(undefined);
    bridgeMocks.setPersonality.mockResolvedValue(undefined);
  });

  it("commits the saved profile to the store after successful backend restore", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("tokki-character")).toBeInTheDocument();
    });

    expect(bridgeMocks.setAvatar).toHaveBeenCalledWith(COMPLETED_PROFILE.avatarId);
    expect(bridgeMocks.setPersonality).toHaveBeenCalledWith(COMPLETED_PROFILE.personality);
    expect(useTokkiStore.getState().avatarId).toBe(COMPLETED_PROFILE.avatarId);
    expect(useTokkiStore.getState().personality).toEqual(COMPLETED_PROFILE.personality);
    expect(screen.getByTestId("tokki-character")).toHaveAttribute(
      "data-skip-startup-profile-sync",
      "yes",
    );
  });

  it("shows recovery actions when restoring the saved profile times out", async () => {
    vi.useFakeTimers();
    bridgeMocks.setAvatar.mockImplementation(() => new Promise(() => undefined));

    render(<App />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_100);
    });

    expect(screen.getByRole("heading", { name: /startup needs a quick nudge/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry startup/i })).toBeVisible();
    expect(useTokkiStore.getState().avatarId).toBe("rabbit_v2");
    expect(useTokkiStore.getState().personality).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Continue with saved profile/i }));
    expect(screen.getByTestId("tokki-character")).toBeInTheDocument();
    expect(useTokkiStore.getState().avatarId).toBe(COMPLETED_PROFILE.avatarId);
    expect(useTokkiStore.getState().personality).toEqual(COMPLETED_PROFILE.personality);
    expect(screen.getByTestId("tokki-character")).toHaveAttribute(
      "data-skip-startup-profile-sync",
      "yes",
    );
  });

  it("lets users retry startup after a timeout", async () => {
    bridgeMocks.setAvatar
      .mockRejectedValueOnce(new Error("startup failed"))
      .mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /startup needs a quick nudge/i })).toBeInTheDocument();
    });
    expect(useTokkiStore.getState().avatarId).toBe("rabbit_v2");
    expect(useTokkiStore.getState().personality).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Retry startup/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tokki-character")).toBeInTheDocument();
    });
    expect(bridgeMocks.setAvatar).toHaveBeenCalledTimes(2);
    expect(useTokkiStore.getState().avatarId).toBe(COMPLETED_PROFILE.avatarId);
    expect(useTokkiStore.getState().personality).toEqual(COMPLETED_PROFILE.personality);
    expect(screen.getByTestId("tokki-character")).toHaveAttribute(
      "data-skip-startup-profile-sync",
      "yes",
    );
  });

  it("recovers when loading the saved profile fails before backend restore starts", async () => {
    onboardingProfileMocks.loadOnboardingProfile
      .mockImplementationOnce(() => {
        throw new Error("storage unavailable");
      })
      .mockReturnValue(COMPLETED_PROFILE);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /startup needs a quick nudge/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Set up Tokki again/i })).toBeVisible();
    expect(bridgeMocks.setAvatar).not.toHaveBeenCalled();
    expect(bridgeMocks.setPersonality).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Retry startup/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tokki-character")).toBeInTheDocument();
    });
    expect(bridgeMocks.setAvatar).toHaveBeenCalledWith(COMPLETED_PROFILE.avatarId);
    expect(bridgeMocks.setPersonality).toHaveBeenCalledWith(COMPLETED_PROFILE.personality);
  });

  it("offers fresh onboarding instead of crashing on a malformed saved profile", async () => {
    onboardingProfileMocks.loadOnboardingProfile.mockReturnValue({
      version: 1,
      avatarId: "fox_v2",
      completedAt: "2026-01-01T00:00:00.000Z",
    } as unknown as OnboardingProfile);
    onboardingProfileMocks.isOnboardingComplete.mockImplementation((profile: unknown) => {
      const candidate = profile as {
        completedAt?: string;
        avatarId?: string;
        personality?: { name?: string };
      } | null;
      return Boolean(candidate?.completedAt && candidate.avatarId && candidate.personality?.name?.trim());
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /startup needs a quick nudge/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Set up Tokki again/i })).toBeVisible();
    expect(bridgeMocks.setAvatar).not.toHaveBeenCalled();
    expect(bridgeMocks.setPersonality).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Set up Tokki again/i }));

    expect(screen.getByTestId("onboarding-wizard")).toBeInTheDocument();
  });
});
