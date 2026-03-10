import { describe, expect, it } from "vitest";
import { composeAvatarClasses } from "./composeAvatarClasses";

const ACTION_VIEW = {
  toneClass: "tone-playful",
  stateClass: "state-react-click"
};

describe("composeAvatarClasses", () => {
  it("builds a stable avatar class list with active modifiers", () => {
    const className = composeAvatarClasses(ACTION_VIEW, {
      avatarBounce: true,
      wagging: true,
      moodFlash: true
    });

    expect(className).toBe(
      "tokki-avatar tone-playful state-react-click tokki-avatar--bounce tokki-avatar--wag tokki-avatar--mood-flash"
    );
  });

  it("prefers the fast blink modifier when both blink states are set", () => {
    const className = composeAvatarClasses(ACTION_VIEW, {
      blinking: true,
      blinkSlow: true
    });

    expect(className).toContain("tokki-avatar--blink");
    expect(className).not.toContain("tokki-avatar--blink-slow");
  });

  it.each([
    { stateClass: "state-idle-sneeze", toneClass: "tone-surprised" },
    { stateClass: "state-idle-yawn", toneClass: "tone-sleepy" },
    { stateClass: "state-idle-headturn", toneClass: "tone-curious" },
    { stateClass: "state-idle-stretch", toneClass: "tone-playful" },
    { stateClass: "state-react-wake", toneClass: "tone-surprised" },
    { stateClass: "state-react-pet", toneClass: "tone-playful" }
  ])("includes rare state class $stateClass without filtering", ({ stateClass, toneClass }) => {
    const className = composeAvatarClasses({ stateClass, toneClass });
    expect(className).toBe(`tokki-avatar ${toneClass} ${stateClass}`);
  });
});
