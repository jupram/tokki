import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_MODE_STORAGE_KEY, useTokkiStore } from "../../state/useTokkiStore";
import {
  createInitialTokkiState,
  type PersonalityConfig,
  type ProviderConfig,
  type ProviderHealth,
  type ProviderInfo,
} from "../../types/tokki";

const bridgeMocks = vi.hoisted(() => ({
  checkProviderHealth: vi.fn(),
  getPersonality: vi.fn(),
  getProviderConfig: vi.fn(),
  getProviderInfo: vi.fn(),
  setPersonality: vi.fn(),
}));

const audioMocks = vi.hoisted(() => ({
  isAmbientEnabled: vi.fn(() => true),
  setAmbientEnabled: vi.fn(),
}));

vi.mock("../../bridge/tauri", () => ({
  checkProviderHealth: bridgeMocks.checkProviderHealth,
  getPersonality: bridgeMocks.getPersonality,
  getProviderConfig: bridgeMocks.getProviderConfig,
  getProviderInfo: bridgeMocks.getProviderInfo,
  setPersonality: bridgeMocks.setPersonality,
}));

vi.mock("../../audio/sfx", () => ({
  isAmbientEnabled: audioMocks.isAmbientEnabled,
  setAmbientEnabled: audioMocks.setAmbientEnabled,
}));

import { SettingsPanel } from "./SettingsPanel";

const BASE_PERSONALITY: PersonalityConfig = {
  name: "Bun",
  preset: "gentle",
  humor: 60,
  reaction_intensity: 55,
  chattiness: 50,
};

const BASE_PROVIDER_INFO: ProviderInfo = {
  provider: "open_ai",
  provider_name: "OpenAI-compatible",
  requires_network: true,
  api_key_required: true,
  api_key_configured: true,
};

const BASE_PROVIDER_CONFIG: ProviderConfig = {
  provider: "open_ai",
  endpoint: null,
  model: "gpt-4.1-mini",
  api_key: null,
  max_tokens: 256,
  temperature: 0.7,
};

const HEALTHY_PROVIDER: ProviderHealth = {
  provider: "open_ai",
  provider_name: "OpenAI-compatible",
  status: "healthy",
  reason: "provider endpoint reachable and ready",
  requires_network: true,
  api_key_required: true,
  api_key_configured: true,
};

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setupStore(overrides: Partial<PersonalityConfig> = {}): void {
  useTokkiStore.setState({
    state: createInitialTokkiState(),
    connected: false,
    avatarId: "rabbit_v2",
    chatMessages: [],
    currentReply: null,
    isTyping: false,
    chatOpen: false,
    personality: { ...BASE_PERSONALITY, ...overrides },
    privacyMode: false,
    proactiveMessage: null,
    settingsOpen: true,
  });
}

function setupBridgeMocks(): void {
  bridgeMocks.getPersonality.mockResolvedValue(BASE_PERSONALITY);
  bridgeMocks.getProviderInfo.mockResolvedValue(BASE_PROVIDER_INFO);
  bridgeMocks.getProviderConfig.mockResolvedValue(BASE_PROVIDER_CONFIG);
  bridgeMocks.checkProviderHealth.mockResolvedValue(HEALTHY_PROVIDER);
  bridgeMocks.setPersonality.mockResolvedValue(undefined);
}

afterEach(() => {
  localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
  useTokkiStore.setState({ privacyMode: false });
});

describe("SettingsPanel provider health UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    setupStore();
    setupBridgeMocks();
  });

  it("renders degraded provider health with friendly offline-first guidance", async () => {
    bridgeMocks.checkProviderHealth.mockResolvedValue({
      ...HEALTHY_PROVIDER,
      status: "degraded",
      reason: "OpenAI-compatible API key is not configured; Tokki will fall back to offline replies",
      api_key_configured: false,
    } satisfies ProviderHealth);

    render(<SettingsPanel onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Degraded")).toBeInTheDocument();
    });

    expect(screen.getByText(/Provider Health/i)).toBeInTheDocument();
    expect(screen.getByText(/keep the conversation going with offline replies/i)).toBeInTheDocument();
    expect(screen.getByText(/fall back to offline replies/i)).toBeInTheDocument();
    expect(bridgeMocks.checkProviderHealth).toHaveBeenCalledTimes(1);
  });

  it("refreshes provider health on demand with loading and gentle error feedback", async () => {
    const pendingRefresh = createDeferred<ProviderHealth>();
    bridgeMocks.checkProviderHealth
      .mockResolvedValueOnce(HEALTHY_PROVIDER)
      .mockImplementationOnce(() => pendingRefresh.promise);

    render(<SettingsPanel onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /check now/i }));

    expect(screen.getByRole("button", { name: /checking/i })).toBeDisabled();
    expect(bridgeMocks.checkProviderHealth).toHaveBeenCalledTimes(2);

    pendingRefresh.reject(new Error("network issue"));

    await waitFor(() => {
      expect(screen.getByText(/No worries/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Tokki is still here for you/i)).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });
});

describe("SettingsPanel save error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
    setupBridgeMocks();
  });

  it("shows error and keeps panel open when save fails", async () => {
    bridgeMocks.setPersonality.mockRejectedValue(new Error("backend down"));
    const onClose = vi.fn();

    render(<SettingsPanel onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText(/couldn't save those tweaks/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // Button is re-enabled after failure
    expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
  });

  it("shows a brief affirmation before closing after successful save", async () => {
    const onClose = vi.fn();

    render(<SettingsPanel onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tokki tucked those tweaks away/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Saved" })).toBeDisabled();
    expect(bridgeMocks.setPersonality).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });

  it("disables save button while saving", async () => {
    const pending = createDeferred<void>();
    bridgeMocks.setPersonality.mockImplementation(() => pending.promise);

    render(<SettingsPanel onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    pending.resolve();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /saving/i })).toBeNull();
    });
  });
});

describe("SettingsPanel personality validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore();
    setupBridgeMocks();
  });

  it("trims whitespace-only name to fallback on save", async () => {
    setupStore({ name: "   " });
    const onClose = vi.fn();

    render(<SettingsPanel onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 2000 });

    const savedConfig = bridgeMocks.setPersonality.mock.calls[0][0] as PersonalityConfig;
    expect(savedConfig.name).toBe("Tokki");
  });

  it("clamps slider values to 0-100 range on save", async () => {
    setupStore({ humor: 150, reaction_intensity: -20, chattiness: 50 });
    const onClose = vi.fn();

    render(<SettingsPanel onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 2000 });

    const savedConfig = bridgeMocks.setPersonality.mock.calls[0][0] as PersonalityConfig;
    expect(savedConfig.humor).toBe(100);
    expect(savedConfig.reaction_intensity).toBe(0);
    expect(savedConfig.chattiness).toBe(50);
  });

  it("updates store with sanitized personality on successful save", async () => {
    setupStore({ name: "  Bun  " });
    const onClose = vi.fn();

    render(<SettingsPanel onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 2000 });

    const storePersonality = useTokkiStore.getState().personality;
    expect(storePersonality?.name).toBe("Bun");
  });

  it("does not leak API keys or provider config in DOM", async () => {
    bridgeMocks.getProviderConfig.mockResolvedValue({
      ...BASE_PROVIDER_CONFIG,
      api_key: "sk-super-secret-key-12345",
    });

    const { container } = render(<SettingsPanel onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    expect(container.innerHTML).not.toContain("sk-super-secret");
    expect(container.innerHTML).not.toContain("api_key");
  });

  it("toggles and persists privacy mode immediately", async () => {
    render(<SettingsPanel onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("settings-privacy-toggle"));

    expect(useTokkiStore.getState().privacyMode).toBe(true);
    expect(localStorage.getItem(PRIVACY_MODE_STORAGE_KEY)).toBe("1");
    expect(screen.getByTestId("settings-privacy-toggle")).toHaveTextContent("ON");
  });
});
