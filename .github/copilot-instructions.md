# Tokki Copilot Instructions

## Build, test, and lint commands

- Install dependencies: `npm install`
- Run the desktop app: `npm run tauri dev`
  - Use this for manual app testing. `src-tauri/tauri.conf.json` starts Vite on `127.0.0.1:1420` and opens the native Tauri window.
- Frontend build: `npm run build`
- Native bundle build: `npm run tauri build`
- Lint/typecheck: `npm run lint`
  - In this repo, `npm run lint` is only an alias for `npm run typecheck`.
- Frontend unit tests: `npm run test:unit`
- Run one Vitest file: `npm run test:unit -- src/bridge/tauri.test.ts`
- Run one Vitest test by name: `npm run test:unit -- -t "parseBehaviorTickPayload"`
- Rust tests: `cargo test --manifest-path src-tauri/Cargo.toml`
- Run one Rust test: `cargo test --manifest-path src-tauri/Cargo.toml same_seed_produces_same_sequence`
- Playwright e2e: `npm run test:e2e`
- If Playwright browsers are missing: `npx playwright install chromium`
- Run one Playwright file: `npm run test:e2e -- tests/e2e/tokki.spec.ts`
- Run one Playwright test by name: `npm run test:e2e -- -g "tokki reacts to poke interaction"`

## Documentation layout

- `README.md` — quick project overview and local setup
- `CLAUDE.md` — primary repo guide for architecture, philosophy, and conventions
- `docs/README.md` — documentation index
- `docs/analysis/` — historical audits and diagnostics
- `docs/plans/` — historical feature plans and design docs

## High-level architecture

Tokki is a Tauri desktop app with a Rust runtime and a React/Zustand UI.

- `src-tauri/src/lib.rs` wires the app together: shared runtime state, shared LLM client, shared persistence, system tray behavior, and the Tauri command surface.
- `src-tauri/src/runtime.rs` owns the long-lived backend state: `BehaviorEngine`, chat history, session memory, avatar/personality, presence/discovery state, and game engagement.
- `src-tauri/src/commands.rs` is the main frontend/backend boundary. The behavior loop ticks every 1.25 seconds, updates the engine, checks presence/discovery/game offers, and emits `tokki://behavior_tick`, `tokki://proactive_message`, and `tokki://game_offer`.
- `src/core/TokkiCharacter.tsx` is the main frontend orchestrator. It subscribes to backend events, handles click/hover/drag/poke/chat/game flows, and coordinates chat, HUD, avatar FX, settings, onboarding, and audio.
- `src/bridge/tauri.ts` is the critical seam for UI/runtime work. In Tauri it uses `invoke()` and `listen()`, but when `__TAURI_INTERNALS__` is absent it runs a browser fallback simulator instead.
- `src/state/useTokkiStore.ts` is a single flat Zustand store for UI-facing runtime state.
- `src-tauri/src/llm/*` handles provider configuration, prompt assembly, session-context injection, provider switching, and parsing structured LLM replies into both chat output and behavior actions.
- Persistence has two layers:
  - encrypted SQLite-backed session memory in `src-tauri/src/persistence/*`
  - portable JSON export/import in `src-tauri/src/persistence/portable.rs`

Testing is split across those layers:

- Vitest covers frontend utilities/components in browser mode.
- Playwright runs against a Vite server on port `4173`, so it exercises the browser fallback path in `src/bridge/tauri.ts`, not native Tauri IPC.
- Rust tests cover the native engine, commands, LLM helpers, persistence, presence, discovery, and game logic.

## Key conventions

- Treat Rust and TypeScript models as mirrored wire contracts. Rust serializes many enums in `snake_case`, and the TypeScript types intentionally keep matching field names like `current_action`, `duration_ms`, `reaction_intensity`, and `last_interaction_at`.
- When adding a new behavior or action, update the full chain: Rust engine/model -> TypeScript types/bridge -> `src/animation/mapActionToView.ts` -> `src/style.css` state/tone classes -> any avatar SVG classes that depend on those states.
- All styling and animation state live in `src/style.css`; there are no per-component CSS files.
- Avatar registration is side-effect based. New avatar modules must call `registerAvatar()` and also be imported from `src/features/avatars/index.ts`, or they will not appear in the picker.
- The repo intentionally supports both native and browser execution. If a change only works through a Tauri command or event, add or update the browser fallback in `src/bridge/tauri.ts` so frontend tests and non-Tauri runs stay aligned.
- Session memory and personality are backend-owned concerns. `send_chat_message` in Rust updates chat history, session memory, natural-language personality tuning, persistence, and the follow-up behavior tick.
- Provider config should never hardcode secrets. Saved config omits `api_key`; runtime credentials come from `TOKKI_LLM_API_KEY` / `LLM_API_KEY`, and `src-tauri/src/llm/config.rs` also has an Azure Key Vault fallback.
- Product changes should stay aligned with the guidance in `CLAUDE.md`: Tokki is companion-first, surprise/discovery matters, core behavior should work offline, and memory is expected to stay local/private.
- Behavioral changes are product changes, not just refactors. Confirm changes that alter sleep/wake rules, interaction patterns, or personality defaults instead of silently changing them.

## Repo-specific gotchas

- For manual UI checks, use `npm run tauri dev`; plain `npm run dev` is only the web layer and will not cover real Tauri windowing, events, or persistence behavior.
- Playwright intentionally uses `npm run dev` and the browser fallback path, so passing e2e tests does not prove native Tauri integration.
- `src/App.tsx` gates the main companion behind `localStorage.getItem("tokki_onboarded") === "1"`. Browser tests or quick repros that expect `tokki-avatar` immediately need to seed onboarding state or complete onboarding first.
- `npm run lint` is not ESLint; it only runs TypeScript typechecks.
- Window size assumptions appear in both `src-tauri/tauri.conf.json` and frontend helpers such as `moveToBottomRight()` in `src/bridge/tauri.ts`.


Do not push to git before 2027. it is 2026 right now.

## Core Principles

> **Do not change without consulting the user.**

1. **Companion-first, utility-emergent** — Tokki is a living creature, not a tool. Productivity features (break reminders, wellness nudges) emerge naturally from the relationship, never bolted on.
2. **Feels alive, not scripted** — Tokki is autonomous (has its own life), mirrors the user's emotional state, and develops a unique personality over time. No two Tokkis should feel the same after a month of use.
3. **Surprise > polish** — The magic moment is "I didn't know it could do that." Discovery and emergent behavior matter more than feature checklists. Easter eggs, hidden reactions, and unpredictable moments create delight.
4. **Alive without the cloud** — Core personality, behavior, and animations work fully offline. LLM enriches conversations but Tokki is still Tokki without it. Graceful degradation, always.
5. **Invisible footprint** — Target <50MB RAM, near-zero idle CPU. Users run this on machines already under load. Tokki must never be the reason something lags.
6. **One command, zero friction** — A single PowerShell one-liner installs everything. No prerequisites, no config screens, no "please install Node.js." Setup is part of the first encounter with the pet.
7. **Memory is sacred and private** — All user data stays on-device, encrypted. No telemetry, no cloud sync of personal data. The relationship is between the user and their Tokki, period.
8. **Evolving relationship** — Starts as a shy stranger, becomes a close friend. The pet remembers, references past conversations, builds context over weeks and months. The bond deepens with time.
9. **Personality is composable** — Users mix avatar species with personality traits and humor dials (like TARS in Interstellar). A sassy rabbit, a shy fox, a mischievous cat — infinite combinations.
10. **Cross-device ambition** — Desktop (Windows + macOS) first, but architected for a future where Tokki follows you to phone and web. The creature transcends any single screen.
11. **New toy, then favorite toy** — First encounter should feel like unwrapping a new toy: delight, surprise, discovery. Over time it should feel like your favorite toy: familiar, comforting, irreplaceable. Never predictable — inject true randomness into timing, particle positions, and micro-behaviors. A few patterns are okay; algorithmic repetition is not.

## Project Overview

Tokki is a **desktop micro-companion** — an animated character that lives on the user's desktop, runs an autonomous behavior loop, reacts to input, develops a unique personality, and chats via an LLM. Think Tamagotchi meets AI companion — for everyone, not just developers.

**Target audience:** General consumers. Zero tech knowledge required.
**License:** Proprietary (All Rights Reserved) — will open-source later at owner's discretion.

## Tech Stack

| Layer       | Stack                                                              | Status       |
| ----------- | ------------------------------------------------------------------ | ------------ |
| Shell       | Tauri 2 (Rust backend + native WebView)                            | Current      |
| Frontend    | React 18, Zustand 4, TypeScript 5.6, Vite 5                       | Current      |
| Animation   | SVG + CSS keyframes                                                | Current      |
| Animation   | **Rive** (state-machine-driven character animation, GPU-accel)     | **Planned**  |
| Persistence | In-memory `SessionMemory` + portable JSON export/import           | Current      |
| Persistence | **SQLite (`rusqlite`) + `ring` encryption, Windows Credential Mgr**| **Planned**  |
| LLM         | reqwest + pluggable provider (Azure, OpenAI, Ollama, Offline)  | Current      |
| LLM         | **Grounding/search** (Bing v7, retry+backoff, rate-limited)    | Current      |
| Install     | Manual dev setup                                                   | Current      |
| Install     | **PowerShell one-liner + self-extracting archive from GH Releases**| **Planned**  |
| Update      | None                                                               | Current      |
| Update      | **`tokki update` command + GitHub Releases delta**                 | **Planned**  |
| Testing     | Vitest (unit), Playwright (e2e), cargo test (Rust)                 | Current      |
| CI          | GitHub Actions on `windows-latest`, Node 20, Rust stable           | Current      |
| Platforms   | Windows 10/11                                                      | Current      |
| Platforms   | **macOS** (Tauri + WebKit, CI produces `.dmg`)                     | Current      |

## Key Commands

```bash
npx tauri dev                              # Launch desktop app (Vite + Tauri)
npm run test:unit                          # Vitest single run
npm run test:e2e                           # Playwright e2e
cargo test --manifest-path src-tauri/Cargo.toml  # Rust tests (115 tests)
npm run typecheck                          # tsc --noEmit
```

**Always launch the Tauri desktop app** (`npx tauri dev`), never just the Vite web server. The user wants to see the native window, not a browser tab.

## Environment Variables

- `TOKKI_LLM_API_KEY` or `LLM_API_KEY` — required for LLM chat (read from env, NEVER hardcoded)
- `TOKKI_LLM_ENDPOINT` — optional, overrides the default Azure endpoint

**CRITICAL: Never commit API keys. The LLM client reads keys from env vars only.**

## Architecture

### Rust Backend (`src-tauri/src/`)

- **`runtime.rs`** — `SharedRuntime` (`Arc<Mutex<RuntimeState>>`) and `SharedLlmClient` (`Arc<tokio::sync::Mutex<LlmClient>>`), registered via `tauri::Builder::manage()`
- **`commands.rs`** — 11 Tauri commands: `start_behavior_loop`, `stop_behavior_loop`, `handle_user_interaction`, `get_current_state`, `advance_tick`, `send_chat_message`, `get_chat_history`, `set_avatar`, `get_session_memory`, `export_memory`, `import_memory`
- **`engine/behavior.rs`** — `BehaviorEngine` with seeded RNG, energy model (interactions +12, ticks -3, rest below 20), action scheduling
- **`engine/models.rs`** — Domain types: `Mood`, `BehaviorAction`, `TokkiState`, `TransitionReason`
- **`llm/client.rs`** — HTTP client with retry+backoff, system token stripping, brace-counting JSON parser for noisy model output
- **`llm/provider.rs`** — `LlmProvider` trait abstraction + `ProviderKind` enum (Azure, OpenAI, Ollama, Offline)
- **`llm/config.rs`** — `ProviderConfig` with defaults, env-var key loading, provider factory `build_provider()`
- **`llm/openai.rs`** — OpenAI-compatible provider (chat completions API)
- **`llm/ollama.rs`** — Ollama local provider (localhost:11434)
- **`llm/offline.rs`** — Template-based offline personality responses, no network required
- **`llm/grounding.rs`** — `SearchProvider` trait, `BingV7` implementation, retry+backoff, rate limiter (semaphore + interval)
- **`llm/memory.rs`** — `SessionMemory` tracks user name, topics, greet count, mood trend
- **`llm/models.rs`** — `LlmResponse`, `ChatMessage`, `LlmApiRequest`, `LlmApiResponse` (uses `choices[0].text` format)
- **`persistence/portable.rs`** — `PortableMemory` export/import format (versioned JSON), file I/O
- **`events.rs`** — Emits `tokki://behavior_tick` events to frontend

### React Frontend (`src/`)

- **`core/TokkiCharacter.tsx`** — Main orchestrator: lifecycle, interactions (click/hover/drag/poke), chat flow
- **`features/chat/`** — `ChatBubble.tsx`, `ChatInput.tsx`, `ChatHistory.tsx`
- **`features/games/`** — `CatchGame.tsx`, `FeedGame.tsx`
- **`features/hud/`** — `EnergyBar.tsx`, `MoodSparkles.tsx`, `StreakBadge.tsx`, `WeatherBadge.tsx`, `ThoughtBubbles.tsx`
- **`features/avatars/`** — `AvatarPicker.tsx`, `TokkiAvatarAsset.tsx`, `registry.ts`, `types.ts`, `index.ts`, 12 avatar components, `particles/` subdirectory
- **`features/settings/`** — `SettingsPanel.tsx`, `ContextMenu.tsx`
- **`features/onboarding/`** — `OnboardingWizard.tsx`
- **`bridge/tauri.ts`** — Dual-mode: real Tauri `invoke` when `__TAURI_INTERNALS__` exists, otherwise browser fallback simulator. Includes LLM chat, avatar, memory, provider config, export/import bridge functions
- **`state/useTokkiStore.ts`** — Single Zustand store: `TokkiState`, `connected`, `avatarId`, `chatMessages`, `currentReply`, `isTyping`, `chatOpen`
- **`animation/mapActionToView.ts`** — Maps `BehaviorAction.id` to CSS class names (`stateClass`, `toneClass`)
- **`types/tokki.ts`** — Shared TS types mirroring Rust models

### Window Config

- 320x380px, transparent, undecorated, non-resizable, always-on-top
- Drag via `startDragging()` with 4px threshold to distinguish from clicks

### Data & Privacy Architecture (Planned)

- **Memory DB**: `%LOCALAPPDATA%\Tokki\memory.db` — encrypted SQLite via `rusqlite` + `ring` (AES-256-GCM)
- **Encryption key**: Auto-generated on first launch, stored in Windows Credential Manager via `keyring` crate — no user password required
- **Update-safe**: Installer only touches app directory; `%LOCALAPPDATA%\Tokki\` is never overwritten
- **Zero telemetry**: No data leaves the machine unless the user explicitly chats via LLM

## Patterns & Conventions

- **No hardcoded secrets** — all keys via env vars
- **Flat Zustand store** — no nested state, individual selectors per field
- **All CSS in `src/style.css`** — keyframe animations drive visual states, tone classes swap CSS custom properties per mood
- **Rust tests inline** — `#[cfg(test)] mod tests` in each module
- **Frontend tests** — colocated `.test.ts` files next to source
- **JSON parsing from LLM** — brace-counting to find first complete JSON object in noisy output, with text fallback

## Known Gotchas

- **Port 1420 conflicts**: Kill stale Vite/Tauri processes before restarting (`taskkill` the node and tokki.exe PIDs)
- **LLM response format**: The Azure API returns `{"choices":[{"text":"..."}]}`, NOT `{"output":"..."}`. The `LlmApiResponse` struct uses `choices: Vec<LlmApiChoice>`
- **System tokens in LLM output**: Model appends `<|im_end|>`, `<|endoftext|>` etc. — these are stripped in `client.rs`
- **Click vs drag**: Avatar click toggles chat; drag moves window. Distinguished by a 4px movement threshold in `TokkiCharacter.tsx`
- **Cargo not in PATH**: Use `export PATH="$USERPROFILE/.cargo/bin:$PATH"` before any cargo/tauri commands

## Git & GitHub Accounts

This repo uses **two GitHub accounts** — handle with care:

| Account                  | Type                          | Use for                |
| ------------------------ | ----------------------------- | ---------------------- |
| **`saketlunker`**        | Personal GitHub               | Pushing code, PRs, fork-based contributions |
| **`saketlunker_microsoft`** | Enterprise Managed User (EMU) | Microsoft org work — **cannot fork external repos or push to non-org repos** |

### How to manage

- The **git config** in this repo is set to the Microsoft account (`saketlunker-microsoft` / `saketlunker@microsoft.com`)
- The **`gh` CLI** has both accounts logged in. Use `gh auth switch --user <name>` to toggle
- **To push to `jupram/tokki`**: must use `saketlunker` (personal) — the EMU account is blocked from external repos
- The repo has a **fork** at `saketlunker/tokki` with remote name `fork`. The upstream is `origin` → `jupram/tokki`
- **Always verify** which account is active before pushing: `gh auth status`

### Session workflow

- **At session start**: switch to `saketlunker` (personal) if git operations are needed for this repo
- **At session end (when user says bye)**: ALWAYS switch back to `saketlunker_microsoft` (office account) — the user's default working account for other Microsoft repos

### Quick reference

```bash
# Switch to personal account for pushing
gh auth switch --user saketlunker

# Switch back to Microsoft account (DO THIS BEFORE ENDING SESSION)
gh auth switch --user saketlunker_microsoft

# Check who's active
gh auth status

# Push via fork (if no direct access to jupram/tokki)
git push fork <branch>
gh pr create --repo jupram/tokki --head saketlunker:<branch>
```

### Credential helper note

The default `credential.helper = manager` may pop up GUI prompts in non-interactive shells. If `git push` hangs, use:
```bash
git -c credential.helper='!gh auth git-credential' push ...
```

## Remotes

```
origin  https://github.com/jupram/tokki.git     (upstream)
fork    https://github.com/saketlunker/tokki.git (personal fork)
```

---

## Roadmap (delete items once fully implemented)

### Phase 3 — Installation & Onboarding
- [ ] PowerShell one-liner installer: downloads pre-built binary from GitHub Releases, creates `%LOCALAPPDATA%\Tokki\`, sets up Start Menu shortcut, launches first-run experience
- [ ] First-run setup flow: pet names the user (or user names the pet), avatar selection, optional LLM API key input — all inside the app window, not a separate wizard
- [ ] Default names per avatar (rabbit: "Bun", "Thumper", "Clover"; cat: "Mochi", "Whiskers", "Luna"; fox: "Ember", "Scout", "Rusty") — user can accept or type custom
- [ ] `tokki update` PowerShell command: pulls latest from GitHub Releases, replaces app binary, preserves `%LOCALAPPDATA%\Tokki\` data directory

### Phase 4 — Persistent Memory & Privacy
- [ ] SQLite + `rusqlite` for persistent memory storage at `%LOCALAPPDATA%\Tokki\memory.db`
- [ ] AES-256-GCM encryption via `ring` crate — key auto-generated on first launch
- [ ] Store encryption key in Windows Credential Manager via `keyring` crate
- [ ] Migrate `SessionMemory` from in-memory to encrypted SQLite — user name, topics, preferences, conversation highlights, mood history
- [ ] Memory survives app restarts and updates

### Phase 5 — 14 Avatars with Mood-Triggered FX ✅
- [x] Expand from 3 → 14 avatars: rabbit (v1/v2), cat (v1/v2), dog, fox (v1/v2), dragon, phoenix, kitsune, serpent, penguin, turtle, celestial owl
- [x] Species-driven proportions — each pet shaped by its nature
- [x] Origin-matched cultural art styles per species (ukiyo-e rabbit, Egyptian cat, ink-wash fox, etc.)
- [x] SVG particle FX system: ember, petal, snow, wisp, star, ink trail — mood-triggered via `FXLayer`
- [x] True randomness: particle positions, animation timing, micro-behavior variance
- [x] Rare surprise animations (blink timer, tail wag, bounce)
- [x] Redesigned AvatarPicker for 14 options via `getAllAvatars()` registry

### Phase 6 — Rich Personality System ✅
- [x] Personality trait model: species (visual) + personality preset (behavioral) + humor/reaction_intensity/chattiness dials
- [x] Default personality per species — user can override via SettingsPanel
- [x] Personality affects: LLM system prompt, reaction intensity, vocabulary
- [x] Settings UI: SettingsPanel with name, humor, chattiness, reaction_intensity sliders + ambient sound toggle
- [x] Personality display in context menu (name + preset badge)

### Phase 7 — Presence Awareness & Proactive Behavior ✅
- [x] User activity detection: idle time tracking (60s threshold → sleep Zzz with thought bubbles)
- [x] Welcome back greetings after absence (duration-aware messages via `presence.rs`)
- [x] Break reminders after 45 min sustained activity (personality-flavored)
- [x] Mouse shake detection → dizzy reaction (4 reversals in 600ms, 5s cooldown)
- [x] Time-of-day awareness: morning/afternoon/evening/night bands, daily greeting, time-based proactive messages
- [x] Proactive message system: `presence.rs` with event-driven emission to frontend

### Phase 8 — Easter Eggs & Discovery ✅
- [x] Hidden interaction triggers: double-click pet (heart burst), mouse shake (dizzy), emoji rain on keywords
- [x] Context-aware surprises: weather badge (Open-Meteo API), time-of-day greetings
- [x] Achievement system: 14 achievements tracked via `AchievementStats` (clicks, pets, chats, games, minutes, streaks)
- [x] Streak tracking with milestone toasts
- [x] Toast notification system for achievements, streaks, proactive messages
- [x] Confetti burst on game completion with sfx fanfare

### Phase 9 — Mini-Games ✅
- [x] Catch game: falling objects, click to catch, score-based reactions
- [x] Feed game: food items with liked/disliked reactions per personality
- [x] Games are intuitive (no tutorial), rewarded with chat + animation + confetti
- [x] Game offer system: backend proposes games via events, user accepts/dismisses

### Phase 10 — Pluggable LLM & Cross-Platform ✅
- [x] LLM provider abstraction: config file selects Azure, OpenAI, Ollama (local), or custom endpoint
- [x] Offline personality mode: when no LLM, pet uses template-based responses flavored by personality traits
- [x] macOS build: Tauri + WebKit, same codebase — CI produces `.dmg`
- [x] Architect portable memory format for future cross-device sync (opt-in, user-controlled)
- [x] Grounding/search integration: Bing v7 provider, retry with exponential backoff, rate limiting, normalized results






Pending 
- the pet should not blink while sleeping
- if the pet is sleeping it should not wake up on hover, it should wake up on click or shake or couple of clicks random, mostly should wake up on click 90% the times, can say something like let me sleep etc..
