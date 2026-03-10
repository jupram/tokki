# Tokki

Tokki is a desktop micro-companion built with **Tauri 2**, **Rust**, **React 18**, **Zustand**, and **TypeScript**. It lives on the desktop, runs an autonomous behavior loop, reacts to touch and mood, chats online or offline, and keeps the relationship local and private.

## Documentation

- **[docs/README.md](docs/README.md)** — main documentation index
- **[CLAUDE.md](CLAUDE.md)** — comprehensive project guide, architecture, and conventions
- **[docs/windows-install-update.md](docs/windows-install-update.md)** — Windows install/update flow
- **[docs/release-readiness-checklist.md](docs/release-readiness-checklist.md)** — release checklist
- **[docs/analysis/README.md](docs/analysis/README.md)** — organized audits and diagnostic reports
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — Copilot-specific repo guidance

## Current product shape

Tokki currently includes:

- autonomous desktop behavior with a Rust-driven runtime loop
- Tauri and browser-fallback chat flows
- local/private memory with export and import
- onboarding, provider setup, and offline fallback behavior
- a richer popup with relationship snapshot, compact avatar switching, privacy mode, and settings feedback
- unit, e2e, and Rust test coverage

## Quick start

```bash
npm install
npm run tauri dev
```

Useful validation commands:

```bash
npm run lint
npm run test:unit
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
npm run build
```

## Architecture at a glance

- `src-tauri/src/` — runtime, commands, LLM/provider logic, persistence, native integration
- `src/core/TokkiCharacter.tsx` — main frontend orchestrator
- `src/bridge/tauri.ts` — Tauri/browser bridge seam
- `src/state/useTokkiStore.ts` — flat Zustand store for UI runtime state
- `src/features/` — avatars, chat, games, HUD, onboarding, settings
- `src/style.css` — centralized visual state, layout, and animation system

## Product principles

- **Companion-first** — Tokki should feel alive, not like a dashboard widget
- **Offline-first** — core behavior and graceful fallback should work without the cloud
- **Private by default** — memory stays local and encrypted
- **Low-friction** — setup, updates, and day-to-day interaction should stay lightweight

## Repository layout

```text
docs/                 documentation index, analysis reports, plans, release/install guides
src/                  React frontend
src-tauri/            Rust backend/runtime
tests/                Playwright coverage
scripts/              automation and release scripts
.github/              workflows and Copilot instructions
```

## Notes

- The authoritative developer reference lives in **[CLAUDE.md](CLAUDE.md)**.
- Historical analysis and planning docs have been moved under **[docs/](docs/README.md)** to keep the repo root focused.
