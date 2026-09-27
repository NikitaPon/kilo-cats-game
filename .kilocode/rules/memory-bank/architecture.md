# System Patterns: Cat Games Collection

## Architecture Overview

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout + metadata
│   ├── page.tsx                # Main menu (game registry)
│   ├── globals.css             # Tailwind imports + global styles
│   ├── favicon.ico             # Site icon
│   └── games/<game-slug>/page.tsx   # One thin route wrapper per game
├── characters/                 # Shared character design system
│   ├── types.ts                # CatId, CatColors, CatPreset, CatSpriteOptions
│   ├── cat-design.ts           # CAT_COLORS (palette) + CAT_MOTION (animation curves)
│   ├── cats.ts                 # CAT_PRESETS — the cast
│   ├── draw-cat.ts             # drawCat() / drawCatBalloon() — the only renderer
│   └── index.ts                # Public barrel: import from "@/characters"
├── lib/                        # Cross-game utilities
│   └── audio.ts                # Shared AudioContext + playTone/playSequence
└── components/                 # One self-contained component per game
    ├── CatGame.tsx             # /games/acrobatics
    ├── CatMusicBand.tsx        # /games/music-band (3-lane rhythm game)
    ├── music-song.ts           # Its chart generator, timing and scoring rules
    ├── CatHiddenToys.tsx       # /games/hidden-toys
    ├── CatSkyWonders.tsx       # /games/sky-wonders
    └── CatFishing.tsx          # /games/fishing
```

Layers, from the bottom up: **presets & tokens** → **renderer** → **shared utils** → **game rules** → **game components** → **route wrappers**.

### 2b. Testable Game Rules

Game *rules* belong in a plain `.ts` module beside the component, not inline in
it. `music-song.ts` holds the chart generator, the timing windows and the scoring
functions; `cat-hunt.ts` holds the room, the catch test and the difficulty curve.
The `.tsx` only renders and wires up input. Keep the rules pure so they can be
exercised without a browser.

## Shared Character System

The cats were previously copy-pasted into all four games (~190 lines each, with
drifting constants). They now live in `src/characters/` and there is exactly one
implementation of the cat look.

### The contract

Games own **actor state** only. Characters own **appearance**.

```tsx
import { CAT_MOTION, catName, drawCat, getCatPreset } from "@/characters";
import type { CatActor } from "@/characters";

interface Cat extends CatActor {   // id, x, y come from CatActor
  targetX: number;
  isMoving: boolean;
}

drawCat(ctx, {
  preset: getCatPreset(cat.id),   // identity: colors, scale, size, balloon color
  x: cat.x,
  y: cat.y,
  rotation: 0,      // optional, defaults 0
  scaleX: 1,        // optional, multiplies preset.scale (trick squash & stretch)
  scaleY: 1,        // optional
  opacity: 1,       // optional
  time,             // seconds; drives the idle tail wag
  blinking: false,  // optional
  expression: "neutral" | "squint" | "happy",
  pawOffset: 0,     // optional; front-paw bop (Music Band)
  tailWag: undefined, // optional; explicit radians, else the idle wag
});
```

### Rules

1. **No cat colors in games.** Never write `#1a1a1a`, `#FFB6C1`, `#FFD700`,
   `#4CAF50` or `isMiuska` in a game component. Colors come from
   `preset.colors` (per cat) or `CAT_COLORS` (shared accents).
2. **No sprite code in games.** Never draw cat body parts directly; call
   `drawCat` / `drawCatBalloon`.
3. **No magic motion numbers.** Use `CAT_MOTION.*` (e.g.
   `CAT_MOTION.pawBopRange`) so motion stays consistent across games.
4. **UI copy uses `catName(id)`** (one cat) or `castNames()` (the whole cast, e.g.
   "Миуска, Алиска и Вики"), so renaming a cat in `cats.ts` updates every game.
5. **Per-game `Cat` interfaces extend `CatActor`** so `id: CatId` is enforced and
   narrow. Refer to a cat's size through `getCatPreset(cat.id).height` rather
   than storing a copy on the actor.
6. **Decorations attached to a cat must respect `preset.scale`** — replicate the
   preset scale in any transform you build yourself (see the star in `CatGame.tsx`).
7. **Hold the cast in an array, not named refs.** Games keep `catsRef`/`useState`
   arrays of actors and iterate them, rather than `cat1Ref`/`cat2Ref`. Anything
   that picks "a cat" must derive from `cats.length`, never a hardcoded index.
8. **Place cats via a `STAGE_MARKS: Record<CatId, { x, y }>`** table rather than
   inline coordinates. A cat's anchor is its body centre, so ground-align the
   three by scaling the offset from the feet: `y = floorY - 53 * preset.scale`.
   That keeps a new cat standing on the same floor as the others.

### Adding a cat

Add a `CatPreset` to `CAT_PRESETS` (`cats.ts`) and add its id to the `CatId`
union (`types.ts`). Then, per game: add a `STAGE_MARKS` entry, add the id to the
spawn list, and make any per-cat logic iterate the array.

## Key Design Patterns

### 1. App Router Pattern

Uses Next.js App Router with file-based routing:
```
src/app/
├── page.tsx           # Route: /
├── games/
│   └── <slug>/page.tsx  # Route: /games/<slug>
└── api/
    └── route.ts       # API Route: /api
```

Each game route is a thin wrapper: back-link + game component. Game logic lives
in `src/components/`, not in the route.

### 2. Game Components Are Self-Contained

One component per game, each owning its canvas, animation loop, audio synthesis,
props and local state. Games share the **character system**, not gameplay code.
Animation state goes in refs (mutated inside `requestAnimationFrame`); `useState`
is reserved for values the UI renders.

### 3. Server Components by Default

Route wrappers and pages are Server Components; only game components carry
`"use client"`.

### 4. Shared Audio

`src/lib/audio.ts` owns the single `AudioContext` (browsers cap how many a page
may hold) plus `playTone` / `playSequence` for enveloped oscillator sounds.
Games that need their own richer synth still call `getAudioContext()` and wrap
their work in `try { ... } catch { /* audio unavailable */ }`. Never construct an
`AudioContext` inside a game component.

### 5. Layout Pattern

Layouts wrap pages and can be nested: `src/app/layout.tsx` is the root layout,
adding a route group only needs a nested `layout.tsx`.

## Styling Conventions

### Tailwind CSS Usage
- Utility classes directly on elements
- Component composition for repeated patterns
- Responsive: `sm:`, `md:`, `lg:`, `xl:`

### Common Patterns
```tsx
// Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Flexbox centering
<div className="flex items-center justify-center">
```

## File Naming Conventions

- Components: PascalCase (`CatGame.tsx`, `Button.tsx`)
- Modules in domain folders: kebab-case (`cat-design.ts`, `draw-cat.ts`)
- Utilities: camelCase (`utils.ts`, `helpers.ts`)
- Pages/Routes: lowercase (`page.tsx`, `layout.tsx`)
- Directories: lowercase (`characters/`, `components/`) or kebab-case for route groups

## State Management

For simple needs:
- `useState` for local component state that the UI renders
- `useRef` for per-frame animation state (mutated in `requestAnimationFrame`,
  never triggers re-render)
- `useContext` for shared state
- Server Components for data fetching

For complex needs (add when necessary):
- Zustand for client state
- React Query for server state
