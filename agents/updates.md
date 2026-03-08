# Security and Performance Hardening Updates

Date: 2026-03-06

## Implemented Fixes

1. Enforced a non-null Content Security Policy (CSP) in Tauri config.
- File: `src-tauri/tauri.conf.json`
- Change: Replaced `"csp": null` with a restrictive policy that keeps script execution self-only and limits resource origins.
- Notes: Includes local dev websocket/http allowances for Vite/HMR.

2. Added streaming response-size enforcement for LLM HTTP responses.
- File: `src-tauri/src/commands.rs`
- Change: Kept early `content_length` guard when available, then added chunked body reads with a hard byte cap before JSON parse.
- Why: Prevents oversized/chunked responses from bypassing size checks and causing excessive memory growth.

3. Bounded in-memory fallback chat history.
- File: `src/bridge/tauri.ts`
- Change: Added `MAX_FALLBACK_CHAT_HISTORY` and centralized append helper that evicts oldest messages when cap is exceeded.
- Why: Prevents unbounded memory growth during long-running sessions.

4. Prevented external mutation of internal chat history storage.
- File: `src/bridge/tauri.ts`
- Change: `getChatHistory()` now returns a copy of the array, not the internal backing array.
- Why: Avoids accidental shared-mutable-state corruption.

## Validation Status

- Frontend unit tests (`npm run test:unit`): PASS (2 files, 6 tests).
- Rust tests (`cargo test` in `src-tauri`): currently blocked by missing MSVC linker (`link.exe`) in environment.
