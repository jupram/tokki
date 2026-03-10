> [Docs home](../../README.md) / [Analysis](../README.md) / Offline resilience quick reference
>
> Companion summary for the full offline-resilience report in this folder. Treat it as historical context and verify current behavior before acting on any recommendation.

# Offline Resilience Analysis — Quick Reference

**Status:** ✅ Complete  
**Analysis Date:** March 8, 2026  
**Todo:** inspect-offline-experience → **DONE**

---

## 4 Questions Answered

### 1️⃣ What does user need when network/provider is unavailable?

**Answer:** User needs clear error classification, automatic fallback to offline mode, provider validation, and sync status visibility.

**Current Gaps:**
- ❌ Generic "Hmm, I can't think..." error (no context)
- ❌ No automatic fallback to offline templates
- ❌ No provider validation before use
- ❌ Silent persistence failures
- ❌ Memory sync status invisible

---

### 2️⃣ Where does current offline UX create confusion?

**Answer:** No visual indicators, unclear error states, vague messages, and missing status displays.

**Key Issues:**
- No badge showing offline vs. live AI mode
- "Thinking..." placeholder is ambiguous
- Provider setup notes only in preview mode
- Error messages don't explain what went wrong
- Settings show no provider/memory status
- Memory errors too generic

---

### 3️⃣ What is ideal offline-first end-state?

**Answer:** Always show mode, auto-fallback on failure, clear errors, one-tap provider switching, visible sync status.

**Ideal Features:**
- Mode indicator badge (📄 Template vs. 🤖 Live AI)
- Auto-switch to offline when primary fails
- Specific errors: "Invalid API key" not "couldn't save"
- Provider test button in settings
- Memory sync status with timestamp
- Settings fallback to localStorage

---

### 4️⃣ What is broken/missing in fallback pathways?

**Answer:** 11 critical gaps preventing graceful degradation.

**Most Critical Gaps:**
1. No auto-fallback to offline provider (commands.rs:367)
2. No network status tracking (missing module)
3. No provider validation on config set (commands.rs:740)
4. No persistent fallback provider selection (tauri.ts:88)
5. Persistence errors are silent (lib.rs:22)

**Impact:** Single provider failure = dead end. User must manually switch to offline.

---

## 2-4 Implementable Improvements (Prioritized)

### Phase 1: CRITICAL (Do First)

| # | Improvement | Files | Effort | Impact |
|---|-------------|-------|--------|--------|
| 1 | Auto-fallback to offline | commands.rs | 30 min | Prevents dead-ends |
| 2 | Provider validation | commands.rs, OnboardingWizard.tsx | 1.5 hr | Catches bad configs early |
| 3 | Show provider status | commands.rs, SettingsPanel.tsx | 1 hr | User knows provider state |

### Phase 2: IMPORTANT (Do After Phase 1)

| # | Improvement | Files | Effort | Impact |
|---|-------------|-------|--------|--------|
| 4 | Differentiate errors | commands.rs, ChatWindow.tsx | 2 hr | User understands failures |
| 5 | Memory sync indicator | commands.rs, ContextMenu.tsx | 1.5 hr | User knows data is saved |
| 6 | Test Provider button | SettingsPanel.tsx | 45 min | One-click validation |

### Phase 3: POLISH (Optional)

| # | Improvement | Files | Effort | Impact |
|---|-------------|-------|--------|--------|
| 7 | Auto-retry with backoff | TokkiCharacter.tsx | 1 hr | Handles network blips |
| 8 | Offline mode badge | ChatWindow.tsx | 1 hr | Shows current mode |
| 9 | Settings localStorage fallback | SettingsPanel.tsx | 45 min | Doesn't lose settings |

---

## Implementation Scope Summary

**Total Effort:** ~8-10 days of development
- Phase 1: 2-3 days (critical path)
- Phase 2: 2-3 days (important UX)
- Phase 3: 2 days (polish, optional)

**Total Files Modified:** 5-7 files
- Backend: 1 file (commands.rs + possible new module)
- Frontend: 4-6 files (settings, chat, onboarding)

**Lines of Code:** ~300-400 LOC additions + modifications

**Risk Level:** LOW (mostly additive, isolated changes)

---

## Concrete Gaps with File References

### Gap 1: No Auto-Fallback
```
File: src-tauri/src/commands.rs:367-375
Issue: Provider fails → shows generic error
Missing: Try OfflineProvider if primary fails
Impact: User stuck, must manually switch
```

### Gap 2: No Network Detection
```
File: MISSING (src-tauri/src/network.rs)
Issue: Can't detect network availability
Missing: Network status tracking module
Impact: Can't auto-trigger offline mode
```

### Gap 3: No Provider Validation
```
File: src-tauri/src/commands.rs:740-755
Issue: set_provider_config() saves without testing
Missing: Connection test before accepting config
Impact: Invalid configs accepted, failures later
```

### Gap 4: Silent Persistence Failures
```
File: src-tauri/src/commands.rs:399-405
Issue: Memory save fails but error only logged to stderr
Missing: Return error to UI, update state
Impact: User unaware memory is lost
```

### Gap 5: No Provider Status Display
```
File: src/features/settings/SettingsPanel.tsx
Issue: No indication of current provider or its status
Missing: Status badge, test button
Impact: User can't verify provider works
```

### Gap 6: Generic Error Messages
```
File: src-tauri/src/commands.rs:367-370
Issue: All errors → "Hmm, I can't think right now..."
Missing: Error classification (network vs. auth vs. timeout)
Impact: User doesn't know what went wrong
```

### Gap 7: No Settings Fallback
```
File: src/features/settings/SettingsPanel.tsx:28-43
Issue: setPersonality() fails → settings lost
Missing: localStorage fallback if backend unavailable
Impact: Settings changes can be lost
```

### Gap 8: No Retry Logic
```
File: src/core/TokkiCharacter.tsx:615-651
Issue: Single failure → error shown
Missing: Automatic retry for transient errors
Impact: Network blips aren't handled
```

### Gap 9: Memory Status Invisible
```
File: src/features/settings/ContextMenu.tsx:114-126
Issue: Only shows error "Couldn't read memory right now"
Missing: Show sync status, retry option
Impact: User doesn't know memory state
```

### Gap 10: Provider Test Not During Setup
```
File: src/features/onboarding/OnboardingWizard.tsx:100-139
Issue: Provider config accepted without testing
Missing: Validate before completing onboarding
Impact: Invalid configs discovered on first chat
```

### Gap 11: No Provider Status Command
```
File: src-tauri/src/commands.rs (MISSING)
Issue: No way to check if current provider is available
Missing: get_provider_status() command
Impact: UI can't show provider health
```

---

## Evidence Files

All findings documented in:  
📄 **[`OFFLINE_RESILIENCE_ANALYSIS.md`](OFFLINE_RESILIENCE_ANALYSIS.md)** (comprehensive, 50K+ chars)

Located in: `C:\saketlunker_microsoft\tokki\`

---

## Next Steps (For Implementation Team)

### When Ready to Code:

1. **Review** [`OFFLINE_RESILIENCE_ANALYSIS.md`](OFFLINE_RESILIENCE_ANALYSIS.md) (full context)
2. **Start Phase 1** (critical, enables others):
   - Implement auto-fallback (30 min)
   - Add provider validation (1.5 hr)
   - Show status in settings (1 hr)
3. **Test** with offline scenarios:
   - Unplug network, try chat
   - Invalid API key in setup
   - Backend down during save
4. **Then Phase 2** (improve UX)
5. **Then Phase 3** (polish)

### Success Metrics

After implementation, verify:
- ✅ No dead-ends (always get response or clear error)
- ✅ Provider fails → auto-uses offline templates
- ✅ Bad config → caught before onboarding completes
- ✅ Memory sync status visible
- ✅ User knows current provider + mode

---

## Analysis Notes

- ✅ All 4 questions answered with code evidence
- ✅ 11 gaps identified with file:line references
- ✅ 9 improvements prioritized by impact
- ✅ Effort estimates provided
- ✅ Success criteria defined
- ✅ **Diagnostic only** — no source code modified

**Offline provider exists** (`offline.rs` is solid), just needs:
- Automatic triggering
- Better error messages
- Status visibility
- Validation
- Fallback mechanisms

---

**Analysis completed:** March 8, 2026  
**Status:** 🟢 READY FOR IMPLEMENTATION
