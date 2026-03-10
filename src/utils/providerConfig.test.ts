import { describe, expect, it } from "vitest";
import {
  createProviderConfig,
  getProviderKindMeta,
  inferOnboardingProviderConfig,
  looksLikeRuntimeDefaultProvider,
  sanitizeProviderConfig,
} from "./providerConfig";

describe("providerConfig", () => {
  it("defaults onboarding to offline when only the runtime provider default is present", () => {
    const runtimeDefault = {
      provider: "defensive_hub" as const,
      endpoint: null,
      model: null,
      api_key: null,
      max_tokens: 256,
      temperature: 0.7,
    };

    expect(looksLikeRuntimeDefaultProvider(runtimeDefault)).toBe(true);
    expect(inferOnboardingProviderConfig(runtimeDefault)).toEqual(createProviderConfig());
  });

  it("keeps configured providers intact for onboarding", () => {
    const configured = inferOnboardingProviderConfig({
      provider: "open_ai",
      endpoint: "https://example.com/v1",
      model: "gpt-4.1-mini",
      api_key: "sk-live",
      max_tokens: 300,
      temperature: 0.5,
    });

    expect(configured).toEqual({
      provider: "open_ai",
      endpoint: "https://example.com/v1",
      model: "gpt-4.1-mini",
      api_key: "sk-live",
      max_tokens: 300,
      temperature: 0.5,
    });
  });

  it("sanitizes provider-specific optional fields", () => {
    expect(
      sanitizeProviderConfig({
        provider: "ollama",
        endpoint: " http://localhost:11434 ",
        model: " llama3.2 ",
        api_key: " keep-me-out ",
        max_tokens: 512,
        temperature: 0.8,
      }),
    ).toEqual({
      provider: "ollama",
      endpoint: "http://localhost:11434",
      model: "llama3.2",
      api_key: null,
      max_tokens: 512,
      temperature: 0.8,
    });
  });

  it("exposes offline-first provider metadata", () => {
    expect(getProviderKindMeta("offline")).toMatchObject({
      badge: "Recommended",
      connectionLabel: "Fully offline",
    });
    expect(getProviderKindMeta("open_ai").connectionLabel).toContain("Cloud");
    expect(getProviderKindMeta("ollama").connectionLabel).toBe("Local model");
  });
});
