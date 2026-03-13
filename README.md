# tokki

Tokki is a compact desktop companion built with Tauri, React, TypeScript, and Rust. It runs a small autonomous behavior engine, reacts to direct user interaction, and can reply through a configurable LLM backend with a local fallback path when no endpoint is configured.

## Status

As of March 13, 2026, the desktop prototype is functional end-to-end for the current scope: runtime loop, interactive avatar, chat panel, multi-avatar presentation, persistent settings, tray icon integration, test coverage, and Windows release automation are all in place.

## What Is Done So Far

- Desktop shell is implemented with `Tauri 2 + React + Vite + TypeScript`.
- Tokki runs in a compact transparent desktop window:
  - undecorated, always-on-top, non-resizable base shell
  - draggable avatar/window interaction via Tauri window dragging
  - dynamic window resizing when chat UI opens or content grows
- Rust runtime and behavior engine are wired end-to-end:
  - deterministic seeded idle actions: `idle_blink`, `idle_hop`, `idle_look`
  - interaction reactions: `react_click`, `react_hover`, `react_drag`, `react_poke`
  - energy model with recovery/decay and low-energy `rest_nap`
  - typed command bridge for loop control, interaction handling, state reads, and LLM requests
- Event flow is connected from Rust to the frontend through `tokki://behavior_tick`.
- Settings are now persisted locally through the native side:
  - stored in an app-local `settings.json`
  - covers LLM endpoint, model, API key, and avatar preference
  - settings updates are broadcast to the frontend through `tokki://settings_updated`
- Frontend state management is implemented with typed models and Zustand.
- Chat is working with two paths:
  - live Tauri `request_llm_reply` calls when a supported endpoint is configured
  - local canned replies when no endpoint is configured or the browser fallback is used
- LLM configuration precedence is implemented:
  - explicit per-request override wins
  - saved settings are used next
  - environment variables are used as fallback defaults
  - local canned replies remain the fallback when no endpoint is resolved
- LLM endpoint validation is implemented:
  - accepts OpenAI-compatible `/v1/responses`
  - accepts OpenAI-compatible `/v1/chat/completions`
  - accepts Azure OpenAI deployment equivalents
  - accepts localhost OpenAI-compatible HTTP endpoints for local servers
  - rejects non-standard endpoint shapes
- Avatar presentation has expanded beyond the original rabbit:
  - selectable avatars in the UI
  - current shipped set: rabbit, cat, dog, penguin, celestial owl
  - avatar-specific rendering and particle/FX layers
- A dedicated settings window is implemented:
  - opened from the tray icon left-click or tray menu `Settings`
  - separate from the compact main Tokki window
  - includes endpoint, model, API key, avatar, reset, and save controls
- Browser/non-Tauri fallback behavior exists for local frontend development.
- Automated quality checks are present:
  - frontend typecheck
  - Vitest unit tests
  - Playwright smoke tests
  - Rust tests
- GitHub automation is present:
  - CI on `main` and pull requests
  - draft Windows release creation on version tags

## Current Limits

- No persistent memory or long-term profile/state yet.
- No intent planner that maps language into richer multi-step behavior.
- No streaming or tool-calling response orchestration.
- API key storage is app-local plain persisted configuration; there is no OS keychain integration yet.
- Settings are only exposed through the native settings window; there is no in-chat settings entry yet.

## Next Likely Work

1. Add persistent memory and richer profile state beyond the current settings model.
2. Introduce structured LLM responses (`line`, `mood`, `animation`, `intent`) with validation.
3. Map chat intent to richer runtime actions and animation sequences.
4. Expand animation polish, transitions, and avatar behaviors.
5. Add secret-store support for API keys and broader settings coverage.

## Local Development

### Prerequisites

- Node.js 20+
- Rust toolchain via `rustup`
- Tauri OS prerequisites

### Run

```bash
npm install
npm run tauri dev
```

When the desktop app is running, open the settings window from the tray icon:

- left-click the tray icon to open `Settings`
- or use the tray menu `Settings`

LLM configuration can be set in the settings window and is persisted across restarts.

Environment variable fallback is still supported:

- `TOKKI_LLM_ENDPOINT`: supported OpenAI-compatible or Azure OpenAI endpoint
- `TOKKI_LLM_MODEL`: optional model override, default `gpt-4o-mini`
- `TOKKI_LLM_API_KEY`: optional bearer token for authenticated endpoints

Supported endpoint shapes:

- `https://api.openai.com/v1/responses`
- `https://api.openai.com/v1/chat/completions`
- `https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=...`
- `http://localhost:11434/v1/chat/completions`
- `http://127.0.0.1:11434/v1/chat/completions`

Runtime resolution order:

1. explicit request override
2. saved settings from the app
3. `TOKKI_LLM_*` environment variables

If no LLM endpoint is configured after resolution, Tokki falls back to local canned replies.

### Validate

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
```

### Build

```bash
npm run tauri build
```

## License

This repository is available under the MIT License. See `LICENSE`.
