import { useCallback, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { ProviderConfig, ProviderKind, ProviderHealth } from "../../types/tokki";
import {
  createProviderConfig,
  getProviderKindMeta,
  sanitizeProviderConfig,
} from "../../utils/providerConfig";
import { checkProviderHealth, setProviderConfig } from "../../bridge/tauri";

interface ProviderSetupStepProps {
  initialConfig: ProviderConfig;
  petName: string;
  userName?: string | null;
  isPreviewMode: boolean;
  isSaving: boolean;
  error: string | null;
  onBack: () => void;
  onComplete: (config: ProviderConfig) => void | Promise<void>;
}

type ProviderDrafts = Record<ProviderKind, ProviderConfig>;

interface FieldErrors {
  api_key?: string;
  endpoint?: string;
}

type TestStatus = "idle" | "testing" | "success" | "error";

const PROVIDER_ORDER: ProviderKind[] = ["offline", "ollama", "open_ai", "defensive_hub"];

/** Number of columns in the provider card grid for arrow key navigation. */
const PROVIDER_GRID_COLUMNS = 2;

const PROVIDER_TOOLTIPS: Record<ProviderKind, string> = {
  offline: "Best for getting started. Uses pre-written responses that feel natural. Zero setup, zero network required.",
  ollama: "Run AI models locally on your machine. Requires Ollama to be installed and running. Great for privacy.",
  open_ai: "Connect to OpenAI's API or any OpenAI-compatible service. Requires an API key and internet connection.",
  defensive_hub: "Connect to Azure-hosted AI through Tokki's DefensiveHub endpoint. Requires an API key and internet connection.",
};

function buildProviderDrafts(initialConfig: ProviderConfig): ProviderDrafts {
  const sanitized = sanitizeProviderConfig(initialConfig);

  return {
    defensive_hub: createProviderConfig(
      "defensive_hub",
      sanitized.provider === "defensive_hub"
        ? { ...sanitized, api_key: null }
        : {},
    ),
    open_ai: createProviderConfig(
      "open_ai",
      sanitized.provider === "open_ai"
        ? { ...sanitized, api_key: null }
        : {},
    ),
    ollama: createProviderConfig(
      "ollama",
      sanitized.provider === "ollama"
        ? sanitized
        : {},
    ),
    offline: createProviderConfig("offline"),
  };
}

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true; // Empty is valid (will use default)
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateFields(
  config: ProviderConfig,
  meta: ReturnType<typeof getProviderKindMeta>,
  savedApiKeyExists: boolean,
): FieldErrors {
  const errors: FieldErrors = {};

  // API key validation for providers that require it
  if (meta.requiresApiKey) {
    const hasApiKey = config.api_key && config.api_key.trim().length > 0;
    if (!hasApiKey && !savedApiKeyExists) {
      errors.api_key = "This provider needs an API key to chat 🐰 You can find yours in your provider's settings.";
    }
  }

  // Endpoint URL validation
  if (config.endpoint && !isValidHttpUrl(config.endpoint)) {
    errors.endpoint = "Hmm, that doesn't look like a valid URL — try something like https://api.example.com";
  }

  return errors;
}

export function ProviderSetupStep({
  initialConfig,
  petName,
  userName,
  isPreviewMode,
  isSaving,
  error,
  onBack,
  onComplete,
}: ProviderSetupStepProps): JSX.Element {
  const [selectedProvider, setSelectedProvider] = useState<ProviderKind>(initialConfig.provider);
  const [drafts, setDrafts] = useState<ProviderDrafts>(() => buildProviderDrafts(initialConfig));
  const [savedApiKeys] = useState<Partial<Record<ProviderKind, boolean>>>(() => (
    initialConfig.api_key
      ? { [initialConfig.provider]: true }
      : {}
  ));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testResult, setTestResult] = useState<ProviderHealth | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const selectedIndex = PROVIDER_ORDER.indexOf(selectedProvider);
  const [focusedIndex, setFocusedIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const buttonRefs = useRef<Map<ProviderKind, HTMLButtonElement>>(new Map());

  const selectedDraft = drafts[selectedProvider];
  const selectedMeta = getProviderKindMeta(selectedProvider);
  const savedApiKeyExists = Boolean(savedApiKeys[selectedProvider] && !selectedDraft.api_key);
  const trimmedUserName = userName?.trim() ?? "";
  const isCloudProvider = selectedProvider !== "offline";
  const showConfigForm = isCloudProvider;

  const updateField = useCallback(
    (field: "endpoint" | "model" | "api_key", value: string) => {
      setDrafts((previous) => ({
        ...previous,
        [selectedProvider]: {
          ...previous[selectedProvider],
          [field]: value,
        },
      }));
      // Clear field error when user starts typing
      if (fieldErrors[field as keyof FieldErrors]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      // Reset test status when config changes
      setTestStatus("idle");
      setTestResult(null);
      setTestError(null);
    },
    [selectedProvider, fieldErrors],
  );

  const handleProviderChange = useCallback((provider: ProviderKind) => {
    setSelectedProvider(provider);
    setFieldErrors({});
    setTestStatus("idle");
    setTestResult(null);
    setTestError(null);
  }, []);

  const handleSkipToOffline = useCallback(() => {
    void onComplete(createProviderConfig("offline"));
  }, [onComplete]);

  const handleTestConnection = useCallback(async () => {
    const currentDraft = drafts[selectedProvider];
    const meta = getProviderKindMeta(selectedProvider);

    // Validate fields first
    const errors = validateFields(currentDraft, meta, savedApiKeyExists);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setTestStatus("testing");
    setTestError(null);
    setTestResult(null);

    try {
      // Save config temporarily to test it
      await setProviderConfig(sanitizeProviderConfig(currentDraft));
      const health = await checkProviderHealth();
      setTestResult(health);

      if (health.status === "healthy") {
        setTestStatus("success");
      } else if (health.status === "degraded") {
        setTestStatus("error");
        setTestError(health.reason || "Connection is a bit shaky — but you can still try chatting!");
      } else {
        setTestStatus("error");
        setTestError(health.reason || "Couldn't reach the provider right now — double-check your settings or try Offline mode 🐰");
      }
    } catch (err) {
      setTestStatus("error");
      setTestError(err instanceof Error ? err.message : "Connection test didn't go through — let's double-check those settings! 🐰");
    }
  }, [drafts, selectedProvider, savedApiKeyExists]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Validate before submitting
      if (isCloudProvider) {
        const errors = validateFields(selectedDraft, selectedMeta, savedApiKeyExists);
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          return;
        }
      }

      void onComplete(sanitizeProviderConfig(drafts[selectedProvider]));
    },
    [drafts, onComplete, selectedProvider, isCloudProvider, selectedDraft, selectedMeta, savedApiKeyExists],
  );

  const focusProvider = useCallback((index: number) => {
    const provider = PROVIDER_ORDER[index];
    if (provider) {
      setFocusedIndex(index);
      buttonRefs.current.get(provider)?.focus();
    }
  }, []);

  const handleProviderKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const count = PROVIDER_ORDER.length;
    if (count === 0) return;

    let nextIndex = focusedIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (focusedIndex + 1) % count;
        break;
      case "ArrowLeft":
        nextIndex = (focusedIndex - 1 + count) % count;
        break;
      case "ArrowDown":
        nextIndex = (focusedIndex + PROVIDER_GRID_COLUMNS) % count;
        break;
      case "ArrowUp":
        nextIndex = (focusedIndex - PROVIDER_GRID_COLUMNS + count) % count;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = count - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        handleProviderChange(PROVIDER_ORDER[focusedIndex]);
        return;
      default:
        return;
    }

    event.preventDefault();
    focusProvider(nextIndex);
  }, [focusedIndex, focusProvider, handleProviderChange]);

  const setButtonRef = useCallback((provider: ProviderKind, element: HTMLButtonElement | null) => {
    if (element) {
      buttonRefs.current.set(provider, element);
    } else {
      buttonRefs.current.delete(provider);
    }
  }, []);

  return (
    <div className="onboarding__step onboarding__step--enter">
      <div className="onboarding__emoji">🫧</div>
      <h2 className="onboarding__heading">
        {trimmedUserName
          ? `Choose how Tokki chats with you, ${trimmedUserName}`
          : "Choose how Tokki chats"}
      </h2>
      <p className="onboarding__sub">
        Offline mode is the fastest private start. You can switch providers later in
        Settings anytime.
      </p>

      {isPreviewMode && (
        <div className="onboarding__provider-note">
          Browser preview always uses Tokki&apos;s offline test replies, but this setup flow
          still mirrors real desktop onboarding.
        </div>
      )}

      <div
        className="onboarding__provider-grid"
        role="radiogroup"
        aria-label="Choose chat provider"
        onKeyDown={handleProviderKeyDown}
      >
        {PROVIDER_ORDER.map((provider, index) => {
          const meta = getProviderKindMeta(provider);
          const active = selectedProvider === provider;
          const isFocusTarget = index === focusedIndex;
          const isOffline = provider === "offline";
          return (
            <button
              key={provider}
              ref={(el) => setButtonRef(provider, el)}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${meta.label} - ${meta.blurb}`}
              title={PROVIDER_TOOLTIPS[provider]}
              tabIndex={isFocusTarget ? 0 : -1}
              className={`onboarding__provider-card ${active ? "onboarding__provider-card--active" : ""} ${isOffline ? "onboarding__provider-card--recommended" : ""}`}
              onClick={() => handleProviderChange(provider)}
              onFocus={() => setFocusedIndex(index)}
            >
              <span className="onboarding__provider-card-top">
                <span className="onboarding__provider-title">{meta.label}</span>
                <span className="onboarding__provider-mode">{meta.connectionLabel}</span>
                {meta.badge && (
                  <span className="onboarding__provider-badge">{meta.badge}</span>
                )}
                {meta.requiresApiKey && (
                  <span className="onboarding__provider-key-hint" title="Requires API key">🔑</span>
                )}
              </span>
              <span className="onboarding__provider-blurb">{meta.blurb}</span>
            </button>
          );
        })}
      </div>

      <form className="onboarding__form onboarding__form--provider" onSubmit={handleSubmit}>
        {showConfigForm && (
          <div className="onboarding__config-section">
            <label className="onboarding__field">
              <span className="onboarding__label">
                Endpoint
                <span className="onboarding__label-hint">(optional - uses default if empty)</span>
              </span>
              <input
                type="text"
                className={`onboarding__input onboarding__input--wide ${fieldErrors.endpoint ? "onboarding__input--error" : ""}`}
                value={selectedDraft.endpoint ?? ""}
                onChange={(event) => updateField("endpoint", event.target.value)}
                placeholder={selectedMeta.defaultEndpoint ?? ""}
                autoComplete="off"
              />
              {fieldErrors.endpoint && (
                <span className="onboarding__field-error">{fieldErrors.endpoint}</span>
              )}
            </label>

            <label className="onboarding__field">
              <span className="onboarding__label">
                Model
                <span className="onboarding__label-hint">(optional - uses default if empty)</span>
              </span>
              <input
                type="text"
                className="onboarding__input onboarding__input--wide"
                value={selectedDraft.model ?? ""}
                onChange={(event) => updateField("model", event.target.value)}
                placeholder={selectedMeta.defaultModel ?? ""}
                autoComplete="off"
              />
            </label>

            {selectedMeta.requiresApiKey && (
              <label className="onboarding__field">
                <span className="onboarding__label">
                  API Key
                  <span className="onboarding__label-required">*</span>
                </span>
                <input
                  type="password"
                  className={`onboarding__input onboarding__input--wide ${fieldErrors.api_key ? "onboarding__input--error" : ""}`}
                  value={selectedDraft.api_key ?? ""}
                  onChange={(event) => updateField("api_key", event.target.value)}
                  placeholder={savedApiKeyExists ? "Saved locally on this device" : "Paste your key"}
                  autoComplete="off"
                />
                {fieldErrors.api_key && (
                  <span className="onboarding__field-error">{fieldErrors.api_key}</span>
                )}
              </label>
            )}

            <div className="onboarding__test-section">
              <button
                type="button"
                className={`onboarding__btn onboarding__btn--test ${testStatus === "success" ? "onboarding__btn--test-success" : ""} ${testStatus === "error" ? "onboarding__btn--test-error" : ""}`}
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || isSaving}
              >
                {testStatus === "testing" ? "Testing..." : testStatus === "success" ? "✓ Connected" : testStatus === "error" ? "✗ Test Failed" : "Test Connection"}
              </button>

              {testStatus === "success" && testResult && (
                <span className="onboarding__test-result onboarding__test-result--success">
                  {testResult.provider_name} is ready!
                </span>
              )}

              {testStatus === "error" && testError && (
                <div className="onboarding__test-error-block">
                  <span className="onboarding__test-result onboarding__test-result--error">
                    {testError}
                  </span>
                  <button
                    type="button"
                    className="onboarding__btn onboarding__btn--fallback"
                    onClick={handleSkipToOffline}
                  >
                    Continue in Offline mode →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="onboarding__identity-note onboarding__identity-note--wide">
          <span className="onboarding__callout-title">
            {selectedMeta.label} · {selectedMeta.connectionLabel}
          </span>
          <span>{selectedMeta.helpText}</span>
          {selectedProvider === "offline" ? (
            <span>{petName || "Tokki"} wakes up instantly with local template replies.</span>
          ) : (
            <span>You can keep optional fields blank for now and tune them later.</span>
          )}
          {isPreviewMode && selectedProvider !== "offline" && (
            <span>
              Preview mode keeps live model calls off, so chat responses stay in offline
              demo mode.
            </span>
          )}
          {savedApiKeyExists && (
            <span>
              Leave the key field blank to keep the saved key Tokki already has for this
              provider.
            </span>
          )}
        </div>

        {error && (
          <div className="onboarding__error" role="alert">
            {error}
            <button
              type="button"
              className="onboarding__btn onboarding__btn--fallback onboarding__btn--inline"
              onClick={handleSkipToOffline}
            >
              Continue in Offline mode
            </button>
          </div>
        )}

        <div className="onboarding__nav onboarding__nav--three">
          <button
            type="button"
            className="onboarding__btn onboarding__btn--secondary"
            onClick={onBack}
            disabled={isSaving}
          >
            ← Back
          </button>
          <button
            type="button"
            className="onboarding__btn onboarding__btn--skip"
            onClick={handleSkipToOffline}
            disabled={isSaving}
            title="Skip provider setup and use offline mode"
          >
            Skip (Offline)
          </button>
          <button type="submit" className="onboarding__btn" disabled={isSaving}>
            {isSaving ? "Waking up..." : `Wake ${petName || "Tokki"}`}
          </button>
        </div>
      </form>
    </div>
  );
}
