# tokki

Tokki is a desktop micro-companion built with Tauri + React. It runs an autonomous behavior loop, reacts to user input, and exposes a typed runtime bridge between Rust and the UI.

## Current Status (March 2026)

Phase 1 is implemented and validated with unit + e2e tests.

## What Is Done

- Desktop app shell is in place (`Tauri 2` + `React` + `Vite`).
- Rust behavior runtime is implemented:
  - Seeded deterministic idle behavior (`idle_blink`, `idle_hop`, `idle_look`)
  - Interaction reactions (`click`, `hover`, `drag_start`, `drag_end`, `poke`)
  - Energy model and low-energy recovery action (`rest_nap`)
- Tauri command layer is live:
  - `start_behavior_loop`
  - `stop_behavior_loop`
  - `handle_user_interaction`
  - `get_current_state`
  - `advance_tick`
- Event bridge is wired (`tokki://behavior_tick`) from Rust to React.
- Frontend state loop is implemented with typed models + Zustand store.
- Runtime fallback simulator exists for non-Tauri/browser runs.
- Character panel supports interactions and runtime controls (poke, pause, resume).
- Test coverage is in place:
  - Frontend unit tests (`vitest`)
  - Rust unit tests (`cargo test`)
  - E2E smoke tests (`playwright`)
- CI and release automation are present:
  - CI workflow for typecheck, unit/e2e tests, and Rust tests
  - Draft release workflow on version tags

## Known Gaps (Not Done Yet)

- No LLM integration yet (prompting, tool orchestration, response parsing).
- No conversation memory or persistent profile/state.
- Animation is currently emoji/CSS-driven, not asset/sprite-driven.
- No intent planner that maps language to richer behavior sequences.

## Next Phase (Phase 2)

Focus: conversational intelligence and persistent behavior context.

1. Add secure LLM orchestration in Rust.
2. Define a strict response schema (`line`, `mood`, `animation`, `intent`) and validation path.
3. Add session memory + lightweight persistence for continuity between interactions.
4. Add chat input UI and connect it to runtime intents/actions.
5. Upgrade animation system from emoji-only actions to reusable animation assets/states.
6. Expand tests to cover LLM schema parsing and intent-to-action mapping.

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
