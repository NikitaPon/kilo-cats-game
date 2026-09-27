/**
 * Shared types for every cat character used across the mini-games.
 *
 * A game only owns the *actor state* (position, trick progress, AI targets).
 * Everything visual — colors, proportions, motion — is described once here and
 * rendered by `drawCat`, so a cat looks identical in every mini-game.
 */

export type CatId = "Miuska" | "Aliska" | "Viki";

/** Colors a single cat is drawn with. */
export interface CatColors {
  /** Main coat color. */
  fur: string;
  /**
   * Belly / paws / face blaze color.
   * `null` means the cat is a solid single-color cat with no markings.
   */
  markings: string | null;
  /** Iris color. */
  eyes: string;
  innerEar: string;
  nose: string;
  eyeWhite: string;
  pupil: string;
  mouth: string;
  whisker: string;
}

/** Face expression, applied on top of the shared sprite. */
export type CatExpression = "neutral" | "squint" | "happy";

/** A cat character definition — the single source of truth for its look. */
export interface CatPreset {
  id: CatId;
  /** Latin name used as the id. */
  name: string;
  /** Russian name shown to the player. */
  displayName: string;
  /** Short Russian description used in UI copy. */
  description: string;
  colors: CatColors;
  /** Size multiplier applied to the unit sprite. */
  scale: number;
  /** Nominal bounding box of the cat, in canvas pixels. */
  width: number;
  height: number;
  /** Balloon color used by the "Превращение в шарики!" trick. */
  balloonColor: string;
}

/**
 * Minimal per-game actor state every mini-game has in common.
 * Games extend this with their own fields and pass it to `drawCat`.
 */
export interface CatActor {
  id: CatId;
  x: number;
  y: number;
}

/** Placement + animation inputs for a single sprite draw. */
export interface CatSpriteOptions {
  preset: CatPreset;
  /** Anchor position in canvas coordinates (feet/center of the cat). */
  x: number;
  y: number;
  /** Extra multipliers on top of `preset.scale` (trick squash & stretch). */
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
  /** Seconds; drives the idle tail wag when `tailWag` is not provided. */
  time?: number;
  /** Explicit tail angle in radians. Falls back to the idle wag. */
  tailWag?: number;
  /** Amplitude of the automatic idle tail wag. */
  tailWagAmplitude?: number;
  /** Horizontal shift of the front paws, used for the "playing" bop. */
  pawOffset?: number;
  expression?: CatExpression;
  blinking?: boolean;
}
