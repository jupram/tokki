# Avatar Expansion Design — 11 Characters with Mood-Triggered FX

**Date**: 2026-03-06
**Status**: Approved

## Overview

Expand Tokki from 3 avatars (rabbit, cat, fox) to 11 richly-detailed characters, each with species-driven proportions, cultural art styles, and mood-triggered particle FX. Zero new dependencies — pure SVG/CSS/React.

## Design Decisions

- **Approach**: Each pet in its own TSX file, shared SVG particle FX layer
- **Art style**: Origin-matched cultural art styles per species (not uniform chibi)
- **Proportions**: Species-driven (dragon is angular, owl is round, serpent coils)
- **FX**: Mood-triggered only (not ambient) — effects feel earned
- **Dependencies**: Zero new runtime deps — pure SVG + CSS keyframes + React
- **Randomness**: True randomness in particle positions, animation timing, micro-behaviors

## The Roster

| # | Pet | ID | Cultural Art Style | Personality | Signature Mood FX |
|---|-----|-----|-------|---------|--------|
| 1 | Rabbit | `rabbit_v2` | Japanese ukiyo-e — brush strokes, sakura | Gentle, nervous, easily startled | Cherry blossom petals scatter when surprised |
| 2 | Cat | `cat_v2` | Egyptian art deco — geometric, gold, kohl eyes | Aloof, mysterious, loving | Golden eye glow when curious |
| 3 | Dog | `dog_v1` | American retro cartoon — bold, warm | Loyal, enthusiastic, energetic | Tail blur + motion lines when playful |
| 4 | Fox | `fox_v2` | Chinese ink wash (shuimo) — flowing, misty | Clever, mischievous, wise | Ink wisps trail from tail |
| 5 | Dragon | `dragon_v1` | Chinese traditional — cloud swirls, jade/crimson | Proud, protective, dramatic | Ember particles when excited; smoke when sleepy |
| 6 | Phoenix | `phoenix_v1` | Persian miniature — intricate feathers, lapis/gold | Passionate, resilient, warm | Wing ember glow; flame particles when playful |
| 7 | Kitsune | `kitsune_v1` | Japanese yokai — ethereal, spirit fire | Trickster, playful, ancient | Fox-fire wisps orbit when curious |
| 8 | Serpent | `serpent_v1` | Aztec/Mesoamerican — geometric scales, turquoise | Calm, hypnotic, ancient | Rainbow scale shimmer when curious |
| 9 | Penguin | `penguin_v1` | Scandinavian folk art — clean, cool blues, scarf | Cheerful, clumsy, hardy | Snowflake particles; belly slide when playful |
| 10 | Turtle | `turtle_v1` | Indigenous Pacific — tribal shell patterns, earth | Patient, wise, steady | Shell patterns pulse/glow; shell retreat when sleepy |
| 11 | Celestial Owl | `owl_v1` | Art Nouveau + celestial — moon/stars, purple/gold | Mysterious, all-seeing, nocturnal | Constellation twinkles; lunar eye glow |

## Species-Driven Proportions

Each avatar breaks from uniform sizing to match its species nature:

- **Rabbit**: Round, compact, ears = 40% of height
- **Cat**: Sleek, slightly elongated, elegant posture
- **Dog**: Stocky, wide stance, big expressive face
- **Fox**: Lean, pointed features, prominent fluffy tail
- **Dragon**: Angular, elongated neck, small wings, coiled tail
- **Phoenix**: Vertical emphasis, dramatic spread wings, flowing tail plumes
- **Kitsune**: Fox base but ethereal — semi-transparent edges, multiple tails
- **Serpent**: Coiled body, no legs, wide hood, hypnotic eyes
- **Penguin**: Round and squat, tiny flippers, big belly
- **Turtle**: Wide and low, massive shell, small head peeking out
- **Celestial Owl**: Round body, huge eyes (50% of face), layered wing feathers

## File Architecture

```
src/components/tokki/avatars/
├── Rabbit.tsx
├── Cat.tsx
├── Dog.tsx
├── Fox.tsx
├── Dragon.tsx
├── Phoenix.tsx
├── Kitsune.tsx
├── Serpent.tsx
├── Penguin.tsx
├── Turtle.tsx
├── CelestialOwl.tsx
├── index.ts               ← registry + dynamic lookup
├── particles/
│   ├── EmberParticle.tsx   ← reusable SVG particle types
│   ├── PetalParticle.tsx
│   ├── SnowParticle.tsx
│   ├── WispParticle.tsx
│   ├── StarParticle.tsx
│   └── InkTrail.tsx
└── FXLayer.tsx             ← mood-aware particle spawner
```

### FX System

`FXLayer` is a React component that:
1. Reads current mood + avatarId from the Zustand store
2. Looks up the FX config for that avatar × mood combination
3. Spawns 3-8 SVG particle elements with randomized positions, delays, durations
4. Particles are pure SVG with CSS keyframe animations
5. No JS animation loop, no requestAnimationFrame — zero CPU when idle

### FX Config per Pet

Each avatar exports an FX map:
```typescript
type FXConfig = Record<Mood, {
  particle: "ember" | "petal" | "snow" | "wisp" | "star" | "ink" | null;
  count: [number, number];  // [min, max] — randomized
  zone: { x: [number, number]; y: [number, number] };  // spawn area
  intensity: number;  // 0-1, controls size/speed variance
}>;
```

## Randomness & "New Toy" Feel

Core principle: **First encounter = new toy delight. Over time = favorite toy comfort. Never predictable.**

Implementation:
- **Particle spawn positions**: Randomized within zone, never identical patterns
- **Animation timing**: `animation-delay` ±30% variance, `animation-duration` ±20%
- **Idle micro-behaviors**: Random ear twitches, blink timing, tail sways — not fixed intervals
- **Rare surprise animations**: 5% chance per tick of special idle (dog sneezes, cat slow-blinks, dragon yawns smoke, owl 180° head turn)
- **First-encounter animation**: Unique "hello" when first selected (dragon unfurls wings, penguin waddle dance, kitsune tails fan out)

## Migration from v1 Avatars

- Current `rabbit_v1`, `cat_v1`, `fox_v1` remain available as classic skins
- New versions (`rabbit_v2`, `cat_v2`, `fox_v2`) have cultural art treatment
- `TokkiAvatarAsset.tsx` becomes a thin dispatcher to individual avatar files
- `AvatarId` type expands to include all 11+ IDs
- `AvatarPicker` redesigned for 11 options (scrollable or grid)
- Rust `set_avatar` command accepts new IDs (string-based, no enum change needed)

## CSS Architecture

Each avatar gets:
- Base CSS in `style.css` under `.tokki-asset--{id}` namespace
- Shared particle animations in a new `particles.css` section
- Mood FX triggers via `.tokki-avatar.tone-{mood} .tokki-asset--{id} .fx-{type}` selectors
- Cultural-specific CSS custom properties (color palettes) per avatar

## Type Changes

```typescript
// types/tokki.ts
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

## Build Order

1. Set up file structure + types + registry
2. Build particle system (6 particle types + FXLayer)
3. Build pets in batches: Dog, Dragon, Phoenix (high wow) → Kitsune, Serpent, Owl (mythical) → Penguin, Turtle (whimsical) → Rabbit v2, Cat v2, Fox v2 (cultural upgrades)
4. Redesign AvatarPicker for 11+ options
5. Wire up FX system to mood store
6. Add randomness layer (micro-behaviors, rare animations)
7. Add first-encounter "hello" animations
