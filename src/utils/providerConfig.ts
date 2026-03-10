import type { ProviderConfig, ProviderKind } from "../types/tokki";

export interface ProviderKindMeta {
  label: string;
  blurb: string;
  helpText: string;
  connectionLabel: string;
  defaultEndpoint: string | null;
  defaultModel: string | null;
  requiresApiKey: boolean;
  badge?: string;
}

export const DEFAULT_PROVIDER_MAX_TOKENS = 256;
export const DEFAULT_PROVIDER_TEMPERATURE = 0.7;
const DEFAULT_ONBOARDING_PROVIDER: ProviderKind = "offline";

const PROVIDER_META: Record<ProviderKind, ProviderKindMeta> = {
  defensive_hub: {
    label: "Azure / DefensiveHub",
    blurb: "Hosted cloud replies through Tokki's existing Azure-compatible endpoint.",
    helpText: "Needs internet + an API key. Leave key blank to keep using TOKKI_LLM_API_KEY later.",
    connectionLabel: "Cloud + internet",
    defaultEndpoint: "https://defensiveapi.azurewebsites.net/codexinference/RunModel",
    defaultModel: "GPT5Bing",
    requiresApiKey: true,
  },
  open_ai: {
    label: "OpenAI-compatible",
    blurb: "Works with OpenAI or another OpenAI-style base URL.",
    helpText: "Needs internet + an API key. Leave key empty to use TOKKI_LLM_API_KEY later.",
    connectionLabel: "Cloud + internet",
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresApiKey: true,
  },
  ollama: {
    label: "Ollama (local)",
    blurb: "Talk through an Ollama model running on your machine or local network.",
    helpText: "No key needed. Set endpoint/model now, or keep defaults and tweak later.",
    connectionLabel: "Local model",
    defaultEndpoint: "http://localhost:11434",
    defaultModel: "llama3.2",
    requiresApiKey: false,
  },
  offline: {
    label: "Offline mode",
    blurb: "Tokki stays lively with template replies and zero network setup.",
    helpText: "Fastest start: no endpoint, no key, and no internet required. You can switch later.",
    connectionLabel: "Fully offline",
    defaultEndpoint: null,
    defaultModel: "offline",
    requiresApiKey: false,
    badge: "Recommended",
  },
};

function trimOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function clampPositiveInt(value: number | null | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.round(value);
}

function clampTemperature(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PROVIDER_TEMPERATURE;
  }

  return Math.min(2, Math.max(0, value));
}

export function getProviderKindMeta(kind: ProviderKind): ProviderKindMeta {
  return PROVIDER_META[kind];
}

export function createProviderConfig(
  provider: ProviderKind = DEFAULT_ONBOARDING_PROVIDER,
  overrides: Partial<ProviderConfig> = {},
): ProviderConfig {
  return sanitizeProviderConfig({
    provider,
    endpoint: null,
    model: null,
    api_key: null,
    max_tokens: DEFAULT_PROVIDER_MAX_TOKENS,
    temperature: DEFAULT_PROVIDER_TEMPERATURE,
    ...overrides,
  });
}

export function sanitizeProviderConfig(config: ProviderConfig): ProviderConfig {
  const endpoint = trimOptionalString(config.endpoint);
  const model = trimOptionalString(config.model);
  const apiKey = trimOptionalString(config.api_key);

  if (config.provider === "offline") {
    return {
      provider: "offline",
      endpoint: null,
      model: null,
      api_key: null,
      max_tokens: clampPositiveInt(config.max_tokens, DEFAULT_PROVIDER_MAX_TOKENS),
      temperature: clampTemperature(config.temperature),
    };
  }

  if (config.provider === "ollama") {
    return {
      provider: "ollama",
      endpoint,
      model,
      api_key: null,
      max_tokens: clampPositiveInt(config.max_tokens, DEFAULT_PROVIDER_MAX_TOKENS),
      temperature: clampTemperature(config.temperature),
    };
  }

  return {
    provider: config.provider,
    endpoint,
    model,
    api_key: apiKey,
    max_tokens: clampPositiveInt(config.max_tokens, DEFAULT_PROVIDER_MAX_TOKENS),
    temperature: clampTemperature(config.temperature),
  };
}

export function inferOnboardingProviderConfig(
  config: ProviderConfig | null | undefined,
): ProviderConfig {
  if (!config) {
    return createProviderConfig();
  }

  const normalized = sanitizeProviderConfig(config);
  if (looksLikeRuntimeDefaultProvider(normalized)) {
    return createProviderConfig();
  }

  return normalized;
}

export function looksLikeRuntimeDefaultProvider(config: ProviderConfig): boolean {
  return (
    config.provider === "defensive_hub"
    && config.endpoint === null
    && config.model === null
    && config.api_key === null
    && config.max_tokens === DEFAULT_PROVIDER_MAX_TOKENS
    && Math.abs(config.temperature - DEFAULT_PROVIDER_TEMPERATURE) < 0.000_1
  );
}
