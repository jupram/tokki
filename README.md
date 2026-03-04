# tokki

Tokki is a compact desktop micro-companion built with Tauri + React. It runs an autonomous behavior loop, reacts to user input, and exposes a typed runtime bridge between Rust and the UI.

## Current Status (March 5, 2026)

Phase 1 runtime is implemented and working end-to-end.

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
- Event bridge is wired (`tokki://behavior_tick`) from Rust to React.
- Frontend state loop is implemented with typed models and Zustand store.
- Avatar rendering is implemented with a reusable SVG asset and CSS-driven animation states.
- Runtime fallback simulator exists for non-Tauri/browser runs.
- Stability fixes were added:
  - Runtime state recovery when the behavior loop exits.
  - More reliable drag handling for Tokki interactions.
- Test coverage is in place:
  - Frontend unit tests (`vitest`)
  - Rust unit tests (`cargo test`)
  - E2E smoke tests (`playwright`)
- CI and release automation are present:
  - CI workflow for typecheck, unit/e2e tests, and Rust tests.
  - Draft release workflow on version tags (`v*`).

## Known Gaps (Not Done Yet)

- No LLM integration yet (prompting, tool orchestration, response parsing).
- No conversation memory or persistent profile/state.
- No text chat input UI yet.
- No intent planner that maps language to richer behavior sequences.

## Next Phase (Phase 2)

Focus: conversational intelligence and persistent behavior context.

1. Add secure LLM orchestration in Rust.
2. Define a strict response schema (`line`, `mood`, `animation`, `intent`) and validation path.
3. Add session memory + lightweight persistence for continuity between interactions.
4. Add chat input UI and connect it to runtime intents/actions.
5. Expand animation system to support multiple reusable assets and richer transition states.
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
