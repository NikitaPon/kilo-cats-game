/**
 * Rules for the cat-and-mice chase in `CatHunt.tsx`.
 *
 * Kept separate from the component so the room geometry, the catch test and the
 * difficulty curve can be exercised without a browser.
 */

import { CAT_PRESETS, type CatId } from "@/characters";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;

/** Length of one round, in seconds. */
export const ROUND_SECONDS = 60;

export const WALL_HEIGHT = 250;
export const BASEBOARD_HEIGHT = 16;

/** Lowest point of a cat sprite in unit space, used to keep paws on the floor. */
export const CAT_FOOT_OFFSET = 53;

/** Furthest a cat of this size can go before its paws leave the canvas. */
export const maxAnchorY = (id: CatId) => CANVAS_HEIGHT - CAT_FOOT_OFFSET * CAT_PRESETS[id].scale;

/** Where the player's cat may walk, in canvas pixels. */
export const ROOM = {
  left: 80,
  right: CANVAS_WIDTH - 80,
  top: 310,
  // The biggest cat sets the limit, so nobody's paws clip the canvas edge.
  bottom: Math.min(430, maxAnchorY("Aliska")),
};

/** Where mice may run — a touch wider than the cat's area. */
export const MOUSE_BOUNDS = {
  left: 40,
  right: CANVAS_WIDTH - 40,
  top: 290,
  bottom: 455,
};

export const CAT_SPEED = 420;
/** How quickly the cat reaches its target velocity, per second. */
export const CAT_ACCEL = 12;
/** The cat leans this much at full speed. */
export const CAT_LEAN = 0.16;
/** The cat pounces when this close to a mouse, in pixels. */
export const CATCH_RADIUS = 34;

export const MOUSE_BASE_SPEED = 150;
export const MOUSE_SPEED_GROWTH = 110;
export const MOUSE_FLEE_DISTANCE = 190;
export const MOUSE_TURN_INTERVAL = 0.9;

export const REGULAR_MOUSE = { points: 10, radius: 9, color: "#9E9E9E", ear: "#F2B8B5" };
export const GOLDEN_MOUSE = { points: 50, radius: 11, color: "#FFD700", ear: "#FFECB3" };

export const SPAWN_INTERVAL_START = 1.5;
export const SPAWN_INTERVAL_END = 0.55;
export const MAX_ALIVE_START = 3;
export const MAX_ALIVE_END = 7;
export const GOLDEN_CHANCE_START = 0.08;
export const GOLDEN_CHANCE_END = 0.16;

/** Catches needed per multiplier step — a 24-catch streak reaches the cap. */
export const COMBO_STEP = 6;
export const MAX_MULTIPLIER = 5;

/** Spectator cats sit on the couch, scaled down to read as further back. */
export const COUCH = { y: 150, bottom: 250, scale: 0.7 };

export type MouseKind = "regular" | "golden";

export interface Mouse {
  kind: MouseKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds left before it picks a new heading while wandering. */
  turnIn: number;
  /** 0..1, scales the little tail wiggle. */
  wiggle: number;
  facing: number;
}

export const mousePoints = (kind: MouseKind) =>
  kind === "golden" ? GOLDEN_MOUSE.points : REGULAR_MOUSE.points;

export const mouseRadius = (kind: MouseKind) =>
  kind === "golden" ? GOLDEN_MOUSE.radius : REGULAR_MOUSE.radius;

export const mouseColor = (kind: MouseKind) =>
  kind === "golden" ? GOLDEN_MOUSE.color : REGULAR_MOUSE.color;

export const mouseEarColor = (kind: MouseKind) =>
  kind === "golden" ? GOLDEN_MOUSE.ear : REGULAR_MOUSE.ear;

/** Combo multiplier, capped. */
export const comboMultiplier = (combo: number) =>
  Math.min(1 + Math.floor(combo / COMBO_STEP), MAX_MULTIPLIER);

export const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

export interface Area {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Keeps a point inside an area. */
export function clampToArea(x: number, y: number, area: Area): { x: number; y: number } {
  return {
    x: clamp(x, area.left, area.right),
    y: clamp(y, area.top, area.bottom),
  };
}

/** True when the cat is close enough to snap the mouse up. */
export function canCatch(
  catX: number,
  catY: number,
  mouseX: number,
  mouseY: number,
  kind: MouseKind
): boolean {
  const reach = CATCH_RADIUS + mouseRadius(kind);
  return Math.hypot(catX - mouseX, catY - mouseY) <= reach;
}

/** How hard the round is at `elapsed` seconds — 0 at the start, 1 at the end. */
export const difficulty = (elapsed: number) => clamp(elapsed / ROUND_SECONDS, 0, 1);

/** Mouse speed, in pixels per second. */
export const mouseSpeed = (elapsed: number) =>
  MOUSE_BASE_SPEED + MOUSE_SPEED_GROWTH * difficulty(elapsed);

/** Seconds between spawns. */
export const spawnInterval = (elapsed: number) =>
  SPAWN_INTERVAL_START + (SPAWN_INTERVAL_END - SPAWN_INTERVAL_START) * difficulty(elapsed);

/** How many mice may be on the floor at once. */
export const maxAlive = (elapsed: number) =>
  Math.round(MAX_ALIVE_START + (MAX_ALIVE_END - MAX_ALIVE_START) * difficulty(elapsed));

/** Chance that a spawn is the valuable golden mouse. */
export const goldenChance = (elapsed: number) =>
  GOLDEN_CHANCE_START + (GOLDEN_CHANCE_END - GOLDEN_CHANCE_START) * difficulty(elapsed);

/** Seconds left in the round. */
export const timeLeft = (elapsed: number) => Math.max(0, ROUND_SECONDS - elapsed);

/** Progress of the round, 0..1 — drives the wall clock hand. */
export const roundProgress = (elapsed: number) => clamp(elapsed / ROUND_SECONDS, 0, 1);

/** The three cats: one plays, two watch from the couch. */
export const PLAYER_CAT: CatId = "Miuska";
export const SPECTATORS: CatId[] = ["Aliska", "Viki", "Yashka"];

/** Where a spectator sits on the couch. */
export function spectatorPosition(id: CatId): { x: number; y: number } {
  const index = SPECTATORS.indexOf(id);
  const centre = COUCH.bottom - 20;
  const spread = 170;
  return {
    x: CANVAS_WIDTH / 2 + (index - (SPECTATORS.length - 1) / 2) * spread,
    y: centre,
  };
}

export interface Summary {
  score: number;
  caught: number;
  golden: number;
  maxCombo: number;
  seconds: number;
  grade: string;
}

/** Grades a finished round on how much of the floor was covered. */
export function summarise(state: {
  score: number;
  caught: number;
  golden: number;
  maxCombo: number;
}): Summary {
  // Reaching ~1.4 catches a second is a full house for a minute of hunting.
  const pace = state.caught / ROUND_SECONDS;
  const grade =
    pace >= 1.4 ? "S" : pace >= 1.1 ? "A" : pace >= 0.85 ? "B" : pace >= 0.55 ? "C" : "D";
  return {
    score: state.score,
    caught: state.caught,
    golden: state.golden,
    maxCombo: state.maxCombo,
    seconds: ROUND_SECONDS,
    grade,
  };
}
