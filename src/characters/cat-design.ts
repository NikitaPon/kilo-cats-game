/**
 * Design tokens shared by every cat sprite.
 *
 * Changing a color or a motion curve here updates all mini-games at once.
 */

/** Colors every cat shares, regardless of preset. */
export const CAT_COLORS = {
  /** Solid black coat shared by both cats. */
  fur: "#1a1a1a",
  /** White markings for patched cats. */
  markings: "#f5f5f5",
  innerEar: "#FFB6C1",
  nose: "#FFB6C1",
  eyeWhite: "#FFFFFF",
  pupil: "#000000",
  mouth: "#333",
  whisker: "#666",
  star: "#FFD700",
} as const;

/** Motion curves for the shared cat sprite. */
export const CAT_MOTION = {
  /** Idle tail wag: `sin(time * tailWagSpeed) * tailWagAmplitude`. */
  tailWagSpeed: 3,
  tailWagAmplitude: 0.2,
  /** Faster, wider wag used while a cat performs. */
  activeTailWagSpeed: 3,
  activeTailWagSpeedBoost: 10,
  activeTailWagAmplitude: 0.3,
  /** Front paw bop while playing an instrument. */
  pawBopCycles: 4,
  pawBopRange: 8,
} as const;
