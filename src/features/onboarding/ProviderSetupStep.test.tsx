import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderSetupStep } from "./ProviderSetupStep";
import { createProviderConfig } from "../../utils/providerConfig";

// Mock the tauri bridge functions
vi.mock("../../bridge/tauri", () => ({
  setProviderConfig: vi.fn().mockResolvedValue({
    provider: "open_ai",
    provider_name: "OpenAI-compatible",
    requires_network: true,
    api_key_required: true,
    api_key_configured: true,
  }),
  checkProviderHealth: vi.fn().mockResolvedValue({
    provider: "open_ai",
    provider_name: "OpenAI-compatible",
    status: "healthy",
    reason: "OpenAI-compatible is configured and ready for requests",
    requires_network: true,
    api_key_required: true,
    api_key_configured: true,
  }),
}));

describe("ProviderSetupStep", () => {
  it("submits a trimmed provider config for onboarding", () => {
    const onComplete = vi.fn();

    render(
      <ProviderSetupStep
        initialConfig={createProviderConfig()}
        petName="Bun"
        userName={null}
        isPreviewMode={false}
        isSaving={false}
        error={null}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /OpenAI-compatible/i }));
    fireEvent.change(screen.getByLabelText(/^Endpoint/i), {
      target: { value: " https://example.com/v1 " },
    });
    fireEvent.change(screen.getByLabelText(/^Model/i), {
      target: { value: " gpt-4.1-mini " },
    });
    fireEvent.change(screen.getByLabelText(/^API Key/i), {
      target: { value: " sk-test " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Wake Bun/i }));

    expect(onComplete).toHaveBeenCalledWith({
      provider: "open_ai",
      endpoint: "https://example.com/v1",
      model: "gpt-4.1-mini",
      api_key: "sk-test",
      max_tokens: 256,
      temperature: 0.7,
    });
  });

  it("shows preview guidance and keeps existing api keys masked", () => {
    render(
      <ProviderSetupStep
        initialConfig={{
          provider: "open_ai",
          endpoint: null,
          model: null,
          api_key: "already-saved",
          max_tokens: 256,
          temperature: 0.7,
        }}
        petName="Bun"
        userName="Ari"
        isPreviewMode
        isSaving={false}
        error={null}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Browser preview always uses Tokki's offline test replies/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ari/i })).toBeInTheDocument();

    const apiKeyInput = screen.getByLabelText(/API Key/i) as HTMLInputElement;
    expect(apiKeyInput.value).toBe("");
    expect(apiKeyInput).toHaveAttribute("placeholder", "Saved locally on this device");
  });

  it("shows skip button that uses offline mode", () => {
    const onComplete = vi.fn();

    render(
      <ProviderSetupStep
        initialConfig={createProviderConfig()}
        petName="Bun"
        userName={null}
        isPreviewMode={false}
        isSaving={false}
        error={null}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    );

    const skipButton = screen.getByRole("button", { name: /Skip \(Offline\)/i });
    expect(skipButton).toBeInTheDocument();

    fireEvent.click(skipButton);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "offline" }),
    );
  });

  it("validates API key for cloud providers", () => {
    const onComplete = vi.fn();

    render(
      <ProviderSetupStep
        initialConfig={createProviderConfig()}
        petName="Bun"
        userName={null}
        isPreviewMode={false}
        isSaving={false}
        error={null}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    );

    // Select OpenAI which requires API key
    fireEvent.click(screen.getByRole("radio", { name: /OpenAI-compatible/i }));
    // Try to submit without API key
    fireEvent.click(screen.getByRole("button", { name: /Wake Bun/i }));

    // Should show validation error
    expect(screen.getByText(/This provider needs an API key/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("validates endpoint URL format", () => {
    const onComplete = vi.fn();

    render(
      <ProviderSetupStep
        initialConfig={createProviderConfig()}
        petName="Bun"
        userName={null}
        isPreviewMode={false}
        isSaving={false}
        error={null}
        onBack={vi.fn()}
        onComplete={onComplete}
      />,
    );

    // Select Ollama (doesn't require API key)
    fireEvent.click(screen.getByRole("radio", { name: /Ollama/i }));
    // Enter invalid endpoint
    fireEvent.change(screen.getByLabelText(/^Endpoint/i), {
      target: { value: "not-a-valid-url" },
    });
    // Try to submit
    fireEvent.click(screen.getByRole("button", { name: /Wake Bun/i }));

    // Should show validation error
    expect(screen.getByText(/doesn't look like a valid URL/i)).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("shows offline as the recommended option with special styling", () => {
    render(
      <ProviderSetupStep
        initialConfig={createProviderConfig()}
        petName="Bun"
        userName={null}
        isPreviewMode={false}
        isSaving={false}
        error={null}
        onBack={vi.fn()}
        onComplete={vi.fn()}
      />,
    );

    // Offline should have recommended badge
    expect(screen.getByText("Recommended")).toBeInTheDocument();

    // Offline card should exist
    const offlineCard = screen.getByRole("radio", { name: /Offline mode/i });
    expect(offlineCard).toBeInTheDocument();
  });
});
