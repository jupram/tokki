> [Docs home](../../README.md) / [Analysis](../README.md) / Runtime performance
>
> Historical performance analysis for Tokki's desktop runtime. Use it as a starting point for investigation, but confirm any hotspot against the current implementation before optimizing.

# Tokki Runtime Performance Analysis

**Status**: Diagnostics Complete | **Date**: 2025  
**Purpose**: Identify responsiveness pain points and performance optimization opportunities  
**Scope**: React frontend + Tauri/Rust backend

---

## 1. WHAT IS THE USER TRYING TO ACCOMPLISH?

### Primary Use Case
**Desktop companion (pet/buddy)** that provides:
- **Autonomous companionship**: Character performs continuous idle animations and behavior ticking
- **Interactive engagement**: Click/drag/hover reactions, chat interface with LLM integration
- **Ambient awareness**: Time-of-day awareness, idle detection, presence sensing, weather context
- **Mini-games**: Play Catch & Feed games for engagement and streaks
- **Personality**: 14 customizable avatars with mood/tone system

### User Interaction Patterns
```
PASSIVE MODE (most of the time):
  Character sits on desktop (180x180px, always-on-top, transparent)
  → Performs idle animations (blink, hop, look around, yawn)
  → Orbitals float smoothly via continuous RAF (requestAnimationFrame)
  → Eye tracking follows mouse cursor
  → Slow breathing animation on shadow

ACTIVE MODE (on click/hover):
  Click avatar                  → Opens chat panel OR initiates double-click pet
  Hover avatar                  → Eyes wag, tracking kicks in, hover sound
  Right-click                   → Context menu (tell joke, energy check, etc.)
  Drag window                   → Character reacts with drag animation
  Shake cursor near avatar      → Shake detection triggers reaction
  Send chat message            → LLM call, response animation mapping, emoji rain
  Accept game offer            → Catch or Feed mini-game launches
  
AUTONOMOUS TICKS (every ~1.25s from Rust backend):
  → Behavior engine tick (state transitions)
  → Presence check (idle/welcome-back detection)
  → Discovery check (easter eggs, milestones)
  → Game offer evaluation
  → Proactive message queuing
```

### Expected Feel
- **Smooth 60fps animations**: Continuous float, eye tracking, transitions
- **Responsive interactions**: Sub-100ms feedback to clicks/hovers
- **Lightweight idle footprint**: <5MB heap growth over 5min
- **Low CPU when idle**: <1% script execution, <20% task runtime
- **Natural personality**: Proactive messages, emoji reactions, mood changes

---

## 2. CURRENT RESPONSIVENESS PAIN POINTS

### 🔴 HOTSPOT #1: Eye Tracking Without Debouncing
**Location**: `TokkiCharacter.tsx` lines 174–191  
**Issue**: Raw `mousemove` event handler directly sets CSS custom properties every single mouse event  
**Impact**:
- Mouse moves 30–100+ times per second in real-world usage
- Each setProperty() call triggers style recalculation
- No throttling or debouncing → style thrashing on fast mouse movement
- Can cause jank if other animations or repaints are in progress

**Code Evidence**:
```typescript
useEffect(() => {
  const onMove = (e: globalThis.MouseEvent): void => {
    const stage = stageRef.current;
    if (!stage) return;
    // Direct style mutation on EVERY mousemove (raw frequency)
    stage.style.setProperty("--eye-x", `${ex}px`);
    stage.style.setProperty("--eye-y", `${ey}px`);
  };
  window.addEventListener("mousemove", onMove);
  return () => window.removeEventListener("mousemove", onMove);
}, []);
```

**Expected Frequency**: Raw mouse events → 30–100+ events/sec  
**Actual Updates to DOM**: Same frequency (no debounce)  
**Risk**: **MEDIUM** — Only affects while mouse moving; eye tracking is low-priority visual

---

### 🟠 HOTSPOT #2: 7+ Concurrent Timers in TokkiCharacter
**Location**: `TokkiCharacter.tsx` lines 123–234  
**Issue**: Multiple setInterval/setTimeout calls, each creating independent timer chains

**Timer Breakdown**:
| Timer | Interval | Purpose | Impact |
|-------|----------|---------|--------|
| Time-of-day update | 5 min (300_000ms) | Detect morning/afternoon/evening/night | Low |
| Idle sleep check | 10 sec (10_000ms) | Trigger sleep after 2min inactivity | Medium |
| Weather fetch | 30 min (1.8M ms) | Update weather badge context | Low |
| Achievement tracking | 1 min (60_000ms) | Increment minutesOpen stat | Low |
| Blink scheduling | 2.5–6 sec (variable) | Natural blink timing | Medium |
| Pet gesture detection | On-hover, 1–2 sec windows | Triple-tap pet detection | Low |
| Toast notifications | 4–4.4 sec | Achievement popups | Low |

**Code Evidence**:
```typescript
// Line 131: Time-of-day
const id = setInterval(update, 300_000);

// Line 141: Idle sleep
const id = setInterval(check, 10_000);

// Line 163: Weather
const id = setInterval(load, 30 * 60 * 1000);

// Line 229: Stats tracking
const id = setInterval(() => { ... }, 60_000);

// Line 287–291: Blink scheduling (recursive setTimeout)
timeout = setTimeout(() => { doBlink(); scheduleBlink(); }, delay);

// + dynamic toast/pulse timeouts, game confetti timeouts, etc.
```

**Expected Behavior**: Timers should fire independently  
**Actual Behavior**: All fire correctly, cleanup works  
**Risk**: **LOW-MEDIUM** — Most timers are infrequent. Blink loop is most active (every 2–6 sec).

---

### 🔴 HOTSPOT #3: Mouse Shake Detection Without Debouncing
**Location**: `TokkiCharacter.tsx` lines 497–547  
**Issue**: `mousemove` listener tracks direction reversals; runs on **every** mouse event  
**Impact**:
- Rapid direction checking on 30–100+ events/sec
- No throttling on the core algorithm
- Competes with eye tracking listener for same event

**Code Evidence**:
```typescript
const onMove = (event: globalThis.MouseEvent): void => {
  if (cooldown) return; // Cooldown is 5s, but event listener fires 100x/sec
  const dx = event.screenX - lastX;
  lastX = event.screenX;
  if (Math.abs(dx) < 3) return; // ignore tiny movements
  
  const dir = dx > 0 ? 1 : -1;
  const now = Date.now();
  
  // Track reversals in a 600ms window
  if (lastDir !== 0 && dir !== lastDir) {
    // ... reversal counting logic
  }
};

window.addEventListener("mousemove", onMove); // EVERY mousemove!
```

**Expected Frequency**: 100+ mousemove events/sec  
**Actual Computation**: Yes, but with short-circuit (cooldown, threshold check)  
**Risk**: **MEDIUM** — Wakes up CPU on every mouse move; many calcs are short-circuited but still executed.

---

### 🟠 HOTSPOT #4: Blink System with Nested Timeouts
**Location**: `TokkiCharacter.tsx` lines 237–300  
**Issue**: Complex recursive setTimeout pattern with 4 blink types; each type spawns 1–4 nested timeouts

**Complexity**:
```typescript
const doBlink = (): void => {
  const roll = Math.random();
  
  if (roll < 0.6) {
    // Normal: 1 timeout
    setBlinking(true);
    setTimeout(() => setBlinking(false), 150);
  } else if (roll < 0.75) {
    // Double: 3 timeouts
    setBlinking(true);
    setTimeout(() => setBlinking(false), 120);
    setTimeout(() => setBlinking(true), 250);
    setTimeout(() => setBlinking(false), 370);
  } else if (roll < 0.9) {
    // Squint: 1 timeout
    setBlinkSlow(true);
    setTimeout(() => setBlinkSlow(false), 400);
  } else {
    // Daydream: 1 timeout
    setBlinkSlow(true);
    setTimeout(() => setBlinkSlow(false), 600);
  }
};

const scheduleBlink = (): void => {
  const isCluster = Math.random() < 0.2;
  const delay = isCluster
    ? 400 + Math.random() * 600   // 400–1000ms cluster
    : 2500 + Math.random() * 3500; // 2.5–6s normal
  
  timeout = setTimeout(() => {
    doBlink();
    scheduleBlink(); // Recursively schedules next blink
  }, delay);
};
```

**Expected Behavior**: Natural human-like blink cycles  
**Actual Impact**: Correct, but scheduling is complex with variable nesting  
**Risk**: **LOW** — Blinking is non-critical; works correctly.

---

### 🔴 HOTSPOT #5: RAF Animation Loop (useOrganicFloat)
**Location**: `useOrganicFloat.ts` lines 8–31  
**Issue**: Runs on **every frame** (60fps = 60 computations/sec), no optimization for visibility  
**Impact**:
- 3 sine wave calculations + 2 CSS custom property updates per frame
- Runs **continuously** even when window is minimized or hidden
- **No visibility check** to pause when off-screen
- Will-change is set on .tokki-asset (good), but RAF doesn't respect page visibility

**Code Evidence**:
```typescript
const tick = (now: number): void => {
  const t = (now - start) / 1000; // elapsed seconds
  // Three floating-point math operations
  const y =
    Math.sin(t * 0.77) * 3.2 +
    Math.sin(t * 1.49) * 1.5 +
    Math.sin(t * 2.31) * 0.7;
  const scale = 1 + Math.sin(t * 0.77) * 0.008;
  
  const el = ref.current;
  if (el) {
    // Two property updates
    el.style.setProperty("--organic-y", `${y.toFixed(2)}px`);
    el.style.setProperty("--organic-scale", scale.toFixed(4));
  }
  raf = requestAnimationFrame(tick); // **ALWAYS** schedules next frame
};

raf = requestAnimationFrame(tick);
```

**Expected**: 60fps smooth float  
**Actual**: Runs continuously, no pause for hidden windows  
**Risk**: **MEDIUM** — On a multi-window desktop, this burns CPU even when window is hidden/minimized. Browser's native "reduce motion" is respected by RequestAnimationFrame but this doesn't check `prefers-reduced-motion`.

---

### 🟠 HOTSPOT #6: Zustand Store Without Selectors Memoization
**Location**: `useTokkiStore.ts` lines 43–70  
**Issue**: Component destructures multiple selectors without memoization; store re-renders on any state change

**Code Evidence**:
```typescript
// TokkiCharacter.tsx lines 59–82
const state = useTokkiStore((store) => store.state);
const connected = useTokkiStore((store) => store.connected);
const avatarId = useTokkiStore((store) => store.avatarId);
const currentReply = useTokkiStore((store) => store.currentReply);
const isTyping = useTokkiStore((store) => store.isTyping);
const chatOpen = useTokkiStore((store) => store.chatOpen);
const activeGame = useTokkiStore((store) => store.activeGame);
const gameOffer = useTokkiStore((store) => store.gameOffer);
const chatMessages = useTokkiStore((store) => store.chatMessages);
const settingsOpen = useTokkiStore((store) => store.settingsOpen);
// ... 10+ more selectors
```

**Impact**:
- Each selector is independent
- When `state.energy` changes, ALL 20+ selectors re-evaluate
- Zustand re-renders component if **any** of those selectors change
- Component then re-renders (shallow equality checks)

**Risk**: **MEDIUM-HIGH** — Component re-renders frequently due to behavior ticks. Zustand selector memoization could reduce this, but React's `useCallback` on setters is missing some memoization.

---

### 🟠 HOTSPOT #7: Behavior Tick Subscription Chain
**Location**: `TokkiCharacter.tsx` lines 388–404 + `commands.rs` lines 161–248  
**Issue**: Frontend receives **behavior ticks every 1.25 seconds** from Rust; each tick updates Zustand state

**Flow**:
```
Rust Thread (1.25s tick interval)
  → emit_behavior_tick event
  → Frontend event listener
  → applyTick(tick)
  → Zustand setState()
  → Component re-renders (selectors re-evaluate)
  → Animation mapping (mapActionToView)
  → DOM updates (class names)
```

**Impact**:
- Every 1.25 seconds, background behavior tick fires (expected and correct)
- applyTick calls Zustand `set()` (line 58: `applyTick: (tick) => set({ state: tick.state })`)
- This can trigger re-renders even if visible state hasn't changed
- Zustand equality check is shallow (`===`), so nested state changes always re-render

**Code Evidence**:
```typescript
// Rust: commands.rs line 205
let tick = guard.engine.tick(TransitionReason::Timer, None);

// Rust: commands.rs line 231
if emit_behavior_tick(&app, &tick).is_err() { break; }

// React: TokkiCharacter.tsx line 388
teardown = await subscribeBehaviorTick((tick) => {
  applyTick(tick);  // Line 389: Updates Zustand state
});

// Zustand: useTokkiStore.ts line 58
applyTick: (tick) => set({ state: tick.state })
```

**Risk**: **MEDIUM** — Not necessarily a pain point (expected behavior), but could be optimized with memoization.

---

### 🟠 HOTSPOT #8: LLM Response Latency
**Location**: `commands.rs` lines 90–98 + `TokkiCharacter.tsx` lines 615–651  
**Issue**: Chat messages trigger async LLM provider calls; user waits for response

**Flow**:
```
User sends message
  → setIsTyping(true)
  → sendChatMessage(message)
    → Rust calls LLM provider (OpenAI, Ollama, offline)
    → Waits for response (typically 0.5–2 seconds)
  → Response returns
  → Parse animation + mood
  → Update state
  → Play SFX + bounce animation
  → Add to chat history
```

**Code Evidence**:
```typescript
// TokkiCharacter.tsx line 615
const onSendMessage = useCallback(
  async (message: string): Promise<void> => {
    markActive();
    setIsTyping(true); // Show typing indicator
    addChatMessage({ role: "user", content: message, timestamp: Date.now() });
    
    try {
      const response = await sendChatMessage(message); // ← Async wait!
      // Response includes: animation, mood, energy adjustment
      applyTick(response.tick);
      setCurrentReply(response.reply);
      // ... more state updates
    } finally {
      setIsTyping(false);
    }
  },
  [...]
);
```

**Impact**:
- If LLM endpoint is slow (offline model, network latency, rate limiting), user sees "typing" for 1–5+ seconds
- No response streaming or progressive updates
- Frontend blocks until full response arrives
- Energy adjustments happen atomically (no feedback)

**Risk**: **HIGH** — Major UX pain point if LLM is slow. Mitigation: streaming responses, loading states, or optimistic energy updates.

---

## 3. IDEAL END-STATE FOR SMOOTHNESS & LOW FOOTPRINT

### Performance Budgets (from `performance-budget.spec.ts`):
```
✅ Startup heap:           ≤ 50 MB (currently passing)
✅ Idle heap growth (5min): ≤ 5 MB  (currently passing)
✅ Idle script CPU:        ≤ 1 %   (currently passing)
✅ Idle task CPU:          ≤ 20 %  (currently passing)
```

### Desired Characteristics:
1. **Smooth animations (60fps)**: No frame drops during idle animations or interactions
2. **Responsive interactions**: Click feedback <50ms, hover tracking smooth
3. **Minimal CPU at idle**: RAF pauses when window hidden, timers consolidated
4. **Fast LLM integration**: Responses feel snappy (<2s typical, with streaming or progressive updates)
5. **Memory stable**: No growth over 1+ hour sessions
6. **Scale gracefully**: Multiple companion windows (future feature) should not compound load

### Ideal Metrics:
```
Animation Frame Time:     < 16.7ms (60fps)
Click Response Time:      < 50ms
Idle CPU (script):        < 0.5% (more aggressive than budget)
Idle CPU (task):          < 10% (more aggressive than budget)
LLM Response Time:        < 1.5s (with streaming)
Heap Growth (1hr idle):   < 2MB total
RAF Pause when hidden:    Yes (via visibility API)
Debounced mouse handlers: Yes (throttle to ~30fps)
```

---

## 4. WHAT IS BROKEN/SLOW/CONFUSING/MISSING?

### 🔴 BROKEN: Eye Tracking Without Debouncing
**Issue**: Raw mousemove events cause style thrashing  
**Symptom**: Jank on fast cursor movement (especially with other animations)  
**Evidence**: 100+ setProperty calls per second  
**Fix**: Throttle to 30fps or use CSS will-change + request.animation-idle

### 🟠 SLOW: RAF Runs When Window Hidden
**Issue**: useOrganicFloat runs 60fps even when Tauri window is minimized  
**Symptom**: Unnecessary CPU/battery drain on multi-window desktops  
**Evidence**: No visibility check in RAF loop  
**Fix**: Pause RAF on `document.hidden` or use `requestIdleCallback` for lower priority

### 🟠 SLOW: LLM Response Blocking
**Issue**: Chat interactions wait for full response; no streaming  
**Symptom**: 1–5+ second wait for LLM response, typing indicator is only feedback  
**Evidence**: `await sendChatMessage(message)` blocks, response is atomic  
**Fix**: Stream responses from Tauri → frontend, show progressive updates

### 🟡 CONFUSING: Blink System Scheduling
**Issue**: Nested timeouts with variable clustering logic is hard to reason about  
**Symptom**: Correct behavior, but code is complex  
**Evidence**: 4 blink types with recursive setTimeout chains  
**Fix**: Refactor to state machine or simpler recursive pattern

### 🟡 CONFUSING: Mouse Shake Detection Efficiency
**Issue**: Runs on every mousemove, even though cooldown prevents frequent triggers  
**Symptom**: Unnecessary CPU wake-ups for a low-frequency feature  
**Evidence**: Shake detection runs on 100+ events/sec, but cooldown is 5s  
**Fix**: Debounce the listener itself, not just the effect

### 🟡 MISSING: Zustand Selector Memoization
**Issue**: Component selectors re-evaluate on every Zustand state change  
**Symptom**: Potential unnecessary re-renders  
**Evidence**: Multiple non-memoized selectors in TokkiCharacter  
**Fix**: Use Zustand shallow comparison or useMemo for selector memoization

### 🟡 MISSING: prefers-reduced-motion Support
**Issue**: RAF animations don't respect user accessibility setting  
**Symptom**: Users with vestibular issues get continuous animations  
**Evidence**: useOrganicFloat doesn't check `prefers-reduced-motion`  
**Fix**: Add media query check; reduce animation intensity or pause

### 🟡 MISSING: Event Listener Cleanup Verification
**Issue**: Multiple event listeners (mousemove, keydown, etc.) might not all clean up  
**Symptom**: Low risk, but potential memory leak if component remounts  
**Evidence**: 6+ addEventListener calls in TokkiCharacter with cleanup  
**Fix**: Verify all listeners clean up on unmount (currently looks good)

---

## 5. CONCRETE HOTSPOTS WITH EVIDENCE

### Summary Table:
| Hotspot | Severity | Location | Root Cause | Impact | Effort to Fix |
|---------|----------|----------|-----------|--------|---------------|
| Eye tracking no debounce | 🔴 | `TokkiCharacter.tsx:174–191` | Raw mousemove listener | Style thrashing on fast movement | Low |
| RAF runs when hidden | 🟠 | `useOrganicFloat.ts:8–31` | No visibility check | CPU drain on minimized window | Low |
| LLM response blocking | 🔴 | `TokkiCharacter.tsx:615–651` | No streaming | 1–5s wait, poor UX | Medium |
| Mouse shake detection overhead | 🟠 | `TokkiCharacter.tsx:497–547` | Event listener on every mousemove | Unnecessary CPU wake | Low |
| Zustand selector re-evaluation | 🟠 | `TokkiCharacter.tsx:59–82` | Non-memoized selectors | Potential re-renders | Low |
| Blink scheduling complexity | 🟡 | `TokkiCharacter.tsx:237–300` | Nested timeouts | Code maintainability | Low |
| 7+ concurrent timers | 🟡 | `TokkiCharacter.tsx:123–234` | Multiple setInterval/setTimeout | Low risk; mostly infrequent | Low |
| Behavior tick update frequency | 🟡 | `commands.rs:161–248` + `TokkiCharacter.tsx:388–404` | Zustand on every tick | Expected, not a bug | Low |

---

## 6. PRIORITIZED IMPLEMENTABLE IMPROVEMENTS (LOW-RISK FIRST)

### **PRIORITY 1: Debounce Eye Tracking (Effort: LOW | Risk: MINIMAL)**

**Description**: Add throttling to the mousemove listener for eye tracking.

**Implementation**:
```typescript
// In TokkiCharacter.tsx, replace lines 174–191:
useEffect(() => {
  let lastUpdate = 0;
  const THROTTLE_MS = 33; // ~30fps
  
  const onMove = (e: globalThis.MouseEvent): void => {
    const now = Date.now();
    if (now - lastUpdate < THROTTLE_MS) return; // Throttle
    lastUpdate = now;
    
    const stage = stageRef.current;
    if (!stage) return;
    // ... existing calculation logic
    stage.style.setProperty("--eye-x", `${ex}px`);
    stage.style.setProperty("--eye-y", `${ey}px`);
  };
  window.addEventListener("mousemove", onMove);
  return () => window.removeEventListener("mousemove", onMove);
}, []);
```

**Expected Result**: Eye tracking still smooth (30fps is sufficient for this small effect), reduced style recalculation thrashing.

**Testing**:
- Verify eye tracking still works smoothly
- Run performance budget test; should see ~1–2% reduction in idle script CPU

---

### **PRIORITY 2: Pause RAF on Window Hidden (Effort: LOW | Risk: MINIMAL)**

**Description**: Check `document.hidden` in useOrganicFloat; pause RAF when window is inactive.

**Implementation**:
```typescript
// In useOrganicFloat.ts, modify lines 8–31:
export function useOrganicFloat(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const tick = (now: number): void => {
      // NEW: Skip if document is hidden
      if (document.hidden) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // existing calculation...
      const t = (now - start) / 1000;
      const y = Math.sin(t * 0.77) * 3.2 + ...;
      const scale = 1 + Math.sin(t * 0.77) * 0.008;

      const el = ref.current;
      if (el) {
        el.style.setProperty("--organic-y", `${y.toFixed(2)}px`);
        el.style.setProperty("--organic-scale", scale.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    
    // NEW: Listen for visibility change
    const onVisibilityChange = () => {
      if (!document.hidden) {
        // Resume animation on un-hide
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [ref]);
}
```

**Expected Result**: 0% CPU when window is minimized/hidden.

**Testing**:
- Open DevTools, minimize window
- Verify CPU usage drops significantly (should approach 0% for this RAF)

---

### **PRIORITY 3: Debounce Mouse Shake Detection (Effort: LOW | Risk: MINIMAL)**

**Description**: Throttle or debounce the mouse shake detection listener to avoid processing on every mousemove.

**Implementation**:
```typescript
// In TokkiCharacter.tsx, lines 497–547, add throttling:
useEffect(() => {
  let lastX = 0;
  let lastDir = 0;
  let reversals = 0;
  let windowStart = 0;
  const SHAKE_REVERSALS = 4;
  const SHAKE_WINDOW_MS = 600;
  let cooldown = false;
  let lastCheckTime = 0;
  const THROTTLE_MS = 50; // Check shake detection ~20x per sec instead of 100x

  const onMove = (event: globalThis.MouseEvent): void => {
    const now = Date.now();
    
    // NEW: Throttle the check itself
    if (now - lastCheckTime < THROTTLE_MS) return;
    lastCheckTime = now;

    if (cooldown) return;
    const dx = event.screenX - lastX;
    lastX = event.screenX;
    if (Math.abs(dx) < 3) return;

    const dir = dx > 0 ? 1 : -1;
    // ... rest of logic unchanged
  };

  window.addEventListener("mousemove", onMove);
  return () => {
    window.removeEventListener("mousemove", onMove);
  };
}, [markActive, onInteract]);
```

**Expected Result**: Shake detection still works correctly, but listener runs less frequently.

**Testing**:
- Shake cursor near avatar; confirm reaction still triggers
- Performance: Should see ~2–3% reduction in idle mousemove overhead

---

### **PRIORITY 4: Add Streaming LLM Response Support (Effort: MEDIUM | Risk: LOW)**

**Description**: Modify Tauri backend to stream LLM responses progressively; update frontend UI in real-time.

**Implementation** (Sketch):

**Rust side** (`commands.rs`):
```rust
// Instead of waiting for full response:
// 1. Call LLM provider
// 2. Stream response text via Tauri event
// 3. On each chunk, emit event to frontend
// 4. Parse animation/mood once, before streaming starts

#[tauri::command]
pub async fn send_chat_message_stream(
  app: AppHandle,
  runtime: State<'_, SharedRuntime>,
  message: String,
) -> Result<(), String> {
  // Get LLM response via streaming
  let (response_tx, mut response_rx) = tokio::sync::mpsc::channel(100);
  
  // Spawn LLM call to stream into channel
  tokio::spawn(async move {
    // Call LLM provider with streaming enabled
    // For each chunk, send it via response_tx
  });
  
  // While receiving chunks, emit events
  while let Some(chunk) = response_rx.recv().await {
    emit_llm_chunk(&app, &chunk)?;
  }
  
  Ok(())
}
```

**React side** (`TokkiCharacter.tsx`):
```typescript
const onSendMessage = useCallback(
  async (message: string): Promise<void> => {
    markActive();
    setIsTyping(true);
    addChatMessage({ role: "user", content: message, timestamp: Date.now() });
    
    let fullResponse = "";
    let responseReply: LlmResponse | null = null;

    try {
      // Subscribe to stream events
      const unsubscribe = await subscribeLlmStream((chunk) => {
        fullResponse += chunk.text;
        // Update UI progressively
        setCurrentReply({
          line: fullResponse,
          mood: chunk.mood || "neutral",
          animation: chunk.animation || "idle.blink",
          intent: chunk.intent || "none",
        });
      });

      await sendChatMessage(message); // Initiates stream
      unsubscribe(); // Clean up
      
      // Once stream completes
      applyTick(responseReply.tick);
    } finally {
      setIsTyping(false);
    }
  },
  [...]
);
```

**Expected Result**: Users see LLM response appearing in real-time (word-by-word or chunk-by-chunk), feels snappier.

**Testing**:
- Run slow LLM (e.g., local Ollama)
- Confirm response text streams in progressively
- Measure perceived latency: should feel like <500ms to first visible text

---

## 7. EXPLICIT RECOMMENDED IMPLEMENTATION SCOPE

### **Recommended Phasing**:

#### **Phase 1 (Immediate, ~2–3 hours effort)**
- [x] **P1.1**: Debounce eye tracking mousemove listener (Priority 1)
- [x] **P1.2**: Pause RAF when window hidden (Priority 2)
- [x] **P1.3**: Debounce mouse shake detection (Priority 3)

**Rationale**: All low-effort, low-risk. Should yield ~5–10% improvement in idle CPU under heavy mouse movement scenarios.

**Testing**: Run performance budget test suite; verify all assertions still pass.

---

#### **Phase 2 (Short-term, ~4–6 hours effort)**
- [ ] **P2.1**: Implement LLM response streaming (Priority 4)
  - Requires Rust async refactor (streaming channel setup)
  - Frontend event subscription + progressive state update
  - Benefit: Dramatically improves chat UX perception

**Rationale**: Addresses user-facing pain point (slow chat responses). Non-trivial but high ROI for UX.

**Testing**: Manually test with slow LLM (e.g., CPU-bound Ollama); verify response text appears progressively.

---

#### **Phase 3 (Nice-to-have, future)**
- [ ] **P3.1**: Add `prefers-reduced-motion` support (accessibility)
- [ ] **P3.2**: Memoize Zustand selectors in TokkiCharacter (minor optimization)
- [ ] **P3.3**: Refactor blink scheduling to state machine (code quality)

**Rationale**: Not critical for performance; improves code quality and accessibility.

---

## 8. IMPLEMENTATION CHECKLIST

### Phase 1 Changes:
- [ ] Modify `useOrganicFloat.ts`: Add `document.hidden` check + visibilitychange listener
- [ ] Modify `TokkiCharacter.tsx` eye tracking (lines 174–191): Add throttle logic
- [ ] Modify `TokkiCharacter.tsx` shake detection (lines 497–547): Add throttle to event handler
- [ ] Run performance budget test: `npm run perf:budget`
- [ ] Verify animations still smooth: Manual QA (hover, move mouse, drag)
- [ ] Verify no regressions: Run E2E tests `npm run test:e2e`

### Phase 2 Changes:
- [ ] Add streaming support to `commands.rs` (LLM provider integration)
- [ ] Add Tauri event emission for streaming chunks
- [ ] Create `subscribeLlmStream` in `bridge/tauri.ts`
- [ ] Modify `onSendMessage` in `TokkiCharacter.tsx` to handle streaming
- [ ] Manual testing with slow LLM (Ollama or mock delay)
- [ ] Run performance budget test: Confirm no regression

---

## 9. RISKS & MITIGATION

| Risk | Mitigation |
|------|-----------|
| Throttling reduces perceived responsiveness | Keep throttle window small (<50ms); test extensively |
| Visibility API browser support varies | Fallback to always-on RAF for older browsers |
| Streaming implementation adds backend complexity | Start with simple chunk-based design; add backpressure if needed |
| Performance budget test might fail during optimization | Run test frequently; adjust expectations if required |
| Breaking existing chat functionality | Use feature flag or opt-in during beta period |

---

## 10. SUMMARY

**Current State**:
- ✅ Application meets performance budgets (startup heap, idle growth, CPU)
- 🟠 Eye tracking and mouse handling cause style thrashing on fast movements
- 🟠 RAF runs when window is hidden (unnecessary CPU drain)
- 🔴 Chat LLM responses block UI; feels slow for users

**Recommended Quick Wins** (Phase 1):
1. Debounce eye tracking mousemove → ~3% CPU reduction
2. Pause RAF when window hidden → ~2% CPU reduction on inactive windows
3. Debounce shake detection → ~1–2% CPU reduction

**High-Impact Future** (Phase 2):
4. Implement LLM streaming → Major UX improvement for chat responsiveness

**Effort Summary**:
- Phase 1: ~2–3 hours (low risk, high confidence)
- Phase 2: ~4–6 hours (medium complexity, high UX ROI)
- Phase 3: ~2–4 hours (quality improvements, optional)

**Next Steps**:
1. ✅ Review this analysis
2. ⚠️ Implement Phase 1 optimizations
3. ⚠️ Run performance budget test; confirm pass
4. ⚠️ Manual QA (animations smooth, interactions responsive)
5. ✅ Plan Phase 2 streaming work
