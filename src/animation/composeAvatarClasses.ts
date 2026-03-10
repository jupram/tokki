import type { ActionViewModel } from "./mapActionToView";

export interface AvatarClassFlags {
  avatarBounce?: boolean;
  blinking?: boolean;
  blinkSlow?: boolean;
  wagging?: boolean;
  dragLand?: boolean;
  moodFlash?: boolean;
  // Easter egg states
  blushing?: boolean;
  dancing?: boolean;
  bellyRubbing?: boolean;
  winking?: boolean;
}

export function composeAvatarClasses(
  actionView: Pick<ActionViewModel, "toneClass" | "stateClass">,
  {
    avatarBounce = false,
    blinking = false,
    blinkSlow = false,
    wagging = false,
    dragLand = false,
    moodFlash = false,
    blushing = false,
    dancing = false,
    bellyRubbing = false,
    winking = false
  }: AvatarClassFlags = {}
): string {
  return [
    "tokki-avatar",
    actionView.toneClass,
    actionView.stateClass,
    avatarBounce && "tokki-avatar--bounce",
    blinking
      ? "tokki-avatar--blink"
      : blinkSlow
        ? "tokki-avatar--blink-slow"
        : null,
    wagging && "tokki-avatar--wag",
    dragLand && "tokki-avatar--drag-land",
    moodFlash && "tokki-avatar--mood-flash",
    // Easter egg classes
    blushing && "tokki-avatar--blushing",
    dancing && "tokki-avatar--dancing",
    bellyRubbing && "tokki-avatar--belly-rub",
    winking && "tokki-avatar--winking"
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}
