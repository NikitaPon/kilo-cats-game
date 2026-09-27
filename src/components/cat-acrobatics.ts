/**
 * Tricks for the acrobatics game in `CatGame.tsx`.
 *
 * Every trick receives the whole cast and drives all of it, using per-cat
 * parameter tables indexed in cast order. Adding a cat therefore needs no
 * change here — the tables simply grow, and any cat past the end reuses the
 * last entry.
 */

import { CAT_IDS, getCatPreset, type CatId } from "@/characters";

export interface AcrobatCat {
  x: number;
  y: number;
  baseY: number;
  id: CatId;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  isBalloon: boolean;
  hasStar: boolean;
  starY: number;
  starOpacity: number;
}

export interface Trick {
  name: string;
  duration: number;
  sound: "jump" | "spin" | "balloon" | "star" | "stack" | "swim" | "rocket" | "dance";
  execute: (progress: number, cats: AcrobatCat[]) => void;
}

/** Stage marks per cat, relative to the canvas centre / bottom edge. */
export const STAGE_MARKS: Record<CatId, { x: number; y: number }> = {
  Miuska: { x: -190, y: -150 },
  Aliska: { x: 190, y: -160 },
  Viki: { x: -63, y: -137 },
  Yashka: { x: 63, y: -134 },
};


/**
 * Per-cat trick parameters, indexed in cast order (Miuska, Aliska, Viki,
 * Yashka). Any extra cat reuses the last entry, so the whole cast performs
 * every trick without the tables having to grow.
 */
const param = (table: number[], index: number) => table[Math.min(index, table.length - 1)];

const JUMP_LIFT = [150, 120, 110, 95];
const JUMP_SPIN = [0.3, -0.3, 0.25, -0.22];
const JUMP_STRETCH = [0.2, 0.15, 0.18, 0.14];

const SOMERSAULT_TURNS = [4, -4, 3, -3.5];
const SOMERSAULT_BOUNCE = [100, 80, 90, 70];
const SOMERSAULT_FREQ = [4, 4, 3, 3.5];
const SOMERSAULT_PHASE = [0, 0.5, 0, 0.4];

const FLOAT_HEIGHT = [100, 80, 70, 60];
const FLOAT_PHASE = [0, 1, 2, 3];
const FLOAT_DRIFT = [2, -2, 1.5, -1.5];
const FLOAT_DRIFT_PHASE = [0, 0, 1, 2];

const REACH_HEIGHT = [30, 25, 28, 22];
const REACH_SPIN = [0.2, -0.2, 0.25, -0.22];
const CHEER_HEIGHT = [50, 40, 45, 35];
const CHEER_PHASE = [0, 0.5, 1, 1.5];

const SWIM_BASE = [50, 40, 30, 25];
const SWIM_WAVE = [30, -30, -20, 15];
const SWIM_SPIN = [0.4, -0.4, -0.3, 0.25];
const SWIM_STRETCH = [0.1, 0.1, 0.12, 0.1];
const SWIM_DRIFT = [2, -2, 1, -1];
const SWIM_DRIFT_PHASE = [0, 0, 1, 2];

const ROCKET_HEIGHT = [200, 180, 210, 160];
const ROCKET_SPIN = [0.3, -0.3, 0.25, -0.22];

const DANCE_SPIN = [0.5, -0.5, 0.45, -0.4];
const DANCE_SCALE = [0.1, -0.1, 0.15, -0.12];
const DANCE_HOP = [30, 30, 40, 35];
const DANCE_SWAY = [0.5, -0.5, 0.4, -0.45];

/** The acts, in the order the menu offers them. */
export const TRICKS: Trick[] = [

    {
      name: "Двойной прыжок и Дай пять!",
      duration: 2000,
      sound: "jump",
      execute: (progress, cats) => {
        // Every cat jumps, each to its own height and spin.
        const jumpPhase = Math.sin(progress * Math.PI);
        cats.forEach((cat, i) => {
          cat.y = cat.baseY - jumpPhase * param(JUMP_LIFT, i);
          cat.rotation = Math.sin(progress * Math.PI * 2) * param(JUMP_SPIN, i);
          cat.scaleY = 1 + jumpPhase * param(JUMP_STRETCH, i);
        });
      },
    },
    {
      name: "Сальто-симфония!",
      duration: 2500,
      sound: "spin",
      execute: (progress, cats) => {
        // Full rotation somersaults, each at its own tempo.
        const bounce = Math.abs(Math.sin(progress * Math.PI * 2));
        cats.forEach((cat, i) => {
          cat.rotation = progress * Math.PI * param(SOMERSAULT_TURNS, i);
          cat.y = cat.baseY - bounce * param(SOMERSAULT_BOUNCE, i);
          const squash = Math.sin(progress * Math.PI * param(SOMERSAULT_FREQ, i) + param(SOMERSAULT_PHASE, i)) * 0.2;
          cat.scaleX = 1 + squash;
          cat.scaleY = 1 - squash;
        });
      },
    },
    {
      name: "Превращение в шарики!",
      duration: 3000,
      sound: "balloon",
      execute: (progress, cats) => {
        // Transform into balloons
        if (progress < 0.3) {
          // Inflate
          const inflate = progress / 0.3;
          cats.forEach((cat) => {
            cat.isBalloon = true;
            cat.scaleX = 1 + inflate * 0.3;
            cat.scaleY = 1 + inflate * 0.5;
          });
        } else if (progress < 0.7) {
          // Float around
          const floatProgress = (progress - 0.3) / 0.4;
          cats.forEach((cat, i) => {
            const height = param(FLOAT_HEIGHT, i);
            cat.y =
              cat.baseY - height - Math.sin(floatProgress * Math.PI * 3 + param(FLOAT_PHASE, i)) * 30;
            cat.x += Math.sin(floatProgress * Math.PI * 2 + param(FLOAT_DRIFT_PHASE, i)) * param(FLOAT_DRIFT, i);
          });
        } else {
          // Deflate back
          const deflate = 1 - (progress - 0.7) / 0.3;
          cats.forEach((cat, i) => {
            cat.scaleX = 1 + deflate * 0.3;
            cat.scaleY = 1 + deflate * 0.5;
            cat.y = cat.baseY - deflate * param(FLOAT_HEIGHT, i);
          });
          if (progress > 0.95) {
            cats.forEach((cat) => {
              cat.isBalloon = false;
            });
          }
        }
      },
    },
    {
      name: "Ловля звёзд!",
      duration: 2500,
      sound: "star",
      execute: (progress, cats) => {
        // Stars fall and cats catch them
        if (progress < 0.5) {
          // Stars falling
          cats.forEach((cat) => {
            cat.hasStar = true;
            cat.starY = -50 + progress * 2 * 250;
            cat.starOpacity = 1;
          });

          // Cats reach up
          const reach = Math.sin(progress * Math.PI * 2);
          cats.forEach((cat, i) => {
            cat.y = cat.baseY - reach * param(REACH_HEIGHT, i);
            cat.rotation = reach * param(REACH_SPIN, i);
          });
        } else {
          // Caught! Celebrate
          const celebrate = (progress - 0.5) / 0.5;
          cats.forEach((cat) => {
            cat.starY = 0;
            cat.starOpacity = 1 - celebrate;
          });

          // Happy bounce
          cats.forEach((cat, i) => {
            const bounce = Math.abs(
              Math.sin(celebrate * Math.PI * 3 + param(CHEER_PHASE, i))
            );
            cat.y = cat.baseY - bounce * param(CHEER_HEIGHT, i);
          });

          if (progress > 0.9) {
            cats.forEach((cat) => {
              cat.hasStar = false;
            });
          }
        }
      },
    },
    {
      name: "Кошачья башня!",
      duration: 2000,
      sound: "stack",
      execute: (progress, [climber, base, ...watchers]) => {
        // One cat jumps on top of the other
        if (progress < 0.4) {
          // Preparation - cats move together
          const prep = progress / 0.4;
          climber.x = climber.x + (base.x - climber.x) * prep * 0.3;
          climber.y = climber.baseY - prep * 100;
          base.scaleY = 0.8 + prep * 0.2;
        } else if (progress < 0.7) {
          // Landing on top
          const land = (progress - 0.4) / 0.3;
          climber.y = base.baseY - getCatPreset(base.id).height - 20 + land * 20;
          climber.rotation = land * Math.PI * 2;
          base.scaleY = 0.8;
        } else {
          // Jump off
          const off = (progress - 0.7) / 0.3;
          climber.y = climber.baseY - Math.sin(off * Math.PI) * 80;
          climber.rotation = off * Math.PI * 2;
          base.scaleY = 0.8 + off * 0.2;
        }
        // Everyone else watches the tower eagerly
        watchers.forEach((cat, i) => {
          const watch = Math.sin(progress * Math.PI * 3 + i * 0.8);
          cat.rotation = watch * 0.15;
          cat.y = cat.baseY - Math.abs(watch) * 18;
        });
      },
    },
    {
      name: "Синхронное плавание!",
      duration: 2500,
      sound: "swim",
      execute: (progress, cats) => {
        // Wave-like swimming motion
        const wave = Math.sin(progress * Math.PI * 4);
        cats.forEach((cat, i) => {
          cat.y = cat.baseY - param(SWIM_BASE, i) + wave * param(SWIM_WAVE, i);
          cat.rotation = wave * param(SWIM_SPIN, i);
          cat.x = cat.x + Math.cos(progress * Math.PI * 2 + param(SWIM_DRIFT_PHASE, i)) * param(SWIM_DRIFT, i);

          // Stretch for swimming effect
          cat.scaleX = 1 + Math.abs(wave) * param(SWIM_STRETCH, i);
        });
      },
    },
    {
      name: "Ракетный запуск!",
      duration: 2000,
      sound: "rocket",
      execute: (progress, cats) => {
        if (progress < 0.3) {
          // Crouch down
          const crouch = progress / 0.3;
          cats.forEach((cat) => {
            cat.scaleY = 1 - crouch * 0.3;
            cat.y = cat.baseY + crouch * 20;
          });
        } else if (progress < 0.6) {
          // Launch up!
          const launch = (progress - 0.3) / 0.3;
          cats.forEach((cat, i) => {
            const height = param(ROCKET_HEIGHT, i);
            cat.scaleY = 1.3;
            cat.y = cat.baseY - launch * height;
            cat.rotation = launch * param(ROCKET_SPIN, i);
          });
        } else {
          // Fall back
          const fall = (progress - 0.6) / 0.4;
          cats.forEach((cat, i) => {
            const height = param(ROCKET_HEIGHT, i);
            cat.y = cat.baseY - height + fall * height;
            cat.rotation = (1 - fall) * param(ROCKET_SPIN, i);
            cat.scaleY = 1.3 - fall * 0.3;
          });
        }
      },
    },
    {
      name: "Зеркальный танец!",
      duration: 2000,
      sound: "dance",
      execute: (progress, cats) => {
        // Mirror each other's movements
        const dance = Math.sin(progress * Math.PI * 6);
        cats.forEach((cat, i) => {
          cat.rotation = dance * param(DANCE_SPIN, i);
          cat.scaleX = 1 + dance * param(DANCE_SCALE, i);
          cat.y = cat.baseY - Math.abs(dance) * param(DANCE_HOP, i);

          // Slight position mirroring
          cat.x = cat.x + dance * param(DANCE_SWAY, i);
        });
      },
    },
];

/** The full cast that performs on this stage. */
export const CAST = CAT_IDS;
