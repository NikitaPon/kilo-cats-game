# Active Context: Cat Games Collection

## Current State

**Application Status**: ✅ Complete - Cat Games Collection with Menu

A collection of fun mini-games featuring two adorable cats (Miuska and Aliska). Users can select games from a main menu and play different interactive experiences.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] Cat Acrobatics Game implementation
- [x] Main menu with game selection
- [x] Cat Music Band game implementation
- [x] Hidden Toys game implementation
- [x] Sky Wonders game implementation
- [x] Bug fixes: back button, cat names, Sky Wonders falling items
- [x] **Character architecture**: extracted all cats into `src/characters/` — one shared renderer, one palette, one set of presets
- [x] **Third cat "Viki"** (grey kitten) added to all four mini-games
- [x] **Cat Fishing** mini-game (`/games/fishing`) — first timing/skill game
- [x] **Cat Music Band** rebuilt as a 3-lane rhythm game
- [x] **Cat Hunt** mini-game (`/games/hunt`) — first game where you steer a cat
- [x] **Fourth cat "Yashka"** (black kitten, grey-blue tail) added to all six games
- [x] **Fullscreen mode** for all mini-games via shared `src/components/GameShell.tsx` (back button + fullscreen toggle, used by every `/games/*` page)
- [x] **Bug fix**: "В меню" button in Hidden Toys — global Space handler no longer hijacks keys pressed on focused links/buttons
- [x] **Bug fix**: removed fur bars over cat eyes in Hidden Toys (expression `squint` → `neutral`)
- [x] Hidden Toys canvas scales to available space (logical 900x500 room + `ctx.setTransform`)

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Main menu page | ✅ Complete |
| `src/app/layout.tsx` | Root layout | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/app/games/acrobatics/page.tsx` | Acrobatics game route | ✅ Complete |
| `src/app/games/music-band/page.tsx` | Music band game route | ✅ Complete |
| `src/app/games/hidden-toys/page.tsx` | Hidden toys game route | ✅ Complete |
| `src/app/games/sky-wonders/page.tsx` | Sky wonders game route | ✅ Complete |
| `src/components/CatGame.tsx` | Acrobatics game component | ✅ Complete |
| `src/components/CatMusicBand.tsx` | Music band game component | ✅ Complete |
| `src/components/CatHiddenToys.tsx` | Hidden toys game component | ✅ Complete |
| `src/components/CatSkyWonders.tsx` | Sky wonders game component | ✅ Complete |
| `src/characters/` | **Shared cat design system** (renderer, palette, presets) | ✅ Complete |
| `src/lib/audio.ts` | **Shared WebAudio** (AudioContext singleton, `playTone`) | ✅ Complete |
| `src/components/CatFishing.tsx` | Fishing game component | ✅ Complete |
| `src/app/games/fishing/page.tsx` | Fishing game route | ✅ Complete |
| `src/components/CatHunt.tsx` | Chase game component | ✅ Complete |
| `src/app/games/hunt/page.tsx` | Chase game route | ✅ Complete |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Game Collection

### Main Menu (`/`)
- Game selection cards with hover effects
- Links to individual games
- Responsive grid layout

### Game 1: Cat Acrobatics (`/games/acrobatics`)
- **Two Cats**: Miuska (black, yellow eyes) and Aliska (black & white, green eyes)
- **8 Acrobatic Tricks**: Double Jump, Somersault, Balloon Transformation, Star Catching, Cat Stack, Synchronized Swimming, Rocket Launch, Mirror Dance
- **Interactions**: Press Space or click to trigger random trick

### Game 2: Cat Music Band (`/games/music-band`)
- **3-Lane Rhythm Game** — rebuilt from a scripted 2-second animation into real
  skill-based play
- **Each cat owns a lane and an instrument**: Миуска (A) → 🎸 Гитара, Вики (S) → 🔔 Колокольчик, Алиска (D) → 🎺 Труба
- **Controls**: A/S/D (also arrows, 1/2/3, F/G/H) or tap the lane on touch
- **Chart**: generated per song on a 16th-note grid at 100 BPM, 12 bars (~29s), density
  ramping up; chords from bar 7; never two notes in one lane closer than 0.2s
- **Judgement**: Perfect ±60ms, Good ±130ms; anything past the window is a miss
- **Scoring**: Perfect 100 / Good 50, × a combo multiplier up to ×4, accuracy counts a
  good as half a perfect, grade S→D, best score in `localStorage`
- **Feel**: 2.2s countdown, beat guides, hit-line flash, squash-and-happy-face on the
  cat that played, sparkle burst, and a backing bass + click track scheduled up front
- **Audio**: the backing track is scheduled in one synchronous block so every tone
  shares a base time and stays locked to the visual clock

### Game 3: Hidden Toys (`/games/hidden-toys`)
- **Room Setting**: Cozy room with window, wallpaper, and wooden floor
- **5 Hiding Spots**: Pillow, Box, Curtain, Basket, Blanket
- **6 Toy Types**: Ball, Yarn, Fish, Mouse, Feather, Star
- **Discovery Mechanic**: Cats find hidden toys with animations and sounds
- **Visual Effects**: Expanding circles, sparkles, bouncing toys
- **Interactions**: Press Space or click to make cats discover toys

### Game 4: Sky Wonders (`/games/sky-wonders`)
- **Sky Setting**: Beautiful sky with clouds, sun, and grassy ground
- **5 Falling Item Types**: Petals, Confetti, Bubbles, Stars, Toy Mice
- **Magic Rain**: Beautiful items fall from clouds instead of rain
- **Cat Actions**: Cats jump and try to catch falling items
- **Visual Effects**: Floating clouds, animated items, jumping cats
- **Interactions**: Press Space or click to trigger magic rain
- **Calming Experience**: Peaceful and magical atmosphere

### Game 5: Cat Fishing (`/games/fishing`)
- **First skill-based game** — the other four are "press Space and watch"
- **Timing Bar**: A marker sweeps a bar; hook while it's inside the green bite window
- **4 Fish Species**: Карась (10), Окунь (25), Щука (50), Золотая рыбка (100) — rarer means a narrower, faster window
- **Phases**: `idle → casting → waiting → biting → result`, looping automatically
- **Score & Streak**: Points per fish × a streak multiplier (up to ×5); best score persists in `localStorage`
- **Rotating Angler**: A different cat holds the rod each cast; it perks up as the bite approaches
- **Scene**: Pond with drifting clouds, reeds, ambient fish, the hooked fish swimming in

### Game 6: Cat Hunt (`/games/hunt`)
- **The first game where you steer a cat** — the pillar the other four were missing
- **Control**: mouse (the cat chases the cursor and settles as it arrives) or WASD / arrows
- **Round**: 60 seconds on a wall clock whose hand sweeps once across it
- **Prey**: mice wander the floor and flee when the cat gets within 190px; they bounce off the walls
- **Rare prize**: a golden mouse (50 pts, 5× a regular one, bigger) appears more often as time runs down
- **Difficulty ramp**: mice get faster, spawn more often, more are alive at once, goldens get likelier
- **Scoring**: 10 per mouse × a combo multiplier up to ×5 (a 24-catch streak), grade S→D by
  catches-per-second, best score in `localStorage`
- **Room**: wallpaper, wall clock, picture frame, couch, rug, mouse-hole plate; Алиска and Вики sit
  on the couch at 0.7 scale watching Миуска hunt

## Cat Characters

All games feature the same four cats, defined once in `src/characters/cats.ts` and
drawn by the single shared renderer in `src/characters/draw-cat.ts`:
- **Miuska (Миуска)**: Medium-sized, completely black with yellow eyes (scale 1)
- **Aliska (Алиска)**: Largest, black back with white belly, black-white paws and face, green eyes (scale 1.2)
- **Viki (Вики)**: Small grey kitten, entirely grey with brown eyes (scale 0.75)
- **Yashka (Яшка)**: Smallest black kitten with a grey-blue tail and ice-blue eyes (scale 0.65)

Every cat shares the same silhouette; they differ only in `scale`, `colors` and
`balloonColor`. `markings: null` means a solid single-colour cat (Miuska, Viki,
Yashka); `markings: <colour>` adds the white belly, paws and face blaze (Aliska).
`colors.tail` is optional and overrides just the tail — only Yashka uses it.

**Never hardcode cat colors, proportions or motion constants in a game.** Import
from `@/characters` and pass a preset plus placement/expression. Use `castNames()`
for prose that lists the whole cast. See `architecture.md` → "Shared Character
System" for the full contract.

### When the cast grows

Adding a cat is a preset — but a game only keeps working if it handles the new
cat. Checklist, in the order the compiler will force on you:

1. `CatId` in `src/characters/types.ts` and a `CatPreset` in `cats.ts`.
2. Any `Record<CatId, ...>` layout table gets a new entry — TypeScript will not
   let this be forgotten.
3. **Music band has 3 lanes.** A fourth cat cannot hold a lane, so
   `LANE_CATS` + `SPECTATOR_CATS` split the cast; spectators sit side stage.
4. **Trick tables are indexed by cast order.** Acrobatic tricks read
   `param(TABLE, i)`, which reuses the last entry for any extra cat, so a new cat
   performs with no trick changes — but the tables should still grow so the
   newcomer is not a clone.
5. Games that spawn cats by hand (`CatHiddenToys`, `CatSkyWonders`) need a new
   entry; nothing will catch it.
6. Re-check that nobody overlaps on a crowded stage.

## Current Focus

Six mini-games. Three are now skill-based (Fishing, Music Band, Cat Hunt) and
Cat Hunt finally lets the player steer a cat. Next candidates: a platformer
(gravity, jump physics, platform collision) and a maze (procedural walls, path
collision) — both are the remaining "control the cat" ideas. Still missing:
scores shared across games and sound settings. Adding a cat is just a preset.

## Quick Start Guide

### To add a new cat:
1. Add a `CatPreset` entry to `CAT_PRESETS` in `src/characters/cats.ts`
2. Add the id to the `CatId` union in `src/characters/types.ts`
3. Spawn it in a game with `id` and render with `getCatPreset(cat.id)` + `drawCat`

### To add a new game:

1. Create game component in `src/components/NewGame.tsx`
2. Create route at `src/app/games/new-game/page.tsx`
3. Add game card to `src/app/page.tsx` games array
4. Draw cats via `drawCat(ctx, { preset: getCatPreset(cat.id), x, y, ... })` — never inline sprite code

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe
- [ ] Add more mini-games

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| 2026-02-14 | Added 2D Cat Acrobatics game with two cats and 8 tricks |
| 2026-02-14 | Added main menu and Cat Music Band game with 8 instruments |
| 2026-02-14 | Added Hidden Toys game with 5 hiding spots and 6 toy types |
| 2026-02-14 | Added Sky Wonders game with magic rain and catching mechanics |
| 2026-02-14 | Reduced cat movement speed in Hidden Toys for smoother animation |
| 2026-02-14 | Fixed back buttons in Hidden Toys and Sky Wonders to match other games |
| 2026-02-14 | Added trick-specific sounds to Cat Acrobatics game |
| 2026-02-14 | Replaced Music Band sounds with short musical melodies |
| 2026-02-14 | Translated all game text to Russian language |
| 2026-02-14 | Fixed Sky Wonders: items now fall correctly, cats renamed to Miuska/Aliska |
| 2026-02-14 | Unified cat design across all games, fixed "Back to menu" button |
| 2026-02-14 | Unified cat design in CatGame.tsx and CatMusicBand.tsx based on CatSkyWonders.tsx |
| 2026-09-27 | Refactored architecture: cats moved to `src/characters/` (shared renderer `drawCat`, palette `CAT_COLORS`, motion `CAT_MOTION`, presets `CAT_PRESETS`). Removed ~4 copies of the 190-line sprite from the games. Fixed legacy Миднайт/Орео names. Verified all 26 render paths produce identical canvas geometry to the originals |
| 2026-09-27 | Added third cat **Вики** (grey kitten, brown eyes, scale 0.75) to all four games. `CatGame`/`CatMusicBand` switched from two hardcoded cat refs to a `catsRef` array + `STAGE_MARKS`; tricks now receive `cats: Cat[]` so all three cats perform. Fixed `CatHiddenToys` seeker hardcoded to `Math.random() > 0.5 ? 0 : 1`, which excluded the third cat. Added `castNames()` for prose |
| 2026-09-27 | Added 5th mini-game **Кошачья Рыбалка** (`/games/fishing`) — the first skill/timing game with a score, a streak multiplier and a persisted best. Extracted the AudioContext that was copy-pasted in all 4 games into `src/lib/audio.ts` (`getAudioContext`, `playTone`, `playSequence`). Added a cast line to `CatHiddenToys`, which was the only game whose UI named no cats |
| 2026-09-27 | Added fourth cat **Яшка** (black kitten, grey-blue tail, ice-blue eyes, scale 0.65) to all six games. Added optional `colors.tail` to the character system so a cat can have a differently-coloured tail. Split the music band into `LANE_CATS` + `SPECTATOR_CATS` (3 lanes, 4 cats) and gave the chase game a third spectator. Rewrote the 8 acrobatics tricks to read per-cat parameter tables so the whole cast performs — verified against the originals to be identical for the first three cats. Fixed SkyWonders jump targets, which assumed 3 cats and would have sent the 4th off-canvas |
| 2026-09-27 | Added 6th mini-game **Кот-Охотник** (`/games/hunt`) — the first game where the player steers a cat: mouse or WASD/arrows, 60s round, mice that flee and bounce off walls, rare golden mouse, combo multiplier, wall clock timer. Алиска and Вики sit on the couch watching. Rules live in `src/components/cat-hunt.ts`. Raised the combo step from 4 to 6 catches after tests showed the ×5 cap was reachable in 16 catches |
| 2026-09-27 | Rebuilt **Кошачий Оркестр** as a 3-lane rhythm game (was the dullest: press Space → 2s of canned animation, no input during it, no score). Each cat now owns a lane + instrument; notes fall on a 16th grid; Perfect/Good judgement, combo multiplier, accuracy grade, persisted best. Song data and judgement rules live in `src/components/music-song.ts` so the generator is testable without a browser. Moved the hit line to y=250 and the key hints to the lane header after tests showed key caps would be hidden behind the cats |
