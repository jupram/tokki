import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialTokkiState } from "../../types/tokki";
import { useTokkiStore } from "../../state/useTokkiStore";
import { loadOnboardingProfile } from "../../utils/onboardingProfile";
import { createProviderConfig } from "../../utils/providerConfig";
import { OnboardingWizard } from "./OnboardingWizard";

const bridgeMocks = vi.hoisted(() => ({
  getProviderConfig: vi.fn(),
  isTauriRuntime: vi.fn(),
  setAvatar: vi.fn(),
  setPersonality: vi.fn(),
  setProviderConfig: vi.fn(),
}));

vi.mock("../../bridge/tauri", () => ({
  getProviderConfig: bridgeMocks.getProviderConfig,
  isTauriRuntime: bridgeMocks.isTauriRuntime,
  setAvatar: bridgeMocks.setAvatar,
  setPersonality: bridgeMocks.setPersonality,
  setProviderConfig: bridgeMocks.setProviderConfig,
}));

describe("OnboardingWizard", () => {
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

    bridgeMocks.getProviderConfig.mockResolvedValue(createProviderConfig());
    bridgeMocks.isTauriRuntime.mockReturnValue(false);
    bridgeMocks.setAvatar.mockResolvedValue(undefined);
    bridgeMocks.setPersonality.mockResolvedValue(undefined);
    bridgeMocks.setProviderConfig.mockResolvedValue({
      provider: "offline",
      provider_name: "Offline (Template)",
      requires_network: false,
    });
  });

  it("captures pet + user identity and persists it through completion", async () => {
    const onComplete = vi.fn();

    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));
    fireEvent.change(screen.getByLabelText(/^Pet name$/i), {
      target: { value: "Miso" },
    });
    fireEvent.change(screen.getByLabelText(/What should .* call you\? \(optional\)/i), {
      target: { value: "Saket" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Next: chat setup/i }));

    fireEvent.click(await screen.findByRole("button", { name: /Wake Miso/i }));

    await screen.findByRole("heading", { name: /Welcome, Miso!/i });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });

    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      avatarId: "rabbit_v2",
      userName: "Saket",
      personality: {
        name: "Miso",
      },
    });
    expect(loadOnboardingProfile()).toMatchObject({
      userName: "Saket",
      personality: {
        name: "Miso",
      },
    });
    expect(bridgeMocks.setAvatar).toHaveBeenCalledWith("rabbit_v2");
    expect(bridgeMocks.setPersonality).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Miso",
      }),
    );
    expect(useTokkiStore.getState().personality).toMatchObject({
      name: "Miso",
    });
  });

  it("keeps onboarding in setup when wake-up profile sync fails", async () => {
    const onComplete = vi.fn();
    bridgeMocks.setAvatar.mockRejectedValueOnce(new Error("apply avatar failed"));

    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next: chat setup/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Wake Bun/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/couldn't finish waking up in time/i);
    });
    expect(screen.getByRole("button", { name: /Wake Bun/i })).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(loadOnboardingProfile()).toBeNull();
    expect(useTokkiStore.getState().personality).toBeNull();
  });

  it("keeps a custom pet name when switching avatars", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("radio", { name: /Cat/i }));
    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    expect(petNameInput.value).toBe("Mochi");

    fireEvent.change(petNameInput, { target: { value: "Nibbles" } });
    fireEvent.click(screen.getByRole("button", { name: /^Back$/i }));

    fireEvent.click(screen.getByRole("radio", { name: /Spirit Fox/i }));
    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    expect((screen.getByLabelText(/^Pet name$/i) as HTMLInputElement).value).toBe("Nibbles");
    fireEvent.click(screen.getByRole("button", { name: /Next: chat setup/i }));
    expect(await screen.findByRole("button", { name: /Wake Nibbles/i })).toBeInTheDocument();
  });

  it("offers retry and offline fallback when chat setup loading times out", async () => {
    vi.useFakeTimers();
    bridgeMocks.getProviderConfig.mockImplementation(() => new Promise(() => undefined));

    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next: chat setup/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_100);
    });

    expect(screen.getByRole("heading", { name: /chat setup couldn't load/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry loading chat setup/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Continue offline/i }));
    expect(screen.getByRole("button", { name: /Wake Bun/i })).toBeInTheDocument();
  });

  it("shows validation error when submitting with an empty pet name", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "" } });

    expect(screen.getByRole("button", { name: /Next: chat setup/i })).toBeDisabled();

    fireEvent.submit(petNameInput.closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(/Every companion needs a name/i);
    expect(screen.queryByText(/chat setup/i, { selector: "h2" })).not.toBeInTheDocument();
  });

  it("shows validation error for whitespace-only pet name", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "   " } });
    fireEvent.submit(petNameInput.closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(/Every companion needs a name/i);
  });

  it("clears validation error when user types a valid name", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "" } });
    fireEvent.submit(petNameInput.closest("form")!);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(petNameInput, { target: { value: "Miso" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("strips invisible zero-width characters from pet name on blur", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "Bun\u200B\u200D" } });
    fireEvent.blur(petNameInput);

    expect(petNameInput.value).toBe("Bun");
  });

  it("rejects a name consisting only of invisible characters", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "\u200B\u200D\uFEFF" } });
    fireEvent.submit(petNameInput.closest("form")!);

    expect(screen.getByRole("alert")).toHaveTextContent(/Every companion needs a name/i);
  });

  it("does not double-complete when Wake button is clicked rapidly", async () => {
    const onComplete = vi.fn();

    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next: chat setup/i }));

    const wakeButton = await screen.findByRole("button", { name: /Wake Bun/i });
    fireEvent.click(wakeButton);
    fireEvent.click(wakeButton);
    fireEvent.click(wakeButton);

    await screen.findByRole("heading", { name: /Welcome, Bun!/i });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });
  });

  it("allows emoji in pet names", async () => {
    const onComplete = vi.fn();

    render(<OnboardingWizard onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "Bun 🐰" } });
    fireEvent.click(screen.getByRole("button", { name: /Next: chat setup/i }));

    fireEvent.click(await screen.findByRole("button", { name: /Wake Bun 🐰/i }));

    await screen.findByRole("heading", { name: /Welcome, Bun 🐰!/i });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });

    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      personality: { name: "Bun 🐰" },
    });
  });

  it("clears name error when switching avatars refreshes the name", async () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    const petNameInput = screen.getByLabelText(/^Pet name$/i) as HTMLInputElement;
    fireEvent.change(petNameInput, { target: { value: "" } });
    fireEvent.submit(petNameInput.closest("form")!);

    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Back$/i }));
    fireEvent.click(screen.getByRole("radio", { name: /Spirit Fox/i }));
    fireEvent.click(screen.getByRole("button", { name: /This one/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect((screen.getByLabelText(/^Pet name$/i) as HTMLInputElement).value).toBe("Ember");
  });
});
