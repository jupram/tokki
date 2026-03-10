import type { BehaviorAction } from "../types/tokki";

export const SLEEP_ACTION_ID = "rest_nap";
export const SLEEP_RESISTANCE_CHANCE = 0.1;
export const SLEEP_RESISTANCE_WINDOW_MS = 2_500;
export const SLEEP_RESISTANCE_MAX_ATTEMPTS = 4;

const IDLE_SLEEP_VISUAL_ACTION: BehaviorAction = Object.freeze({
  id: SLEEP_ACTION_ID,
  animation: "rest.nap",
  mood: "sleepy",
  duration_ms: 1_600,
  interruptible: true
});

// Progression-based resistance lines: deeper sleep → more awake
const DEEP_SLEEP_LINES = [
  "Mmm... five more minutes... 💤",
  "Zzz... *yawns* ...not yet...",
  "*mumbles* ...still dreaming...",
  "So cozy... can't move... 🌙"
] as const;

const LIGHT_SLEEP_LINES = [
  "*sleepy grumble* ...later...",
  "Just a little longer... ✨",
  "Dreams are too nice right now...",
  "Shh... I'm still snoozing..."
] as const;

const STIRRING_LINES = [
  "*stretches* ...almost awake...",
  "Mmmph... getting there...",
  "One more minute, promise...",
  "*blinks slowly* ...soon..."
] as const;

const YIELDING_LINES = [
  "Okay, okay... I'm up... 😴",
  "*yawns* Fine, you win...",
  "Alright... I'm awake now...",
  "*rubs eyes* ...morning already?"
] as const;

// Legacy export for backward compatibility with existing tests
const SLEEPY_RESISTANCE_LINES = [
  "Mmm... five more minutes... 💤",
  "Zzz... *yawns* ...not yet...",
  "*mumbles* ...still dreaming..."
] as const;

// Track recent lines to avoid immediate repeats
let recentLineIndices: number[] = [];
const MAX_RECENT_LINES = 3;

export type SleepWakeSource = "hover" | "click" | "shake";

export interface SleepWakeDecisionInput {
  sleeping: boolean;
  source: SleepWakeSource;
  lastResistanceAt?: number | null;
  now?: number;
  roll?: number;
  resistanceChance?: number;
  followUpWindowMs?: number;
}

export interface SleepWakeDecision {
  shouldWake: boolean;
  shouldResist: boolean;
  rememberResistanceAt: number | null;
  reason:
    | "already_awake"
    | "hover_ignored"
    | "click_resist"
    | "click_wake"
    | "follow_up_wake"
    | "shake_wake";
}

export function isTokkiSleeping(idleSleep: boolean, currentActionId: string): boolean {
  return idleSleep || currentActionId === SLEEP_ACTION_ID;
}

export function getSleepVisualAction(
  currentAction: BehaviorAction,
  idleSleep: boolean
): BehaviorAction {
  if (!idleSleep || currentAction.id === SLEEP_ACTION_ID) {
    return currentAction;
  }

  return IDLE_SLEEP_VISUAL_ACTION;
}

export function decideSleepWake({
  sleeping,
  source,
  lastResistanceAt = null,
  now = Date.now(),
  roll = Math.random(),
  resistanceChance = SLEEP_RESISTANCE_CHANCE,
  followUpWindowMs = SLEEP_RESISTANCE_WINDOW_MS
}: SleepWakeDecisionInput): SleepWakeDecision {
  if (!sleeping) {
    return {
      shouldWake: false,
      shouldResist: false,
      rememberResistanceAt: null,
      reason: "already_awake"
    };
  }

  if (source === "hover") {
    return {
      shouldWake: false,
      shouldResist: false,
      rememberResistanceAt: lastResistanceAt,
      reason: "hover_ignored"
    };
  }

  if (source === "shake") {
    return {
      shouldWake: true,
      shouldResist: false,
      rememberResistanceAt: null,
      reason: "shake_wake"
    };
  }

  const withinWakeWindow =
    typeof lastResistanceAt === "number" && now - lastResistanceAt <= followUpWindowMs;

  if (withinWakeWindow) {
    return {
      shouldWake: true,
      shouldResist: false,
      rememberResistanceAt: null,
      reason: "follow_up_wake"
    };
  }

  if (roll < resistanceChance) {
    return {
      shouldWake: false,
      shouldResist: true,
      rememberResistanceAt: now,
      reason: "click_resist"
    };
  }

  return {
    shouldWake: true,
    shouldResist: false,
    rememberResistanceAt: null,
    reason: "click_wake"
  };
}

export type SleepResistanceStage = "deep" | "light" | "stirring" | "yielding";

export interface SleepResistanceResult {
  line: string;
  stage: SleepResistanceStage;
  animationHint: "rest.nap" | "idle.yawn" | "idle.blink";
}

/**
 * Legacy function for backward compatibility.
 * Use pickProgressiveSleepResistance for the full progression system.
 */
export function pickSleepResistanceLine(roll = Math.random()): string {
  const normalized = Math.max(0, Math.min(0.999_999, roll));
  const index = Math.floor(normalized * SLEEPY_RESISTANCE_LINES.length);
  return SLEEPY_RESISTANCE_LINES[index];
}

function pickFromPoolAvoidingRecent<T extends readonly string[]>(
  pool: T,
  roll: number,
  poolOffset: number
): { line: string; globalIndex: number } {
  const availableIndices: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    const globalIdx = poolOffset + i;
    if (!recentLineIndices.includes(globalIdx)) {
      availableIndices.push(i);
    }
  }

  // If all lines were recently used, allow any
  const indices = availableIndices.length > 0 ? availableIndices : [...Array(pool.length).keys()];
  const normalized = Math.max(0, Math.min(0.999_999, roll));
  const pickIdx = Math.floor(normalized * indices.length);
  const localIndex = indices[pickIdx];
  const globalIndex = poolOffset + localIndex;

  // Track this line as recently used
  recentLineIndices.push(globalIndex);
  if (recentLineIndices.length > MAX_RECENT_LINES) {
    recentLineIndices.shift();
  }

  return { line: pool[localIndex], globalIndex };
}

/**
 * Pick a sleep resistance line with progression based on attempt count.
 * - Attempts 1: deep sleep lines (very sleepy)
 * - Attempt 2: light sleep lines (still drowsy)
 * - Attempt 3: stirring lines (almost awake)
 * - Attempt 4+: yielding lines (gives in)
 */
export function pickProgressiveSleepResistance(
  attemptCount: number,
  roll = Math.random()
): SleepResistanceResult {
  const deepOffset = 0;
  const lightOffset = DEEP_SLEEP_LINES.length;
  const stirringOffset = lightOffset + LIGHT_SLEEP_LINES.length;
  const yieldingOffset = stirringOffset + STIRRING_LINES.length;

  if (attemptCount >= SLEEP_RESISTANCE_MAX_ATTEMPTS) {
    const { line } = pickFromPoolAvoidingRecent(YIELDING_LINES, roll, yieldingOffset);
    return {
      line,
      stage: "yielding",
      animationHint: "idle.yawn"
    };
  }

  if (attemptCount === 3) {
    const { line } = pickFromPoolAvoidingRecent(STIRRING_LINES, roll, stirringOffset);
    return {
      line,
      stage: "stirring",
      animationHint: "idle.yawn"
    };
  }

  if (attemptCount === 2) {
    const { line } = pickFromPoolAvoidingRecent(LIGHT_SLEEP_LINES, roll, lightOffset);
    return {
      line,
      stage: "light",
      animationHint: "rest.nap"
    };
  }

  // First attempt: deep sleep
  const { line } = pickFromPoolAvoidingRecent(DEEP_SLEEP_LINES, roll, deepOffset);
  return {
    line,
    stage: "deep",
    animationHint: "rest.nap"
  };
}

/**
 * Reset the recent lines tracker. Call when Tokki wakes up or after a long time.
 */
export function resetSleepResistanceMemory(): void {
  recentLineIndices = [];
}
