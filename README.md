# tokki

Tokki is a compact desktop micro-companion built with Tauri + React. It runs an autonomous behavior loop, reacts to user input, and exposes a typed runtime bridge between Rust and the UI.

## Current Status (March 5, 2026)

Core runtime is implemented and working end-to-end, with initial LLM request plumbing available from the Tauri command layer.

## What Has Been Achieved So Far

- Desktop shell is in place (`Tauri 2` + `React` + `Vite` + `TypeScript`).
- Compact Tokki window is configured and working:
  - 180x180 footprint, transparent, undecorated, non-resizable, always-on-top.
  - Draggable avatar/window behavior is wired through Tauri window dragging.
- Rust behavior engine is implemented:
  - Seeded deterministic idle actions (`idle_blink`, `idle_hop`, `idle_look`).
  - Interaction reactions (`react_click`, `react_hover`, `react_drag`, `react_poke`).
  - Energy decay/recovery model and low-energy rest action (`rest_nap`).
- Runtime loop + command layer is live:
  - `start_behavior_loop`
  - `stop_behavior_loop`
  - `handle_user_interaction`
  - `get_current_state`
  - `advance_tick`
  - `request_llm_reply`
- Event bridge is wired (`tokki://behavior_tick`) from Rust to React.
- Frontend state loop is implemented with typed models and Zustand store.
- Avatar rendering is implemented with SVG asset mapping and CSS-driven animation states.
- Runtime fallback simulator exists for non-Tauri/browser runs.
- LLM request path is implemented in Rust using `reqwest`:
  - Endpoint and model can be configured.
  - Missing endpoint returns `llm not configured`.
  - Non-standard endpoints are rejected.
  - Supported endpoint shapes are OpenAI-compatible (`/v1/responses`, `/v1/chat/completions`) and Azure OpenAI deployment equivalents.
- Stability fixes were added:
  - Runtime state recovery when the behavior loop exits.
  - More reliable drag handling for Tokki interactions.
- Test coverage is in place:
  - Frontend unit tests (`vitest`)
  - Rust unit tests (`cargo test`)
  - E2E smoke tests (`playwright`)
- CI and release automation are present:
  - CI workflow for typecheck, unit/e2e tests, and Rust tests.
  - Draft release workflow on version tags (`v*`) that publishes Windows bundles.

## Known Gaps (Not Done Yet)

- No chat UI wired to `request_llm_reply` yet.
- No conversation memory or persistent profile/state.
- No intent planner that maps language to richer behavior sequences.
- No streaming/tool-calling orchestration for LLM responses.

## Next Phase (Phase 2)

Focus: conversational intelligence and persistent behavior context.

1. Connect chat UI input/output to the `request_llm_reply` command.
2. Define a strict structured response schema (`line`, `mood`, `animation`, `intent`) and validation path.
3. Add session memory + lightweight persistence for continuity between interactions.
4. Map language intents to richer behavior/action sequences.
5. Expand animation assets and transitions.
6. Expand tests for LLM parsing, endpoint validation, and intent-to-action mapping.

## Local Development

### Prerequisites

- Node.js 20+
- Rust toolchain (`rustup`)
- Tauri prerequisites for your OS

### Run

```bash
npm install
npm run tauri dev
```

Optional LLM configuration:

- `TOKKI_LLM_ENDPOINT`: LLM HTTP endpoint used by the `request_llm_reply` Tauri command.
  Only standard OpenAI-compatible endpoint shapes are allowed:
  - `/v1/responses`
  - `/v1/chat/completions`
  - Azure OpenAI equivalents under `/openai/deployments/{deployment}/.../(responses|chat/completions)`
- `TOKKI_LLM_MODEL`: Optional model name override (defaults to `gpt-4o-mini`).
- `TOKKI_LLM_API_KEY`: Optional bearer token sent as `Authorization: Bearer <token>`.
- If no endpoint is configured, `request_llm_reply` returns `llm not configured`.
- If endpoint format is non-standard, `request_llm_reply` returns an error.

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
