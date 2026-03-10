> [Docs home](../../README.md) / [Analysis](../README.md) / Offline resilience
>
> Historical diagnostic from March 2026. Some recommendations in this report have already been implemented or partially addressed, so validate against the live code before using it as a task list.

# Tokki Offline Resilience & Degradation Analysis

**Analysis Date:** March 2026  
**Status:** ✅ Complete - Diagnostic only, no code changes made  
**Scope:** Frontend (TypeScript/React) + Backend (Rust/Tauri)

---

## Executive Summary

The Tokki application has **basic offline support** via a template-based `OfflineProvider`, but lacks critical components for graceful degradation when the primary provider fails. Users experience **confusing error states**, **no automatic fallback**, and **silent failures** in persistence.

### Key Findings:
- ❌ **No automatic fallback** when live provider fails
- ❌ **No network status tracking** to trigger offline mode
- ❌ **Generic error messages** that don't explain what went wrong
- ❌ **Silent persistence failures** — UI unaware of sync problems
- ❌ **No provider validation** during setup/configuration
- ✅ Offline provider template system **exists and works** (`offline.rs`)
- ✅ Browser fallback mode **exists** (browser-based chat works)
- ✅ Provider switching architecture **exists** (can select offline/ollama/openai/defensivehub)

---

## Question 1: WHAT DOES USER NEED WHEN NETWORK/PROVIDER IS UNAVAILABLE?

### Current Behavior

#### 1.1 Chat Functionality Degradation

**File:** `src-tauri/src/commands.rs:367-375`

```rust
let reply = client
    .chat(&message, &history, &session_context, &personality_fragment)
    .await
    .unwrap_or_else(|error| {
        eprintln!("[tokki] LLM chat error: {error}");
        LlmResponse {
            line: "Hmm, I can't think right now... try again?".to_string(),
            mood: Mood::Sleepy,
            animation: "idle.blink".to_string(),
            intent: "none".to_string(),
        }
    });
```

**Issue:** When ANY error occurs (network timeout, invalid API key, provider unreachable), user gets identical message. They have **no idea why** the chat failed:
- Network down vs. server unreachable vs. auth failure = indistinguishable
- No indication whether the error is transient or permanent
- No suggestion to retry, fall back to offline, or check settings

**What User Actually Needs:**
- **Clear error classification:** "No internet" vs. "Invalid API key" vs. "OpenAI server down"
- **Actionable guidance:** "[Check Settings] [Use Template Mode] [Retry]"
- **Transient retry logic:** Automatic retry for timeouts, not for auth errors
- **Fallback to offline mode:** Don't just fail—try template mode

---

#### 1.2 Provider Configuration Persistence

**File:** `src/features/settings/SettingsPanel.tsx:28-43`

```typescript
const save = useCallback(async () => {
  if (!local) return;
  await setPersonality(local);  // ← No error handling!
  setStorePersonality(local);
  // ...
  onClose();
}, [avatarId, local, onClose, setStorePersonality]);
```

**Issue:**
- Settings changes call `setPersonality()` but don't handle failures
- If backend is unreachable, change is silently lost
- No feedback to user about whether save succeeded

**What User Actually Needs:**
- Confirmation: "✅ Settings saved" or "⚠️ Saved locally, will sync when online"
- Fallback: Save to localStorage if backend unreachable
- Status indicator: Show sync state in UI

---

#### 1.3 Session Memory Sync Failures

**File:** `src-tauri/src/commands.rs:402-404`

```rust
if let Err(error) = persistence.inner().save_session_memory(&memory_snapshot) {
    eprintln!("[tokki] failed to persist session memory: {error}");
    // ^ Silently continues, user is unaware
}
```

**Issue:**
- Memory save fails (encryption key missing, disk full, etc.)
- Only logged to stderr—UI has NO way to know
- User thinks memory is being saved but it's actually lost

**What User Actually Needs:**
- Status indicator: "Memory synced ✅" vs. "Memory not synced ⚠️"
- Manual retry option: "Retry sync" button
- Explanation: Why memory didn't sync (if retriable)

---

#### 1.4 Memory Load Failures

**File:** `src/features/settings/ContextMenu.tsx:220-223`

```typescript
{memoryError && (
  <div className="tokki-context-menu__memory-status tokki-context-menu__memory-status--error">
    {memoryError}
  </div>
)}
```

**Current Error:** `"Couldn't read memory right now."` (from `getSessionMemory()` catch)

**Issue:**
- No context about what went wrong
- Is it a network problem? Encryption issue? Backend down?
- No recovery path

**What User Actually Needs:**
- **If transient (network):** "Memory loading... will retry"
- **If persistent (encryption):** "Memory unavailable — check settings"
- **Manual retry:** "Retry" button

---

#### 1.5 Provider Switching (No Validation)

**File:** `src-tauri/src/commands.rs:740-755`

```rust
pub async fn set_provider_config(
    llm_client: State<'_, SharedLlmClient>,
    config: ProviderConfig,
) -> Result<ProviderInfo, String> {
    config.save()?;  // ← Saves to disk
    let new_provider = crate::llm::provider::create_provider(&config);
    // ^ Creates provider but DOESN'T TEST IT
    let name = new_provider.provider_name().to_string();
    let needs_net = new_provider.requires_network();
    let kind = config.provider.clone();
    *llm_client.0.lock().await = new_provider;
    Ok(ProviderInfo { ... })
}
```

**Issue:**
- Config is saved and provider is created without testing the connection
- User switches to OpenAI with invalid API key → appears to succeed
- Next message fails with generic error → user confused about what went wrong

**What User Actually Needs:**
- **Provider validation:** Test connection before accepting config
- **Specific error:** "Invalid API key for OpenAI" not just "couldn't save"
- **Test button in UI:** One-click to verify provider works

---

#### 1.6 Onboarding Provider Selection

**File:** `src/features/onboarding/OnboardingWizard.tsx:115-123`

```typescript
try {
  await setProviderConfig(selectedProviderConfig);
} catch (error) {
  console.error("Failed to apply onboarding provider config", error);
  setProviderError("Tokki couldn't save that chat setup yet. Double-check the fields or keep Tokki offline for now.");
  setIsFinishing(false);
  setStep("provider");
  return;
}
```

**Issue:**
- Error message is vague: "Double-check the fields"—which fields?
- User picks OpenAI, enters API key, onboarding succeeds (no validation)
- First chat fails with generic error
- User doesn't know if API key is wrong or if it's a network issue

**What User Actually Needs:**
- **Validation during setup:** "Testing OpenAI configuration..." → ✅ Ready
- **Clear feedback:** ❌ "Invalid API key" not ⚠️ "Double-check fields"
- **Offline option:** If live provider fails, "Use offline mode instead"

---

#### 1.7 Chat Input Disabled State (No Context)

**File:** `src/features/chat/ChatInput.tsx:40, 44, 52`

```typescript
placeholder={disabled ? "Thinking..." : "Say something..."}
disabled={disabled}
// Button also disabled
disabled={disabled || !value.trim()}
```

**Issue:**
- Input shows "Thinking..." when disabled, but for how long?
- User sees disabled input for 30 seconds with no context
- Is it processing? Is network down? Is there an error?
- No timeout indicator, no cancel option

**What User Actually Needs:**
- **Status message:** "Processing..." (0-5s) → "Still thinking..." (5-15s) → "Taking longer than expected..." (15s+)
- **Error if applicable:** "No internet connection" or "Provider not responding"
- **Cancel option:** "Stop waiting" button

---

### Summary: User Needs When Offline/Unavailable

| Need | Current State | Impact |
|------|---------------|--------|
| Clear error classification | Generic "Hmm, I can't think..." | User doesn't know what's wrong |
| Automatic fallback to offline | ❌ None | Single failure = stuck |
| Provider validation | ❌ None | Invalid config accepted silently |
| Retry logic | ❌ None | Transient failures are permanent |
| Sync status indicator | ❌ None | User unaware of data loss |
| Settings fallback | ❌ None (no error handling) | Settings silently lost |
| Memory status display | ❌ Generic "couldn't read" | Encryption/persistence issues invisible |

---

## Question 2: WHERE DOES CURRENT OFFLINE UX CREATE CONFUSION?

### 2.1 No Visual Indicator of Offline/Template Mode

**Files:**
- `src/core/TokkiCharacter.tsx` — No badge/indicator showing mode
- `src/features/settings/SettingsPanel.tsx` — No status display
- `src/features/chat/ChatWindow.tsx` — No mode indicator

**Issue:** User opens app, starts chatting. They don't know if they're:
- Talking to live AI (OpenAI/DefensiveHub)
- Talking to local Ollama
- Talking to template system (offline mode)

All three modes show the same interface. User might think a slow template response is from the live AI.

**Confusion Example:**
```
User: "Hmm, why is Tokki giving generic responses?"
Reality: They're in offline template mode (though they selected OpenAI)
User's Assumption: "Is the AI broken?" or "Is my API key wrong?"
```

---

### 2.2 "Thinking..." Placeholder is Unclear

**File:** `src/features/chat/ChatInput.tsx:40`

```typescript
placeholder={disabled ? "Thinking..." : "Say something..."}
```

**Issue:**
- "Thinking..." doesn't clarify what it's thinking about
- User doesn't know if this is normal processing delay or a hang
- No timeout, no "cancel" option
- Could be 100ms, could be 10 seconds, could be ∞ (error state)

**Confusion Timeline:**
```
t=0-2s:  User sees "Thinking...", assumes processing
t=2-5s:  Still says "Thinking...", user waits
t=5-10s: Getting concerned, no visibility into progress
t=10s+:  Is it hung? Is there an error? Should I close the app?
```

---

### 2.3 Provider Setup Notes Only in Preview Mode

**File:** `src/features/onboarding/ProviderSetupStep.tsx:107-112`

```typescript
{isPreviewMode && (
  <div className="onboarding__provider-note">
    Browser preview always uses Tokki's offline test replies, but this setup flow
    still mirrors real desktop onboarding.
  </div>
)}
```

**Issue:**
- Desktop users never see explanation of offline mode
- Users don't understand speed/privacy/AI-vs-template tradeoff
- No documentation of what "offline mode" means

**User Confusion:**
```
User sees options: "Offline | Ollama | OpenAI | DefensiveHub"
User's question: "What's the difference between offline and Ollama?"
Missing answer: Offline = templates, Ollama = local AI you run yourself
```

---

### 2.4 Provider Error Doesn't Explain What Failed

**File:** `src/features/onboarding/OnboardingWizard.tsx:119`

```typescript
setProviderError("Tokki couldn't save that chat setup yet. Double-check the fields or keep Tokki offline for now.");
```

**Issue:** Error message maps to multiple root causes:
- ❌ Invalid API key format
- ❌ API key was rejected by provider
- ❌ Network timeout during validation
- ❌ Backend unreachable
- ❌ File permission error saving config
- ❌ Disk full

All show the same message: "Double-check the fields"

**User's Mental Model:**
```
"What fields? I only entered an API key. Is it format? Length? Invalid characters?"
→ Makes random changes and retries
→ Repeats error, gives up
```

---

### 2.5 No Status Indicator in Settings

**File:** `src/features/settings/SettingsPanel.tsx` (entire file)

**Current Display:**
- Personality customization
- Avatar selection
- Audio toggle

**Missing:**
- 🤖 Current provider: "OpenAI" ← No display
- 📡 Provider status: Available/Unavailable ← No status check
- 🔄 Last sync: "2h ago" ← No timestamp
- 💾 Memory status: "Synced/Not Synced" ← Generic error only

**User Confusion:**
```
User makes settings change → Clicks save → No feedback on success
User wonders: "Did that save? Is my provider still working? Is memory synced?"
```

---

### 2.6 Memory Load Error Too Generic

**File:** `src/features/settings/ContextMenu.tsx:220-223`

**Current:** `"Couldn't read memory right now."`

**User's Possible Interpretations:**
- Network timeout (transient, retry should work)
- Encryption key missing (permanent, needs fix)
- Backend crashed (transient, retry should work)
- Memory corrupted (permanent, unrecoverable)

No context to distinguish. User doesn't know if they should retry or panic.

---

### 2.7 Chat Error Looks Like a Response

**File:** `src-tauri/src/commands.rs:370`

```rust
line: "Hmm, I can't think right now... try again?".to_string(),
```

**Issue:** This looks like a character response, not an error.

**User's Experience:**
```
User: "What time is it?"
Tokki: "Hmm, I can't think right now... try again?"
User: "Oh, is Tokki tired? Let me ask later..."
Reality: OpenAI API key is invalid. Tokki gave up without context.
```

---

### Summary: Confusion Points

| Issue | Location | Impact |
|-------|----------|--------|
| No offline/template mode badge | Chat UI | Can't tell if using AI or templates |
| "Thinking..." is vague | ChatInput | Don't know if processing, stuck, or errored |
| No provider explanation in setup | ProviderSetupStep | Don't understand offline vs. ollama |
| Generic error messages | OnboardingWizard, commands.rs | Can't diagnose or fix issues |
| No status display in settings | SettingsPanel | Can't verify provider/memory status |
| Memory error too vague | ContextMenu | Don't know if recoverable or permanent |
| Error looks like response | commands.rs | Confuse error state with character personality |

---

## Question 3: WHAT IS IDEAL OFFLINE-FIRST END-STATE?

### 3.1 Ideal Chat Experience

#### Mode Indicator Badge
```
┌─────────────────────────────────────┐
│  🤖 Live AI (OpenAI)    [2 users]   │  ← Shows current provider
├─────────────────────────────────────┤
│                                     │
│  User: "Hi Tokki!"                  │
│  Tokki: "Hey there! [Playful]"      │
│                                     │
└─────────────────────────────────────┘
```

vs. Offline mode:

```
┌─────────────────────────────────────┐
│  📄 Template Mode (Fast & Private)  │  ← Shows mode + benefit
├─────────────────────────────────────┤
│                                     │
│  User: "Hi Tokki!"                  │
│  Tokki: "Hi there! Nice to see you!"│
│                                     │
└─────────────────────────────────────┘
```

#### Automatic Fallback on Provider Failure
```
Primary provider fails → Automatically switch to template mode
Show notification: "Can't reach OpenAI, using template mode"
User can continue chatting without interruption
When network recovers: "Ready to switch back to OpenAI?"
```

#### Clear Error States
```
Network Error:
┌─────────────────────────────────────┐
│  ⚠️ No internet connection          │
│  Tokki is in template mode          │
│  [Retry] [Stay Offline] [Settings]  │
└─────────────────────────────────────┘

Invalid API Key:
┌─────────────────────────────────────┐
│  ❌ OpenAI API key is invalid        │
│  Check Settings → Provider Setup     │
│  [Go to Settings] [Use Templates]    │
└─────────────────────────────────────┘

Provider Timeout:
┌─────────────────────────────────────┐
│  ⏳ OpenAI isn't responding (6s)    │
│  Still trying... [Waiting: 4s]      │
│  [Cancel] [Use Templates]           │
└─────────────────────────────────────┘
```

---

### 3.2 Ideal Provider Management

#### One-Tap Provider Switching
```
Settings → Provider

Current: 🤖 OpenAI
┌─────────────────────────────────┐
│ ✅ Connected (last tested 10m) │
│ [Test Now] [Manage]            │
└─────────────────────────────────┘

Other Providers:
┌─────────────────────────────────┐
│ 📄 Offline (Template Mode)      │ ← Instant, always works
│ [Switch to This]                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🖥️  Ollama (Local)              │ ← Needs local server
│ ❌ Not found (offline?)         │
│ [Test Now] [Switch to This]     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🧠 DefensiveHub (Enterprise)    │ ← Network required
│ ⚠️ Key not configured           │
│ [Manage]                        │
└─────────────────────────────────┘
```

#### Provider Validation
- User enters API key → Click "Test"
- Result appears immediately:
  - ✅ "Ready to use"
  - ❌ "Invalid key format" 
  - ❌ "Server rejected key (auth failed)"
  - ❌ "Server timeout (check network)"

No guessing. Config is only saved if validation succeeds.

---

### 3.3 Ideal Settings Experience

#### Memory Sync Status
```
Session Memory
┌──────────────────────────────────┐
│ ✅ Synced — Last update 2h ago   │ ← Clear status
│ [Manual Sync]                    │ ← Manual control
│ Your memory includes:            │
│ • User name: Alex               │
│ • 47 conversation highlights    │
│ • 12 preferences learned        │
└──────────────────────────────────┘
```

vs. Failure state:

```
Session Memory
┌──────────────────────────────────┐
│ ⚠️ Sync Failed (using local copy)│
│ Last successful: 4 hours ago     │
│ Reason: Encryption key missing   │
│ [Retry] [Manage Encryption]      │
└──────────────────────────────────┘
```

#### Provider Status Display
```
Chat Provider
┌──────────────────────────────────┐
│ Current: OpenAI                  │
│ Status: ✅ Connected             │
│ Last tested: 5 minutes ago       │
│ [Test Now] [Change Provider]     │
└──────────────────────────────────┘
```

---

### 3.4 Ideal Onboarding

#### Clear Provider Explanations
```
Choose how Tokki chats with you:

📄 OFFLINE (Template Mode)
✨ Instant • Private • Always works
Uses pre-written templates. No AI, no network needed.
Best for: Quick responses, testing, complete privacy
⚡ Speed: <100ms • 🔒 Privacy: Maximum

🖥️  OLLAMA (Local AI)
🧠 Smart AI • No internet • Must be running
Run AI on your machine. Works offline once started.
Best for: Full AI capability, offline, private
⚡ Speed: Depends on hardware • 🔒 Privacy: Maximum

🌐 OPENAI (OpenAI API)
💬 Smart conversational AI • Network required
Real GPT-3.5 or GPT-4. Requires active internet + API key.
Best for: Latest AI, cloud features, flexibility
⚡ Speed: 2-10s • 🔒 Privacy: Sent to OpenAI servers

🏢 DEFENSIVEHUB (Enterprise)
🔐 Enterprise AI • Network required
Secure corporate AI infrastructure.
Best for: Enterprise users, compliance
⚡ Speed: 2-10s • 🔒 Privacy: Enterprise-grade
```

#### Validation During Setup
```
User selects OpenAI → Enters API key → Clicks "Finish"

[Testing OpenAI configuration...]
[████████████░░░░░░░░░░░] 60% Complete

Result: ✅ Connected! Ready to chat.
[Complete Onboarding]

OR

Result: ❌ Invalid API key. Check your key in OpenAI dashboard.
[Fix Key] [Skip to Offline Mode]
```

---

### 3.5 Ideal Retry & Fallback Logic

#### Smart Retry Strategy
```
User sends message:
  1. Try primary provider (OpenAI)
  
  If timeout after 5s:
    → Show "Still waiting..." (retry counter)
    → Allow user to [Cancel] [Use Template Mode]
  
  If fails with auth error (invalid key):
    → Show "Invalid API key. Check settings."
    → Don't retry (permanent error)
  
  If fails with network error:
    → Show "No internet. Using template mode."
    → Auto-switch to offline
    → Prompt to switch back when network returns
```

---

### Summary: Ideal End-State Principles

1. **Always show mode** — User knows if they're using AI or templates
2. **Automatic fallback** — Primary fails → switch to offline, keep working
3. **Clear errors** — Show specific reason and recovery path
4. **One-tap switching** — Switch providers without settings menu
5. **Provider validation** — Test before accepting config
6. **Sync status visible** — Show if memory/settings are synced
7. **Smart retry** — Distinguish transient vs. permanent errors
8. **Settings safety** — Save locally if backend unavailable
9. **Status indicators** — Badges, colors, icons showing state
10. **Offline-first defaults** — Offline mode is always available

---

## Question 4: WHAT IS BROKEN/MISSING IN FALLBACK PATHWAYS?

### Gap 1: ❌ No Automatic Fallback to Offline Mode

**File:** `src-tauri/src/commands.rs:367-375`

**Current Code:**
```rust
let reply = client
    .chat(&message, &history, &session_context, &personality_fragment)
    .await
    .unwrap_or_else(|error| {
        eprintln!("[tokki] LLM chat error: {error}");
        LlmResponse {
            line: "Hmm, I can't think right now... try again?".to_string(),
            mood: Mood::Sleepy,
            animation: "idle.blink".to_string(),
            intent: "none".to_string(),
        }
    });
```

**What's Missing:**
```rust
// MISSING: Try offline provider if primary fails
let reply = match client.chat(...).await {
    Ok(response) => response,
    Err(error) => {
        eprintln!("[tokki] LLM call failed: {error}, falling back to offline");
        let offline = OfflineProvider::new();
        offline
            .chat(&message, &history, &session_context, &personality_fragment)
            .await
            .unwrap_or_else(|_| LlmResponse { ... })
    }
};
```

**Impact:** Every provider failure = stuck. No graceful degradation.

---

### Gap 2: ❌ No Network Status Tracking

**Missing File:** `src-tauri/src/network.rs` (doesn't exist)

**What's Missing:**
```rust
// MISSING: Network detection module
#[cfg(target_os = "windows")]
fn is_network_available() -> bool {
    // Windows network check
    true
}

#[cfg(not(target_os = "windows"))]
fn is_network_available() -> bool {
    // Unix network check
    true
}

// Emit event when network state changes
#[tauri::command]
pub async fn subscribe_network_status(handler: NetworkStatusHandler) { }

// In send_chat_message:
if !is_network_available() && client.requires_network() {
    return OfflineProvider::new().chat(...).await;
}
```

**Impact:** App can't know if network is down. Can't auto-switch to offline mode.

---

### Gap 3: ❌ Incomplete Error Handling in Provider Switching

**File:** `src-tauri/src/commands.rs:740-755`

**Current Code:**
```rust
pub async fn set_provider_config(
    llm_client: State<'_, SharedLlmClient>,
    config: ProviderConfig,
) -> Result<ProviderInfo, String> {
    config.save()?;  // Saves to disk
    let new_provider = crate::llm::provider::create_provider(&config);
    // ^ Creates provider but DOESN'T TEST IT
    let name = new_provider.provider_name().to_string();
    let needs_net = new_provider.requires_network();
    let kind = config.provider.clone();
    *llm_client.0.lock().await = new_provider;
    Ok(ProviderInfo { ... })
}
```

**What's Missing:**
```rust
pub async fn set_provider_config(
    llm_client: State<'_, SharedLlmClient>,
    config: ProviderConfig,
) -> Result<ProviderInfo, String> {
    // MISSING: Validate provider before saving
    let new_provider = crate::llm::provider::create_provider(&config);
    
    if new_provider.requires_network() {
        // Test the connection
        match validate_provider_connection(&new_provider, &config).await {
            Ok(_) => {
                // Valid - save and use
                config.save()?;
                let name = new_provider.provider_name().to_string();
                let needs_net = new_provider.requires_network();
                let kind = config.provider.clone();
                *llm_client.0.lock().await = new_provider;
                Ok(ProviderInfo { provider: kind, provider_name: name, requires_network: needs_net })
            }
            Err(reason) => {
                // Invalid - return specific error
                Err(reason) // e.g., "Invalid API key" not generic error
            }
        }
    } else {
        // Offline mode - always valid
        config.save()?;
        // ...
    }
}

async fn validate_provider_connection(
    provider: &Box<dyn LlmProvider>,
    config: &ProviderConfig,
) -> Result<(), String> {
    match provider.provider_name() {
        "OpenAI" => validate_openai_key(&config.api_key).await,
        "DefensiveHub" => validate_defensivehub_key(&config.api_key).await,
        "Ollama" => validate_ollama_endpoint(&config.endpoint).await,
        "offline" => Ok(()), // Always valid
        _ => Ok(()),
    }
}
```

**Impact:** Invalid configs are accepted, failures happen later during chat.

---

### Gap 4: ❌ No Persistent Fallback Provider Selection

**File:** `src/bridge/tauri.ts:88-139` (browser fallback mode)

**Current:** Browser uses same provider config as Tauri, which will fail if offline without network.

**What's Missing:**
```typescript
function getFallbackProvider(): ProviderKind {
    const stored = readStoredFallbackProviderConfig();
    
    // MISSING: If primary requires network and network unavailable
    if (stored.provider !== "offline" && !hasNetwork()) {
        // Auto-switch to offline mode
        console.log("Network unavailable, falling back to offline mode");
        fallbackProviderConfig = createProviderConfig("offline");
        return "offline";
    }
    
    return stored.provider;
}
```

**Impact:** In browser mode, switching to OpenAI then going offline = can't use app.

---

### Gap 5: ❌ Missing Persistence Error States

**File:** `src-tauri/src/lib.rs:22-28`

**Current Code:**
```rust
let runtime = SharedRuntime::from_persistence(&persistence).unwrap_or_else(|error| {
    eprintln!("[tokki] failed to restore persistent session memory: {error}");
    eprintln!(
        "[tokki] running in-memory only; encrypted persistence remains disabled..."
    );
    SharedRuntime::default()  // Silent failure
});
```

**What's Missing:**
```rust
// Add persistence state flag
#[derive(Clone)]
pub struct RuntimeState {
    pub persistence_available: bool,  // ← NEW
    pub persistence_error: Option<String>,  // ← NEW
    // ... rest
}

// In commands.rs
#[tauri::command]
pub async fn get_persistence_status(
    runtime: State<'_, SharedRuntime>,
) -> Result<PersistenceStatus, String> {
    let guard = runtime.0.lock().await;
    Ok(PersistenceStatus {
        available: guard.persistence_available,
        error: guard.persistence_error.clone(),
        last_sync: guard.last_memory_sync_time,
    })
}

// UI can now check status and display warning if needed
```

**Impact:** UI has no visibility into persistence failures. User unaware of data loss.

---

### Gap 6: ❌ No Retry Logic for Transient Failures

**File:** `src/core/TokkiCharacter.tsx:615-651`

**Current Code:**
```typescript
try {
    const response = await sendChatMessage(message);
    // ... handle success
} catch (error) {
    console.error("Chat failed", error);
    setCurrentReply({
        line: "Oops, my brain fizzled... try again?",
        mood: "sleepy",
        animation: "idle.blink",
        intent: "none"
    });
}
```

**What's Missing:**
```typescript
// MISSING: Intelligent retry logic
async function sendChatWithRetry(message: string, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await sendChatMessage(message);
        } catch (error) {
            // Distinguish transient vs. permanent
            if (isTransientError(error) && attempt < maxRetries) {
                console.log(`Attempt ${attempt} failed, retrying...`);
                await new Promise(r => setTimeout(r, 1000 * attempt)); // Backoff
                continue;
            } else {
                throw error;
            }
        }
    }
}

function isTransientError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes("timeout") || 
           msg.includes("temporarily unavailable") ||
           msg.includes("econnrefused");
}
```

**Impact:** Single transient failure (network blip) = user must manually retry.

---

### Gap 7: ❌ No Graceful Degradation for Settings Changes

**File:** `src/features/settings/SettingsPanel.tsx:28-43`

**Current Code:**
```typescript
const save = useCallback(async () => {
    if (!local) return;
    await setPersonality(local);  // No error handling!
    setStorePersonality(local);
    // ...
    onClose();
}, [avatarId, local, onClose, setStorePersonality]);
```

**What's Missing:**
```typescript
const save = useCallback(async () => {
    if (!local) return;
    
    try {
        // Try backend save
        await setPersonality(local);
        // Backend succeeded
        setStorePersonality(local);
        setFeedback({ type: "success", message: "Saved!" });
    } catch (error) {
        console.error("Backend save failed", error);
        
        // MISSING: Fallback to localStorage
        try {
            localStorage.setItem("tokki_personality", JSON.stringify(local));
            setStorePersonality(local);
            setFeedback({ type: "warning", message: "Saved locally (will sync when online)" });
        } catch (storageError) {
            setFeedback({ type: "error", message: "Couldn't save settings" });
            return;
        }
    }
    
    window.setTimeout(() => onClose(), 1500);
}, [avatarId, local, onClose, setStorePersonality]);
```

**Impact:** Settings lost if backend unreachable, user unaware.

---

### Gap 8: ❌ No Offline-Mode Test During Onboarding

**File:** `src/features/onboarding/OnboardingWizard.tsx:100-139`

**Current Code:**
```typescript
const handleFinish = useCallback(async (selectedProviderConfig: ProviderConfig) => {
    const trimmedName = petName.trim();
    if (!trimmedName || isFinishing) {
        return;
    }

    setIsFinishing(true);
    setProviderError(null);

    const profile = createOnboardingProfile({
        avatarId,
        name: trimmedName,
        userName: userName.trim() || null,
    });

    try {
        await setProviderConfig(selectedProviderConfig);
    } catch (error) {
        console.error("Failed to apply onboarding provider config", error);
        setProviderError("Tokki couldn't save that chat setup yet. Double-check the fields or keep Tokki offline for now.");
        setIsFinishing(false);
        setStep("provider");
        return;
    }
    // ...
}, [avatarId, isFinishing, onComplete, petName, setAvatarId, setStorePersonality, userName]);
```

**What's Missing:**
```typescript
const handleFinish = useCallback(async (selectedProviderConfig: ProviderConfig) => {
    // ... validation code ...
    
    try {
        // MISSING: Test provider BEFORE accepting
        setStep("testing");
        const validation = await validateProvider(selectedProviderConfig);
        
        if (!validation.ok) {
            setProviderError(`${validation.error}. [Try different settings] [Use offline mode]`);
            setIsFinishing(false);
            setStep("provider");
            return;
        }
        
        // Valid - save
        await setProviderConfig(selectedProviderConfig);
    } catch (error) {
        // ... error handling ...
    }
    // ...
}, [...]);

async function validateProvider(config: ProviderConfig): Promise<ValidationResult> {
    if (config.provider === "offline") return { ok: true };
    
    // Test connection before accepting
    const testMessage = "test";
    try {
        const result = await invoke("test_provider_config", { config });
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: extractSpecificError(error) // "Invalid API key" not generic error
        };
    }
}
```

**Impact:** Invalid config accepted, fails on first use.

---

### Gap 9: ❌ No Command to Get Current Provider Status

**Missing Command:** No `get_provider_status()` in `commands.rs`

**What's Missing:**
```rust
// In src-tauri/src/commands.rs
#[tauri::command]
pub async fn get_provider_status(
    llm_client: State<'_, SharedLlmClient>,
) -> Result<ProviderStatus, String> {
    let client = llm_client.0.lock().await;
    let provider_name = client.provider_name().to_string();
    let requires_network = client.requires_network();
    
    // Test if available
    let is_available = if requires_network {
        match validate_provider_connection(&*client).await {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        true  // Offline always available
    };
    
    Ok(ProviderStatus {
        provider_name,
        requires_network,
        is_available,
        last_tested: SystemTime::now(),
    })
}

#[tauri::command]
pub async fn test_provider_config(config: ProviderConfig) -> Result<(), String> {
    let provider = crate::llm::provider::create_provider(&config);
    validate_provider_connection(&*provider).await
}
```

**Impact:** UI can't know if current provider works. Can't show status in settings.

---

### Gap 10: ❌ Memory Persistence Silent Failures

**File:** `src-tauri/src/commands.rs:399-405`

**Current Code:**
```rust
// Auto-save memory to persistent storage
let memory_snapshot = guard.session_memory.clone();
drop(guard);
if let Err(error) = persistence.inner().save_session_memory(&memory_snapshot) {
    eprintln!("[tokki] failed to persist session memory: {error}");
    // ^ Silently continues, user doesn't know
}
```

**What's Missing:**
```rust
// MISSING: Return error to UI, track persistence state
match persistence.inner().save_session_memory(&memory_snapshot) {
    Ok(_) => {
        // Update runtime: persistence_available = true
        let mut guard = runtime.0.lock().await;
        guard.persistence_available = true;
        guard.persistence_error = None;
        guard.last_memory_sync_time = Some(SystemTime::now());
    }
    Err(error) => {
        // MISSING: Update runtime with error state
        let mut guard = runtime.0.lock().await;
        guard.persistence_available = false;
        guard.persistence_error = Some(error.to_string());
        
        eprintln!("[tokki] failed to persist session memory: {error}");
        // Emit event to UI: "Memory not synced"
    }
}
```

**Impact:** User's memory is silently lost, they don't know until data is gone.

---

### Gap 11: ❌ No Fallback on Memory Load Failure

**File:** `src/features/settings/ContextMenu.tsx:114-126`

**Current Code:**
```typescript
void getSessionMemory()
    .then((mem) => setMemoryCard(mem))
    .catch(() => {
        setMemoryError("Couldn't read memory right now.");
    })
```

**What's Missing:**
```typescript
void getSessionMemory()
    .then((mem) => setMemoryCard(mem))
    .catch(async (error) => {
        // MISSING: Try fallback sources
        try {
            const cached = localStorage.getItem("tokki_memory_cache");
            if (cached) {
                setMemoryCard(JSON.parse(cached));
                setMemoryError("Using cached memory (sync failed)");
                return;
            }
        } catch {}
        
        // Specific error message
        const specific = error.message.includes("encryption")
            ? "Memory encryption key unavailable"
            : "Couldn't load memory (network issue?)";
        setMemoryError(specific);
    })
```

**Impact:** Any memory load failure = stuck, no fallback.

---

### Gap Summary Table

| Gap # | Issue | File | Line(s) | Severity |
|-------|-------|------|---------|----------|
| 1 | No auto-fallback to offline | commands.rs | 367-375 | 🔴 Critical |
| 2 | No network detection | Missing | — | 🔴 Critical |
| 3 | No provider validation | commands.rs | 740-755 | 🔴 Critical |
| 4 | No fallback provider selection | tauri.ts | 88-139 | 🟡 High |
| 5 | Persistence errors silent | lib.rs | 22-28 | 🟡 High |
| 6 | No retry logic | TokkiCharacter.tsx | 615-651 | 🟡 High |
| 7 | No settings fallback | SettingsPanel.tsx | 28-43 | 🟠 Medium |
| 8 | No provider test during setup | OnboardingWizard.tsx | 100-139 | 🟠 Medium |
| 9 | No provider status command | commands.rs | Missing | 🟠 Medium |
| 10 | Memory save failures silent | commands.rs | 399-405 | 🟠 Medium |
| 11 | No memory load fallback | ContextMenu.tsx | 114-126 | 🟠 Medium |

---

## Concrete Recommendations: Prioritized Implementation Plan

### Phase 1: Critical (Blocks Core Functionality)

#### **Improvement 1: Automatic Fallback to Offline Provider**

**Scope:** Backend only (Rust)  
**Files to Modify:** `src-tauri/src/commands.rs` (line 367-375)

**What:** When `send_chat_message()` fails with primary provider, automatically try offline provider.

**Why:** Currently, any provider failure = dead end. User must manually switch to offline mode.

**Implementation:**
```rust
let reply = client.chat(...).await.or_else(|error| {
    eprintln!("[tokki] Primary provider failed: {error}, trying offline fallback");
    let offline = OfflineProvider::new();
    offline.chat(&message, &history, &session_context, &personality_fragment).await
})?;
```

**Deliverable:** User sends message → primary fails → auto-uses template mode → continues chatting

**Effort:** ~30 minutes  
**Files Changed:** 1  
**Risk:** Low (fallback is tested component)

---

#### **Improvement 2: Add Provider Validation on Configuration**

**Scope:** Backend + Frontend  
**Files to Modify:**
- `src-tauri/src/commands.rs` (add `validate_provider_config()` and `test_provider_config()` commands)
- `src/features/onboarding/OnboardingWizard.tsx` (call validation before finish)
- `src/features/settings/SettingsPanel.tsx` (add "Test Provider" button)

**What:** Before accepting provider config, test it actually works.

**Why:** Invalid API keys are silently accepted, failures happen during chat.

**Implementation:**

Backend new commands:
```rust
#[tauri::command]
pub async fn test_provider_config(config: ProviderConfig) -> Result<(), String> {
    let provider = create_provider(&config);
    provider.chat("test", &[], "", "").await.map(|_| ())
}
```

Frontend integration (OnboardingWizard):
```typescript
const validation = await invoke("test_provider_config", { config: selectedProviderConfig });
if (!validation.ok) {
    setProviderError(extractSpecificError(validation.error));
    return;
}
```

**Deliverable:**
- User enters OpenAI API key → clicks "Finish"
- System validates: ✅ "Ready" or ❌ "Invalid key"
- Only accepts valid configs

**Effort:** ~1.5 hours  
**Files Changed:** 3  
**Risk:** Low (validation isolated, non-breaking)

---

#### **Improvement 3: Show Provider Status in Settings**

**Scope:** Frontend + Backend  
**Files to Modify:**
- `src-tauri/src/commands.rs` (add `get_provider_status()` command)
- `src/features/settings/SettingsPanel.tsx` (display status badge)

**What:** Show current provider and its availability status in settings panel.

**Why:** User doesn't know if their configured provider is working.

**Implementation:**

Backend:
```rust
#[tauri::command]
pub async fn get_provider_status(llm_client: State<'_, SharedLlmClient>) -> Result<ProviderStatus, String> {
    let client = llm_client.0.lock().await;
    Ok(ProviderStatus {
        provider_name: client.provider_name().to_string(),
        requires_network: client.requires_network(),
        is_available: test_provider_connection(&*client).await.is_ok(),
    })
}
```

Frontend display:
```tsx
<div className="provider-status">
  <div>Current Provider: <strong>{status.provider_name}</strong></div>
  {status.is_available ? (
    <div className="status-ok">✅ Connected</div>
  ) : (
    <div className="status-error">❌ Unavailable</div>
  )}
  <button onClick={() => invoke("test_provider_config")}>Test Now</button>
</div>
```

**Deliverable:** User opens Settings → sees "✅ OpenAI Connected" or "❌ OpenAI Unavailable"

**Effort:** ~1 hour  
**Files Changed:** 2  
**Risk:** Low (read-only status display)

---

### Phase 2: Important (Improves UX Significantly)

#### **Improvement 4: Differentiate Error Messages**

**Scope:** Backend + Frontend  
**Files to Modify:**
- `src-tauri/src/commands.rs` (classify errors before returning)
- `src/features/chat/ChatWindow.tsx` (display error-specific UI)

**What:** Instead of generic "Hmm, I can't think...", show:
- "🔌 No internet connection"
- "🔑 Invalid API key"
- "⏳ Provider not responding (retry...)"

**Why:** User needs to know if error is transient (retry) or permanent (fix settings).

**Implementation:**

Backend:
```rust
#[derive(Serialize)]
pub enum ChatError {
    NetworkUnavailable,
    InvalidApiKey,
    ProviderTimeout,
    ProviderUnreachable,
}

let reply = match client.chat(...).await {
    Ok(resp) => resp,
    Err(error) => {
        let error_kind = classify_error(&error);
        return Err(error_kind);
    }
}
```

Frontend:
```typescript
try {
    const response = await sendChatMessage(message);
} catch (error) {
    const message = error.kind === "NetworkUnavailable" 
        ? "No internet. Using template mode."
        : error.kind === "InvalidApiKey"
        ? "API key invalid. Check settings."
        : "Hmm, taking longer than usual...";
    setErrorMessage(message);
}
```

**Deliverable:** User sees specific error reason, knows what to do.

**Effort:** ~2 hours  
**Files Changed:** 3-4  
**Risk:** Medium (affects error handling paths)

---

#### **Improvement 5: Add Memory Sync Status Indicator**

**Scope:** Frontend + Backend  
**Files to Modify:**
- `src-tauri/src/commands.rs` (add `get_memory_status()` command)
- `src/features/settings/ContextMenu.tsx` (display sync status)

**What:** Show in menu: "✅ Memory synced 2h ago" or "⚠️ Memory not synced (key missing)"

**Why:** User unaware if memory is being saved or lost.

**Implementation:**

Backend:
```rust
#[tauri::command]
pub async fn get_memory_status(runtime: State<'_, SharedRuntime>) -> Result<MemoryStatus, String> {
    let guard = runtime.0.lock().await;
    Ok(MemoryStatus {
        is_synced: guard.persistence_available,
        last_sync: guard.last_memory_sync_time,
        error: guard.persistence_error.clone(),
    })
}
```

Frontend:
```tsx
const status = await invoke("get_memory_status");
{status.is_synced ? (
    <div>✅ Memory synced — {formatTime(status.last_sync)}</div>
) : (
    <div>⚠️ Memory not syncing — {status.error}</div>
)}
<button onClick={retrySync}>Retry Sync</button>
```

**Deliverable:** User sees memory status in context menu + can manually retry.

**Effort:** ~1.5 hours  
**Files Changed:** 2  
**Risk:** Low (status display only)

---

#### **Improvement 6: Add "Test Provider" Button in Settings**

**Scope:** Frontend only  
**Files to Modify:** `src/features/settings/SettingsPanel.tsx`

**What:** One-click button to test current provider configuration.

**Why:** User can verify provider works without waiting for chat failure.

**Implementation:**

```typescript
const testProvider = async () => {
    setTesting(true);
    try {
        await invoke("test_provider_config", { config: providerConfig });
        setTestResult({ ok: true, message: "Provider is ready!" });
    } catch (error) {
        setTestResult({ ok: false, message: extractError(error) });
    } finally {
        setTesting(false);
    }
};

<button onClick={testProvider} disabled={testing}>
    {testing ? "Testing..." : "Test Provider"}
</button>
{testResult && (
    <div className={testResult.ok ? "success" : "error"}>
        {testResult.message}
    </div>
)}
```

**Deliverable:** User clicks "Test Provider" → sees ✅ or ❌ immediately.

**Effort:** ~45 minutes  
**Files Changed:** 1  
**Risk:** Low (button action already exists from Phase 1)

---

### Phase 3: Polish (Nice-to-Have Improvements)

#### **Improvement 7: Automatic Retry with Exponential Backoff**

**Scope:** Frontend  
**Files to Modify:** `src/core/TokkiCharacter.tsx`

**What:** If chat fails with timeout/transient error, automatically retry up to 2x before showing error.

**Why:** Network blips shouldn't require manual retry.

**Implementation:**

```typescript
async function sendChatWithRetry(message: string, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await sendChatMessage(message);
        } catch (error) {
            if (isTransientError(error) && attempt < maxRetries) {
                const delay = 1000 * attempt;  // 1s, then 2s
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw error;
        }
    }
}
```

**Effort:** ~1 hour  
**Risk:** Low (retry logic isolated)

---

#### **Improvement 8: Offline Mode Badge in Chat UI**

**Scope:** Frontend  
**Files to Modify:** `src/features/chat/ChatWindow.tsx`, `src/core/TokkiCharacter.tsx`

**What:** Show badge "📄 Template Mode" or "🤖 Live AI" above chat.

**Why:** User confused whether using AI or templates.

**Implementation:**

```tsx
const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

useEffect(() => {
    invoke("get_provider_status").then(setProviderStatus);
}, []);

<div className="chat-header">
    {providerStatus?.provider_name === "offline" && (
        <div className="badge badge--offline">📄 Template Mode</div>
    )}
    {providerStatus?.provider_name !== "offline" && (
        <div className="badge badge--live">🤖 {providerStatus?.provider_name}</div>
    )}
</div>
```

**Effort:** ~1 hour  
**Risk:** Low (display only)

---

#### **Improvement 9: Settings Fallback to LocalStorage**

**Scope:** Frontend  
**Files to Modify:** `src/features/settings/SettingsPanel.tsx`

**What:** If backend save fails, save to localStorage + show "Saved locally (will sync when online)"

**Why:** Settings shouldn't be lost if backend is down.

**Implementation:**

```typescript
const save = useCallback(async () => {
    if (!local) return;
    
    try {
        await setPersonality(local);
        setFeedback({ type: "success", message: "Saved!" });
    } catch (error) {
        localStorage.setItem("tokki_personality_draft", JSON.stringify(local));
        setFeedback({ 
            type: "warning", 
            message: "Saved locally (will sync when online)" 
        });
    }
    
    setStorePersonality(local);
    onClose();
}, [avatarId, local, onClose, setStorePersonality]);
```

**Effort:** ~45 minutes  
**Risk:** Low (graceful fallback)

---

## Implementation Roadmap

### ✅ Phase 1: Critical (2-3 days)
1. Auto-fallback to offline provider
2. Provider validation on configuration
3. Provider status in settings

**Outcome:** Core fallback + validation working. Users won't get stuck.

### ✅ Phase 2: Important (2-3 days)
4. Differentiated error messages
5. Memory sync status indicator
6. Test Provider button

**Outcome:** Clear error states. User knows what's happening.

### ✅ Phase 3: Polish (2 days, optional)
7. Auto-retry with backoff
8. Offline mode badge
9. Settings localStorage fallback

**Outcome:** Polished, resilient experience.

---

## Key Metrics to Validate

After implementation:

1. **No dead-ends:** User tries any action → always gets response or clear error
2. **Fallback success rate:** % of failed requests that fall back to offline successfully
3. **Provider validation:** 100% of provider configs tested before acceptance
4. **Error clarity:** User comprehension of error messages (survey/testing)
5. **Memory reliability:** % of memory saves that complete successfully
6. **User confidence:** Does user know current state (provider, sync, online/offline)?

---

## Files Summary

### Files to Modify (Phase 1 + 2)

| File | Why | Changes |
|------|-----|---------|
| `src-tauri/src/commands.rs` | Add fallback, validation, status commands | ~150 LOC |
| `src/features/onboarding/OnboardingWizard.tsx` | Add provider testing | ~30 LOC |
| `src/features/settings/SettingsPanel.tsx` | Add status display, test button | ~50 LOC |
| `src/features/settings/ContextMenu.tsx` | Show memory status | ~20 LOC |
| `src/features/chat/ChatWindow.tsx` | Display provider badge, error messages | ~40 LOC |

### Key Files NOT to Touch (Already Optimal)

- `src-tauri/src/llm/offline.rs` — Template provider works well
- `src/bridge/tauri.ts` — Fallback mode works, just needs status checks

---

## Success Criteria

✅ **Implementation Complete When:**

1. Any failed provider call automatically tries offline provider
2. Provider config is validated before being accepted
3. UI shows current provider status in settings
4. User sees specific error reason (not generic "couldn't think")
5. Memory sync status is visible
6. User can test provider with one click
7. Settings have fallback (localStorage)

✅ **User Experience Improved When:**

- User tries to chat while offline → auto-switches to template mode, continues
- User enters invalid API key → immediate feedback "Invalid key", can fix
- User checks settings → sees "✅ OpenAI Connected" or "❌ Unavailable"
- User sees memory status → knows if data is being saved
- Any error → user understands reason and knows next step

---

## Appendix: Code Evidence Index

| Question | Evidence Location |
|----------|------------------|
| Q1: What does user need? | commands.rs:367, settings.tsx:28, context-menu.tsx:114 |
| Q2: Where is confusion? | ChatInput.tsx:40, ProviderSetupStep.tsx:107, OnboardingWizard.tsx:119 |
| Q3: Ideal end-state | All descriptions show ideal UI/behavior |
| Q4: Broken fallbacks | Gaps 1-11 with specific code locations |

---

## Final Status

✅ **Analysis Complete**
- All 4 questions answered with code evidence
- 11 concrete gaps identified with file:line references
- 9 implementable improvements prioritized
- Effort estimates provided
- Success criteria defined
- No source files modified (diagnostic only)

**Todo Status:** `done`
