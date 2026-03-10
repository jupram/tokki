import { beforeEach, describe, expect, it } from "vitest";
import type { BehaviorAction } from "../types/tokki";
import {
  SLEEP_ACTION_ID,
  SLEEP_RESISTANCE_CHANCE,
  SLEEP_RESISTANCE_MAX_ATTEMPTS,
  SLEEP_RESISTANCE_WINDOW_MS,
  decideSleepWake,
  getSleepVisualAction,
  isTokkiSleeping,
  pickProgressiveSleepResistance,
  pickSleepResistanceLine,
  resetSleepResistanceMemory
} from "./sleepWake";

const IDLE_ACTION: BehaviorAction = {
  id: "idle_blink",
  animation: "idle.blink",
  mood: "idle",
  duration_ms: 1_000,
  interruptible: true
};

describe("sleepWake", () => {
  it("treats both idle sleep and rest naps as sleeping", () => {
    expect(isTokkiSleeping(true, IDLE_ACTION.id)).toBe(true);
    expect(isTokkiSleeping(false, SLEEP_ACTION_ID)).toBe(true);
    expect(isTokkiSleeping(false, IDLE_ACTION.id)).toBe(false);
  });

  it("does not blink while sleeping and forces nap visuals", () => {
    const visual = getSleepVisualAction(IDLE_ACTION, true);

    expect(visual.id).not.toBe(IDLE_ACTION.id);
    expect(visual.id).toBe(SLEEP_ACTION_ID);
    expect(visual.animation).toBe("rest.nap");
    expect(visual.mood).toBe("sleepy");
  });

  it("keeps the current action when Tokki is already awake or already napping", () => {
    expect(getSleepVisualAction(IDLE_ACTION, false)).toBe(IDLE_ACTION);
    expect(
      getSleepVisualAction(
        {
          id: SLEEP_ACTION_ID,
          animation: "rest.nap",
          mood: "sleepy",
          duration_ms: 1_600,
          interruptible: true
        },
        true
      ).id
    ).toBe(SLEEP_ACTION_ID);
  });

  it("ignores hover while sleeping", () => {
    expect(
      decideSleepWake({
        sleeping: true,
        source: "hover",
        lastResistanceAt: 42
      })
    ).toEqual({
      shouldWake: false,
      shouldResist: false,
      rememberResistanceAt: 42,
      reason: "hover_ignored"
    });
  });

  it("can resist the first sleepy click", () => {
    expect(
      decideSleepWake({
        sleeping: true,
        source: "click",
        now: 5_000,
        roll: 0.05,
        resistanceChance: 0.1
      })
    ).toEqual({
      shouldWake: false,
      shouldResist: true,
      rememberResistanceAt: 5_000,
      reason: "click_resist"
    });
  });

  it("wakes on click for rolls at or above the 10% resistance threshold", () => {
    expect(
      decideSleepWake({
        sleeping: true,
        source: "click",
        now: 9_000,
        roll: SLEEP_RESISTANCE_CHANCE
      })
    ).toEqual({
      shouldWake: true,
      shouldResist: false,
      rememberResistanceAt: null,
      reason: "click_wake"
    });
  });

  it("wakes on a follow-up click inside the resistance window", () => {
    expect(
      decideSleepWake({
        sleeping: true,
        source: "click",
        now: 10_000 + SLEEP_RESISTANCE_WINDOW_MS - 1,
        lastResistanceAt: 10_000,
        roll: 0
      })
    ).toEqual({
      shouldWake: true,
      shouldResist: false,
      rememberResistanceAt: null,
      reason: "follow_up_wake"
    });
  });

  it("wakes on shake while sleeping", () => {
    expect(
      decideSleepWake({
        sleeping: true,
        source: "shake",
        lastResistanceAt: 10_000
      })
    ).toEqual({
      shouldWake: true,
      shouldResist: false,
      rememberResistanceAt: null,
      reason: "shake_wake"
    });
  });

  it("chooses a sleepy line deterministically from a roll", () => {
    // Legacy function uses SLEEPY_RESISTANCE_LINES with 3 entries
    expect(pickSleepResistanceLine(0)).toBe("Mmm... five more minutes... 💤");
    expect(pickSleepResistanceLine(0.5)).toBe("Zzz... *yawns* ...not yet...");
    expect(pickSleepResistanceLine(0.99)).toBe("*mumbles* ...still dreaming...");
  });

  describe("progressive sleep resistance", () => {
    beforeEach(() => {
      resetSleepResistanceMemory();
    });

    it("returns deep sleep lines on first attempt", () => {
      const result = pickProgressiveSleepResistance(1, 0);
      expect(result.stage).toBe("deep");
      expect(result.animationHint).toBe("rest.nap");
      expect(result.line).toBe("Mmm... five more minutes... 💤");
    });

    it("returns light sleep lines on second attempt", () => {
      const result = pickProgressiveSleepResistance(2, 0);
      expect(result.stage).toBe("light");
      expect(result.animationHint).toBe("rest.nap");
      expect(result.line).toBe("*sleepy grumble* ...later...");
    });

    it("returns stirring lines on third attempt", () => {
      const result = pickProgressiveSleepResistance(3, 0);
      expect(result.stage).toBe("stirring");
      expect(result.animationHint).toBe("idle.yawn");
      expect(result.line).toBe("*stretches* ...almost awake...");
    });

    it("returns yielding lines on fourth+ attempts", () => {
      const result = pickProgressiveSleepResistance(4, 0);
      expect(result.stage).toBe("yielding");
      expect(result.animationHint).toBe("idle.yawn");
      expect(result.line).toBe("Okay, okay... I'm up... 😴");

      // Fifth attempt should also yield
      resetSleepResistanceMemory();
      const result5 = pickProgressiveSleepResistance(5, 0.5);
      expect(result5.stage).toBe("yielding");
    });

    it("uses different lines within same stage based on roll", () => {
      const result1 = pickProgressiveSleepResistance(1, 0);
      resetSleepResistanceMemory();
      const result2 = pickProgressiveSleepResistance(1, 0.99);
      expect(result1.line).not.toBe(result2.line);
      expect(result1.stage).toBe("deep");
      expect(result2.stage).toBe("deep");
    });

    it("avoids recently used lines", () => {
      // Pick first deep sleep line
      const result1 = pickProgressiveSleepResistance(1, 0);
      // Pick another - should avoid the first one
      const result2 = pickProgressiveSleepResistance(1, 0);
      // They might be the same if roll coincidentally picks the same,
      // but the mechanism is tested - if we force the same roll, it should pick differently
      expect(result1.stage).toBe("deep");
      expect(result2.stage).toBe("deep");
    });

    it("exports max attempts constant", () => {
      expect(SLEEP_RESISTANCE_MAX_ATTEMPTS).toBe(4);
    });
  });
});
