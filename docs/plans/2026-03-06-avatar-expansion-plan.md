> [Docs home](../README.md) / Historical plans
>
> Historical implementation plan from March 2026. It captures the original proposal and may reference older paths such as `src/components/tokki/avatars/`; the live avatar system in this repo now lives under `src/features/avatars/`.

# Avatar Expansion Implementation Plan — 11 Characters with Mood-Triggered FX

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand Tokki from 3 avatars to 11 richly-detailed characters with species-driven proportions, cultural art styles, and mood-triggered SVG particle effects.

**Architecture:** Each avatar lives in its own TSX file under `src/components/tokki/avatars/`. A shared `FXLayer` component reads mood from Zustand and spawns SVG particles per avatar's FX config. All animations pure CSS keyframes — zero new deps.

**Tech Stack:** React 18, TypeScript, SVG, CSS keyframes, Zustand

---

## Task 1: Scaffold file structure + update types

**Files:**
- Modify: `src/types/tokki.ts:58` — expand `AvatarId` union
- Create: `src/components/tokki/avatars/index.ts` — avatar registry
- Create: `src/components/tokki/avatars/types.ts` — FX config types
- Modify: `src/components/tokki/TokkiAvatarAsset.tsx` — import from registry

**Step 1:** Update `AvatarId` in `src/types/tokki.ts` line 58:
```typescript
export type AvatarId =
  | "rabbit_v1" | "rabbit_v2"
  | "cat_v1" | "cat_v2"
  | "dog_v1"
  | "fox_v1" | "fox_v2"
  | "dragon_v1"
  | "phoenix_v1"
  | "kitsune_v1"
  | "serpent_v1"
  | "penguin_v1"
  | "turtle_v1"
  | "owl_v1";
```

**Step 2:** Create `src/components/tokki/avatars/types.ts`:
```typescript
import type { Mood } from "../../../types/tokki";

export interface FXConfig {
  particle: "ember" | "petal" | "snow" | "wisp" | "star" | "ink" | null;
  count: [number, number];
  zone: { x: [number, number]; y: [number, number] };
  intensity: number;
}

export type AvatarFXMap = Partial<Record<Mood, FXConfig>>;
```

**Step 3:** Create `src/components/tokki/avatars/index.ts` — starts with existing 3 avatars re-exported, will grow:
```typescript
import type { AvatarId } from "../../../types/tokki";
import type { AvatarFXMap } from "./types";
import type { JSX } from "react";

export interface AvatarEntry {
  id: AvatarId;
  label: string;
  emoji: string;
  cssClass: string;
  Component: () => JSX.Element;
  fx: AvatarFXMap;
}

// Will be populated as avatars are built
const registry = new Map<AvatarId, AvatarEntry>();

export function registerAvatar(entry: AvatarEntry): void {
  registry.set(entry.id, entry);
}

export function getAvatar(id: AvatarId): AvatarEntry | undefined {
  return registry.get(id);
}

export function getAllAvatars(): AvatarEntry[] {
  return Array.from(registry.values());
}
```

**Step 4:** Refactor `TokkiAvatarAsset.tsx` to use the registry:
```typescript
import { getAvatar } from "./avatars";
import type { TokkiAssetId } from "../../animation/mapActionToView";

interface TokkiAvatarAssetProps {
  assetId: TokkiAssetId;
}

export function TokkiAvatarAsset({ assetId }: TokkiAvatarAssetProps): JSX.Element {
  const entry = getAvatar(assetId);
  if (entry) {
    return <entry.Component />;
  }
  // Fallback to rabbit_v1 if not found
  const fallback = getAvatar("rabbit_v1");
  return fallback ? <fallback.Component /> : <div />;
}
```

**Step 5:** Move existing RabbitAsset, CatAsset, FoxAsset into separate files and register them (keeps v1 assets working while we build new ones).

**Step 6:** Run `npm run typecheck` to verify no type errors.

**Step 7:** Commit: `feat: scaffold avatar registry and expand AvatarId type`

---

## Task 2: Build particle system (6 particle types + FXLayer)

**Files:**
- Create: `src/components/tokki/avatars/particles/EmberParticle.tsx`
- Create: `src/components/tokki/avatars/particles/PetalParticle.tsx`
- Create: `src/components/tokki/avatars/particles/SnowParticle.tsx`
- Create: `src/components/tokki/avatars/particles/WispParticle.tsx`
- Create: `src/components/tokki/avatars/particles/StarParticle.tsx`
- Create: `src/components/tokki/avatars/particles/InkTrail.tsx`
- Create: `src/components/tokki/avatars/FXLayer.tsx`
- Modify: `src/style.css` — add particle keyframe animations

Each particle is a small SVG element with randomized position, delay, and duration. All particles share this interface:

```typescript
interface ParticleProps {
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}
```

**EmberParticle:** Small orange-red circles that float upward and fade. For dragon/phoenix.
**PetalParticle:** Sakura petal shapes that drift and spin. For rabbit.
**SnowParticle:** White hexagonal flakes that drift down. For penguin.
**WispParticle:** Translucent ghostly orbs with trails. For kitsune.
**StarParticle:** Tiny star shapes that twinkle in/out. For celestial owl.
**InkTrail:** Flowing ink droplets that dissipate. For fox.

**FXLayer.tsx** reads `avatarId` and `mood` from Zustand store, looks up the avatar's FX config, spawns particles with `Math.random()` for positions/timing:

```typescript
import { useTokkiStore } from "../../../state/useTokkiStore";
import { getAvatar } from "./index";
// ... particle imports

export function FXLayer(): JSX.Element | null {
  const avatarId = useTokkiStore((s) => s.avatarId);
  const mood = useTokkiStore((s) => s.state?.current_action?.mood ?? "idle");

  const avatar = getAvatar(avatarId);
  if (!avatar) return null;

  const fxConfig = avatar.fx[mood];
  if (!fxConfig || !fxConfig.particle) return null;

  const count = fxConfig.count[0] + Math.floor(Math.random() * (fxConfig.count[1] - fxConfig.count[0] + 1));

  const particles = Array.from({ length: count }, (_, i) => ({
    x: fxConfig.zone.x[0] + Math.random() * (fxConfig.zone.x[1] - fxConfig.zone.x[0]),
    y: fxConfig.zone.y[0] + Math.random() * (fxConfig.zone.y[1] - fxConfig.zone.y[0]),
    delay: Math.random() * 2,
    duration: 1.5 + Math.random() * 1.5,
    size: 3 + Math.random() * fxConfig.intensity * 5,
    key: `${fxConfig.particle}-${i}-${Date.now()}`,
  }));

  const ParticleComponent = PARTICLE_MAP[fxConfig.particle];
  return (
    <svg className="fx-layer" viewBox="0 0 160 160" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {particles.map((p) => (
        <ParticleComponent key={p.key} x={p.x} y={p.y} delay={p.delay} duration={p.duration} size={p.size} />
      ))}
    </svg>
  );
}
```

CSS keyframes for particles (add to `style.css`):
- `@keyframes ember-rise` — float up + fade out
- `@keyframes petal-drift` — diagonal drift + rotate
- `@keyframes snow-fall` — gentle fall + sway
- `@keyframes wisp-orbit` — circular path + fade
- `@keyframes star-twinkle` — scale pulse + opacity
- `@keyframes ink-dissolve` — spread + fade

**Step:** Add FXLayer to TokkiCharacter.tsx render, inside the `.tokki-stage` container.

**Step:** Run `npm run typecheck`.

**Step:** Commit: `feat: add SVG particle FX system with 6 particle types`

---

## Task 3: Build Dog avatar (`dog_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Dog.tsx`
- Modify: `src/style.css` — add `.tokki-asset--dog` overrides
- Modify: `src/components/tokki/avatars/index.ts` — register

**Art direction:** American retro cartoon — bold outlines (strokeWidth 2.5), warm saturated colors (#D4894A body, #FFF5E6 belly), big floppy ears, wide happy eyes, thick wagging tail. Stocky proportions — wide body, short legs.

**SVG structure** (160x160 viewBox, same as all avatars):
- Ground shadow ellipse (`.tokki-shadow`)
- Stocky body ellipse (`.tokki-body`) — wider than tall, rx=30 ry=24
- Floppy ears (`.tokki-ear`) — rounded rectangles that hang down, not point up
- Round head (`.tokki-head`) — slightly wider than rabbit, r=40
- Big round eyes (`.tokki-eye`) — larger pupils, more white showing = expressive
- Wet nose (`.tokki-nose`) — larger, shiny black with highlight
- Big open smile (`.tokki-mouth`) — wider arc than other pets
- Tongue (`.tokki-tongue`) — visible in playful mood, pink with CSS toggle
- Thick paws (`.tokki-paw`)
- Wagging tail (`.tokki-tail`) — thick, upright, animated

**FX config:**
```typescript
fx: {
  playful: { particle: null, count: [0, 0], zone: { x: [0, 160], y: [0, 160] }, intensity: 0 },
  // Dog's FX is CSS-only: tail blur + motion lines when playful
}
```

**CSS:** `.tokki-asset--dog .tokki-tail` gets `animation: dog-tail-wag 0.4s ease-in-out infinite` — fast wag. Motion lines via `::after` pseudo-element with opacity toggled by `.tone-playful`.

**Step:** Typecheck, commit: `feat: add Dog avatar with retro cartoon style`

---

## Task 4: Build Dragon avatar (`dragon_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Dragon.tsx`
- Modify: `src/style.css` — add `.tokki-asset--dragon` overrides
- Modify: `src/components/tokki/avatars/index.ts` — register

**Art direction:** Chinese traditional — jade green (#2D8B57) and crimson (#C23B22) palette, cloud swirl patterns on body, gold (#D4A833) accents. Angular proportions — elongated neck, triangular head, small wings, coiled serpentine tail.

**SVG structure:**
- Ground shadow
- Coiled tail base (`.tokki-tail`) — thick spiral path with scale texture pattern
- Compact body (`.tokki-body`) — narrower, more upright than others
- Small folded wings (`.tokki-wing`) — triangular, jade-tinted membranes
- Long neck leading to angular head (`.tokki-head`) — not round, more diamond
- Horns (`.tokki-horn`) — two small curved paths above head
- Fierce but cute eyes (`.tokki-eye`) — slit pupils like cat but golden iris
- Small nostrils (`.tokki-nose`) — two dots, smoke curls nearby
- Fanged smile (`.tokki-mouth`) — tiny fang points visible
- Cloud pattern overlays — decorative SVG paths on body, low opacity
- Smoke curls (`.tokki-smoke`) — two small wispy paths near nostrils, hidden by default
- Zzz elements (shared)

**FX config:**
```typescript
fx: {
  surprised: { particle: "ember", count: [4, 7], zone: { x: [40, 120], y: [20, 80] }, intensity: 0.8 },
  playful: { particle: "ember", count: [3, 5], zone: { x: [60, 100], y: [30, 70] }, intensity: 0.6 },
  sleepy: { particle: null, count: [0, 0], zone: { x: [0, 0], y: [0, 0] }, intensity: 0 },
  // Sleepy smoke is CSS-only: .tokki-smoke opacity toggles
}
```

**CSS:** `.tokki-asset--dragon .tokki-wing` gets subtle fold/unfold animation. `.tokki-asset--dragon .tokki-smoke` hidden by default, shown via `.tone-sleepy .tokki-asset--dragon .tokki-smoke { opacity: 0.6; animation: smoke-curl 3s ease-in-out infinite; }`.

New keyframes: `smoke-curl`, `wing-fold`, `dragon-tail-coil`.

**Step:** Typecheck, commit: `feat: add Dragon avatar with Chinese traditional art style`

---

## Task 5: Build Phoenix avatar (`phoenix_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Phoenix.tsx`
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Persian miniature — lapis lazuli (#1A3A6A), gold (#D4A833), flame orange (#E8652A), intricate feather patterns (overlapping teardrop SVG shapes). Vertical emphasis — dramatic spread wing silhouettes, flowing long tail plumes.

**SVG structure:**
- Ground shadow (wider, reflecting wingspan)
- Body — compact, upright, flame orange → gold gradient
- Wings (`.tokki-wing--left`, `.tokki-wing--right`) — large, layered feather shapes with lapis/gold overlapping teardrops. Wings rest folded by default, spread slightly on hover
- Head — small and proud, upright crest of flame feathers (3-4 teardrop paths)
- Eyes — small, sharp, amber with determination
- Beak — small, golden, pointed downward
- Tail plumes (`.tokki-tail`) — 3 flowing curved paths cascading down, gradient from flame to gold tips
- Intricate feather pattern overlays on wing membranes — low opacity decorative paths

**FX config:**
```typescript
fx: {
  playful: { particle: "ember", count: [5, 8], zone: { x: [20, 140], y: [10, 100] }, intensity: 0.9 },
  curious: { particle: "ember", count: [2, 4], zone: { x: [40, 120], y: [30, 80] }, intensity: 0.4 },
}
```

**CSS:** Wing feather glow pulse via `.tone-playful .tokki-asset--phoenix .tokki-wing { filter: brightness(1.15); }` with `animation: phoenix-glow-pulse 1.5s ease-in-out infinite`. Tail plumes sway with `phoenix-tail-flow` keyframe.

**Step:** Typecheck, commit: `feat: add Phoenix avatar with Persian miniature art style`

---

## Task 6: Build Kitsune avatar (`kitsune_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Kitsune.tsx`
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Japanese yokai — ethereal white-blue fur (#E8EEF8 → #C5D4E8), semi-transparent edges using feGaussianBlur filter, spirit fire (kitsunebi) in pale blue (#88BBEE). Multiple tails (3 visible). Brush-stroke texture edges via SVG feTurbulence.

**SVG structure:**
- Ground shadow (faint, ethereal)
- 3 flowing tails (`.tokki-tail--a`, `--b`, `--c`) — curved paths fanning out, white-blue with translucent tips
- Slim, ethereal body — fox proportions but slightly elongated
- Head — fox-like but with softer edges, white mask marking
- Eyes — large, wise, pale gold iris (#D4C088) with vertical pupils
- Ears — tall, pointed like fox but with spirit-fire tufts at tips
- Spirit fire orbs (`.tokki-foxfire`) — 2-3 small pale blue circles floating near tails, hidden by default
- Whisker-like spirit trails near face

**FX config:**
```typescript
fx: {
  curious: { particle: "wisp", count: [3, 5], zone: { x: [80, 150], y: [30, 120] }, intensity: 0.7 },
  playful: { particle: "wisp", count: [4, 6], zone: { x: [60, 150], y: [20, 130] }, intensity: 0.9 },
}
```

**CSS:** `.tokki-asset--kitsune` gets `filter: drop-shadow(0 0 4px rgba(136,187,238,0.3))` for ethereal glow. Tails sway independently with offset animations. Fox-fire orbs shown via `.tone-curious .tokki-asset--kitsune .tokki-foxfire { opacity: 0.7; animation: foxfire-orbit 3s ease-in-out infinite; }`.

**Step:** Typecheck, commit: `feat: add Kitsune avatar with Japanese yokai ethereal style`

---

## Task 7: Build Serpent avatar (`serpent_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Serpent.tsx`
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Aztec/Mesoamerican — turquoise (#40C4AA), obsidian (#2A2A3A), gold (#D4A833), geometric scale patterns as repeating diamond SVG shapes. Coiled body with no legs, wide hood, hypnotic spiral eyes.

**SVG structure:**
- Ground shadow (oval, matches coil)
- Coiled body (`.tokki-body`) — thick spiral path from bottom center, Quetzalcoatl-inspired. Geometric diamond scale pattern overlay
- Hood/cowl (`.tokki-hood`) — flared section behind head, turquoise with gold border
- Head — triangular, flat-topped, with geometric markings
- Eyes (`.tokki-eye`) — hypnotic, golden spirals (small SVG spiral path with rotating animation)
- Forked tongue (`.tokki-tongue`) — small red forked path, flicks in/out via CSS
- Geometric pattern band across body — repeating Aztec step-fret motif
- Tail rattle at end of coil — small segmented shape

**FX config:**
```typescript
fx: {
  curious: { particle: "star", count: [3, 5], zone: { x: [30, 130], y: [40, 100] }, intensity: 0.6 },
  // Rainbow shimmer is CSS-only via hue-rotate animation on scales
}
```

**CSS:** `.tokki-asset--serpent .tokki-body` scale pattern gets `animation: scale-shimmer 4s linear infinite` with `filter: hue-rotate()` cycling. Tongue flick: `.tokki-asset--serpent .tokki-tongue { animation: tongue-flick 4s ease-in-out infinite; }`.

**Step:** Typecheck, commit: `feat: add Serpent avatar with Aztec/Mesoamerican art style`

---

## Task 8: Build Celestial Owl avatar (`owl_v1`)

**Files:**
- Create: `src/components/tokki/avatars/CelestialOwl.tsx`
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Art Nouveau + celestial — deep purple (#3A2266), gold (#D4A833), silver-white (#E8E4F0), moon/star motifs. Round body, huge eyes (50% of face), layered flowing wing feathers with Art Nouveau curves.

**SVG structure:**
- Ground shadow
- Round squat body (`.tokki-body`) — wider than tall, deep purple with Art Nouveau feather patterns
- Layered wing feathers (`.tokki-wing--left`, `--right`) — 3-4 overlapping curved shapes per side, gradient purple → gold tips
- Round head — large for body, almost touching body (no visible neck)
- HUGE eyes (`.tokki-eye`) — diameter ~40% of head, deep purple iris with gold ring, white pupil dot. Lunar glow effect
- Tiny beak (`.tokki-beak`) — small golden triangle pointing down
- Ear tufts (`.tokki-ear`) — two small pointed feather tufts
- Small star/moon decorative dots around body — 4-5 tiny circles/stars at fixed positions
- Constellation dots (`.tokki-constellation`) — 5-6 dots with connecting faint lines, hidden by default
- Feet — tiny talons peeking below body

**FX config:**
```typescript
fx: {
  curious: { particle: "star", count: [4, 7], zone: { x: [10, 150], y: [5, 90] }, intensity: 0.8 },
  idle: { particle: "star", count: [2, 3], zone: { x: [20, 140], y: [10, 60] }, intensity: 0.3 },
}
```

**CSS:** `.tokki-asset--owl .tokki-eye` gets `animation: owl-eye-glow 3s ease-in-out infinite` with subtle brightness pulse. Constellation dots shown via `.tone-curious .tokki-asset--owl .tokki-constellation { opacity: 0.6; animation: constellation-twinkle 2s ease-in-out infinite; }`.

**Step:** Typecheck, commit: `feat: add Celestial Owl avatar with Art Nouveau celestial style`

---

## Task 9: Build Penguin avatar (`penguin_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Penguin.tsx`
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Scandinavian folk art — clean bold lines, cool palette (navy #1A2844, white, ice blue #A8C8E8), cozy red scarf detail (#C44040), minimal geometric patterns.

**SVG structure:**
- Ground shadow
- Round squat body (`.tokki-body`) — very round, wider than tall, navy blue with white belly patch
- Tiny flippers (`.tokki-flipper--left`, `--right`) — small wing-like shapes at sides
- Round head — blends into body smoothly, navy
- Eyes (`.tokki-eye`) — small and round, white with black pupils, cheerful
- Beak (`.tokki-beak`) — small orange triangle pointing down
- Cheek spots (`.tokki-cheek`) — subtle pink circles
- Scarf (`.tokki-scarf`) — red with white stripe, wrapped around neck area with flowing end
- Feet (`.tokki-feet`) — small orange webbed feet at base
- White belly patch — large oval on front of body

**FX config:**
```typescript
fx: {
  idle: { particle: "snow", count: [3, 5], zone: { x: [20, 140], y: [0, 60] }, intensity: 0.4 },
  playful: { particle: "snow", count: [5, 8], zone: { x: [10, 150], y: [0, 80] }, intensity: 0.7 },
}
```

**CSS:** Flipper flap animation, scarf flutter in wind, belly slide animation for playful state.

**Step:** Typecheck, commit: `feat: add Penguin avatar with Scandinavian folk art style`

---

## Task 10: Build Turtle avatar (`turtle_v1`)

**Files:**
- Create: `src/components/tokki/avatars/Turtle.tsx`
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Indigenous Pacific — earth tones (forest green #2D5A27, ocean blue #2266AA, terracotta #B85C38), shell with tribal tattoo-like geometric patterns (circles, waves, triangles), inspired by Polynesian art.

**SVG structure:**
- Ground shadow (wide)
- Massive shell (`.tokki-shell`) — dominant feature, domed ellipse covering most of body. Decorated with geometric tribal patterns (concentric circles, wave lines, triangular borders)
- Small head (`.tokki-head`) — peeking out from left side of shell, green, gentle face
- Eyes (`.tokki-eye`) — small, kind, dark with warm highlight
- Tiny smile (`.tokki-mouth`)
- Small legs (`.tokki-leg`) — four stubby legs visible at corners of shell
- Tail — tiny stub peeking from back
- Pattern overlay on shell — tribal geometric designs in darker green + terracotta
- Shell pattern glow elements (`.tokki-shell-pattern`) — for the mood-triggered pulse

**FX config:**
```typescript
fx: {
  curious: { particle: null, count: [0, 0], zone: { x: [0, 0], y: [0, 0] }, intensity: 0 },
  // Turtle FX is CSS-only: shell patterns pulse/glow
}
```

**CSS:** `.tokki-asset--turtle .tokki-shell-pattern { animation: shell-glow-pulse 4s ease-in-out infinite; }`. Sleepy state: head retreats partially into shell via `transform: translateX(-8px)`. Slow, patient animation timings — everything 2x slower than other pets.

**Step:** Typecheck, commit: `feat: add Turtle avatar with Indigenous Pacific art style`

---

## Task 11: Build upgraded Rabbit v2 (`rabbit_v2`)

**Files:**
- Create: `src/components/tokki/avatars/Rabbit.tsx` (new v2)
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Japanese ukiyo-e — soft brush-stroke edges (feTurbulence SVG filter for hand-painted texture), sakura pink (#F5B7C5) accents, warm cream body (#FFF5E8), cherry blossom pattern on ears. Proportions: very round body, massive ears (40% of total height).

**Builds on v1 rabbit** but adds: brush-stroke edge filter, sakura petal patterns on inner ears, more detailed paw pads, cultural blossom motifs.

**FX config:**
```typescript
fx: {
  surprised: { particle: "petal", count: [4, 7], zone: { x: [20, 140], y: [10, 100] }, intensity: 0.8 },
  playful: { particle: "petal", count: [2, 4], zone: { x: [40, 120], y: [20, 80] }, intensity: 0.5 },
}
```

**Step:** Typecheck, commit: `feat: add Rabbit v2 with Japanese ukiyo-e brush style`

---

## Task 12: Build upgraded Cat v2 (`cat_v2`)

**Files:**
- Create: `src/components/tokki/avatars/Cat.tsx` (new v2)
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Egyptian art deco — geometric angular patterns, gold accents (#D4A833), kohl-lined almond eyes, deep blue-black body (#1A1A2E) with gold geometric markings. Bastet-inspired elegance. Sleek proportions — longer body, elegant posture.

**SVG structure enhancements over v1:** Gold geometric collar/necklace, kohl-lined eye borders (thicker outer stroke), Egyptian-style ear shapes (more triangular), gold ankh or eye-of-Horus subtle pattern on forehead, geometric body markings.

**FX config:**
```typescript
fx: {
  curious: { particle: null, count: [0, 0], zone: { x: [0, 0], y: [0, 0] }, intensity: 0 },
  // Cat v2 FX is CSS-only: golden eye glow when curious
}
```

**CSS:** `.tone-curious .tokki-asset--cat-v2 .tokki-eye { filter: brightness(1.3) drop-shadow(0 0 6px rgba(212,168,51,0.6)); animation: cat-eye-glow 2s ease-in-out infinite; }`.

**Step:** Typecheck, commit: `feat: add Cat v2 with Egyptian art deco style`

---

## Task 13: Build upgraded Fox v2 (`fox_v2`)

**Files:**
- Create: `src/components/tokki/avatars/Fox.tsx` (new v2)
- Modify: `src/style.css`
- Modify: `src/components/tokki/avatars/index.ts`

**Art direction:** Chinese ink wash (shuǐmò) — flowing gradients simulating ink diffusion, misty edges (feGaussianBlur), muted ink palette (warm grey #8B7355, rust #A0522D, parchment #F5F0E8). Lean proportions like v1 fox but with flowing, painterly quality.

**SVG features:** Ink-wash gradient fills simulating wet brush on rice paper, misty blur on tail tip and ear tips, flowing tail with ink-trail quality, subtle calligraphic-style markings on face.

**FX config:**
```typescript
fx: {
  curious: { particle: "ink", count: [2, 4], zone: { x: [90, 150], y: [60, 130] }, intensity: 0.6 },
  playful: { particle: "ink", count: [3, 5], zone: { x: [80, 150], y: [50, 140] }, intensity: 0.8 },
}
```

**Step:** Typecheck, commit: `feat: add Fox v2 with Chinese ink wash art style`

---

## Task 14: Redesign AvatarPicker for 11+ avatars

**Files:**
- Modify: `src/components/tokki/AvatarPicker.tsx`
- Modify: `src/style.css` — update `.avatar-picker` styles

**Changes:**
- Replace static `AVATARS` array with `getAllAvatars()` from registry
- Layout: 2-row scrollable grid (6 top, 5 bottom) or horizontal scroll strip
- Each button shows the emoji + small label
- Active avatar gets a glow border matching its cultural palette
- Compact enough to fit in 320px window width

**Step:** Typecheck, commit: `feat: redesign AvatarPicker for 11 avatars`

---

## Task 15: Wire FXLayer into TokkiCharacter + integrate mood store

**Files:**
- Modify: `src/components/tokki/TokkiCharacter.tsx` — add FXLayer to render
- Modify: `src/state/useTokkiStore.ts` — ensure mood is accessible (already is via `state.current_action.mood`)

**Step:** Add `<FXLayer />` inside the `.tokki-stage` div, positioned absolutely behind/over the avatar. Verify particles render during mood transitions.

**Step:** Typecheck, commit: `feat: wire FXLayer into character rendering pipeline`

---

## Task 16: Add randomness layer — micro-behaviors + rare animations

**Files:**
- Modify: `src/style.css` — add rare animation keyframes
- Modify: Individual avatar CSS — add micro-behavior animations (random blink timing, ear twitches)

**Implementation:**
- CSS `animation-delay` with random inline styles (set via React)
- Each avatar component accepts an optional `seed` prop for micro-behavior variance
- Rare animations: 5% chance per tick in behavior engine (Rust-side `engine/behavior.rs`) to emit `special_idle` actions: `idle_sneeze`, `idle_slowblink`, `idle_smoke_yawn`, `idle_head_turn`
- Frontend maps these to CSS classes: `.state-idle-sneeze`, etc.

**Step:** Typecheck, commit: `feat: add randomness layer with micro-behaviors and rare idle animations`

---

## Task 17: Final integration + verify all 11 avatars work

**Steps:**
1. Run `npm run typecheck` — zero errors
2. Run `npm run test:unit` — all passing
3. Launch `npx tauri dev` — verify each avatar renders, picker works, FX triggers on mood changes
4. Verify v1 avatars still work as fallbacks
5. Commit: `feat: complete 11-avatar expansion with mood-triggered FX`
