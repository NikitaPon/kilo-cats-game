/**
 * Song data and judgement rules for the rhythm game in `CatMusicBand.tsx`.
 *
 * Kept separate from the component so the chart generator and the scoring rules
 * can be exercised without a browser.
 */

import { CAT_PRESETS, type CatId } from "@/characters";

export const LANE_COUNT = 3;

/** Tempo of the backing track. */
export const BPM = 100;
export const BEAT = 60 / BPM;
export const STEPS_PER_BEAT = 4;
export const STEP = BEAT / STEPS_PER_BEAT;
export const BARS = 12;
export const STEPS_PER_BAR = STEPS_PER_BEAT * 4;
export const SONG_LENGTH = BARS * 4 * BEAT;

/** Countdown before the first note, in seconds. */
export const LEAD_IN = 2.2;

/** How long a note is on screen before it reaches the hit line, in seconds. */
export const APPROACH = 1.8;

/** Timing windows, in seconds. */
export const PERFECT_WINDOW = 0.06;
export const GOOD_WINDOW = 0.13;

/** Notes closer together than this in one lane are impossible to hit. */
export const MIN_LANE_GAP = 0.2;

/**
 * Where the hit line sits, in canvas pixels. Kept above the cats' heads (the
 * tallest ear tip reaches y = 274 at 500px tall) so it is never occluded.
 */
export const HIT_LINE_Y = 250;
/** Tall enough to read, short enough that consecutive notes do not merge. */
export const NOTE_HEIGHT = 36;
/** Ear tip in unit space, used to check the hit line clears the cats. */
export const EAR_TIP_Y = 55;
/** Notes spawn just above the top of the canvas. */
export const SPAWN_Y = -NOTE_HEIGHT;

export const PERFECT_SCORE = 100;
export const GOOD_SCORE = 50;
export const MAX_MULTIPLIER = 4;

export type Judgement = "perfect" | "good" | "miss";

export interface ChartNote {
  /** Seconds from the start of the song. */
  time: number;
  lane: number;
}

export interface LaneInstrument {
  /** Cat that plays this lane. */
  catId: CatId;
  name: string;
  emoji: string;
  color: string;
  /** Single note played when the player hits this lane. */
  hit: { frequency: number; type: OscillatorType; duration: number; volume?: number; slideTo?: number };
  /** Short jingle played when the song starts. */
  intro: { frequency: number; type: OscillatorType; duration: number }[];
}

/** Left, centre and right — lanes line up with the cats' stage marks. */
export const LANE_INSTRUMENTS: LaneInstrument[] = [
  {
    catId: "Miuska",
    name: "Гитара",
    emoji: "🎸",
    color: "#CD853F",
    hit: { frequency: 330, type: "sawtooth", duration: 0.16, volume: 0.16, slideTo: 247 },
    intro: [
      { frequency: 196, type: "sawtooth", duration: 0.14 },
      { frequency: 247, type: "sawtooth", duration: 0.14 },
      { frequency: 294, type: "sawtooth", duration: 0.14 },
    ],
  },
  {
    catId: "Viki",
    name: "Колокольчик",
    emoji: "🔔",
    color: "#FFD700",
    hit: { frequency: 1047, type: "sine", duration: 0.28, volume: 0.14 },
    intro: [
      { frequency: 880, type: "sine", duration: 0.13 },
      { frequency: 1047, type: "sine", duration: 0.13 },
      { frequency: 1319, type: "sine", duration: 0.13 },
    ],
  },
  {
    catId: "Aliska",
    name: "Труба",
    emoji: "🎺",
    color: "#FF6B4D",
    hit: { frequency: 392, type: "square", duration: 0.18, volume: 0.13 },
    intro: [
      { frequency: 294, type: "square", duration: 0.12 },
      { frequency: 370, type: "square", duration: 0.12 },
      { frequency: 440, type: "square", duration: 0.12 },
    ],
  },
];

export const CANVAS_HEIGHT = 500;

/** Stage marks per cat, relative to the canvas centre / bottom edge. */
export const STAGE_MARKS: Record<CatId, { x: number; y: number }> = {
  Miuska: { x: -140, y: -150 },
  Aliska: { x: 140, y: -160 },
  Viki: { x: 0, y: -137 },
};

/** Y of a cat's body centre, so its feet land on the stage floor. */
export const stageY = (id: CatId) => CANVAS_HEIGHT + STAGE_MARKS[id].y;

/** Top of a cat's ears in canvas pixels — the hit line must stay above it. */
export const earTipY = (id: CatId) => stageY(id) - EAR_TIP_Y * CAT_PRESETS[id].scale;

/** Lane index of each cat, so notes land on the cat that plays them. */
export const LANE_BY_CAT: Record<CatId, number> = {
  Miuska: 0,
  Viki: 1,
  Aliska: 2,
};

/** Keyboard codes that trigger each lane, for desktop play. */
export const LANE_KEYS: string[][] = [
  ["KeyA", "ArrowLeft", "Digit1", "KeyF"],
  ["KeyS", "ArrowDown", "Digit2", "KeyG"],
  ["KeyD", "ArrowRight", "Digit3", "KeyH"],
];

const LANE_LABELS = ["A", "S", "D"];

export const laneLabel = (lane: number) => LANE_LABELS[lane] ?? "?";

/** Note density per two bars, ramping up through the song. */
const DENSITY = [0.24, 0.32, 0.4, 0.5, 0.58, 0.66];

/**
 * Builds a playable chart. Notes sit on a 16th-note grid, never repeat a lane
 * inside `MIN_LANE_GAP`, and get denser as the song goes on.
 */
export function buildChart(random: () => number = Math.random): ChartNote[] {
  const notes: ChartNote[] = [];
  const lastAt = [-Infinity, -Infinity, -Infinity];
  const totalSteps = BARS * STEPS_PER_BAR;

  for (let step = 0; step < totalSteps; step++) {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const time = step * STEP;
    const density = DENSITY[Math.min(DENSITY.length - 1, Math.floor(bar / 2))];
    if (random() > density) continue;

    const isChord = bar >= 6 && random() < 0.18;
    const lanes = isChord ? pickTwoLanes(lastAt, time, random) : [pickLane(lastAt, time, random)];
    for (const lane of lanes) {
      if (lane === null) continue;
      notes.push({ time, lane });
      lastAt[lane] = time;
    }
  }

  // A degenerate roll must still produce a playable song.
  if (notes.length < 20) return buildChart(fallbackRandom(notes.length));
  return notes;
}

function pickLane(lastAt: number[], time: number, random: () => number): number | null {
  const options = [0, 1, 2].filter((lane) => time - lastAt[lane] >= MIN_LANE_GAP);
  if (options.length === 0) return null;
  return options[Math.floor(random() * options.length)];
}

function pickTwoLanes(lastAt: number[], time: number, random: () => number): (number | null)[] {
  const first = pickLane(lastAt, time, random);
  if (first === null) return [];
  const rest = [0, 1, 2].filter((lane) => lane !== first && time - lastAt[lane] >= MIN_LANE_GAP);
  if (rest.length === 0 || random() > 0.5) return [first];
  return [first, rest[Math.floor(random() * rest.length)]];
}

/** Deterministic randomness so a too-easy chart is never generated twice badly. */
function fallbackRandom(seed: number): () => number {
  let state = seed * 2654435761 + 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** How a hit lands relative to the note. */
export function judge(offset: number): Judgement | null {
  const distance = Math.abs(offset);
  if (distance <= PERFECT_WINDOW) return "perfect";
  if (distance <= GOOD_WINDOW) return "good";
  return null;
}

export const judgementScore = (result: Judgement) =>
  result === "perfect" ? PERFECT_SCORE : result === "good" ? GOOD_SCORE : 0;

/** Combo multiplier, capped. */
export const comboMultiplier = (combo: number) => Math.min(1 + Math.floor(combo / 10), MAX_MULTIPLIER);

export interface Summary {
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  missed: number;
  total: number;
  accuracy: number;
  grade: string;
}

/** Accuracy treats a "good" as half a perfect, so precision is rewarded. */
export function summarise(state: {
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  missed: number;
  total: number;
}): Summary {
  const accuracy = state.total === 0 ? 0 : ((state.perfect + state.good * 0.5) / state.total) * 100;
  const grade =
    accuracy >= 95 ? "S" : accuracy >= 85 ? "A" : accuracy >= 70 ? "B" : accuracy >= 50 ? "C" : "D";
  return {
    score: state.score,
    maxCombo: state.maxCombo,
    perfect: state.perfect,
    good: state.good,
    missed: state.missed,
    total: state.total,
    accuracy,
    grade,
  };
}

/** Backing track: a bass note on every half bar and a click on every eighth. */
export function buildBackingTrack(): { frequency: number; type: OscillatorType; duration: number; volume: number; time: number }[] {
  const track: { frequency: number; type: OscillatorType; duration: number; volume: number; time: number }[] = [];
  const bass = [130.81, 110, 98, 123.47];
  for (let bar = 0; bar < BARS; bar++) {
    const root = bass[Math.floor(bar / 3) % bass.length];
    track.push({ frequency: root, type: "triangle", duration: BEAT * 1.4, volume: 0.09, time: bar * 4 * BEAT });
    track.push({ frequency: root * 1.5, type: "triangle", duration: BEAT * 0.9, volume: 0.07, time: (bar * 4 + 2) * BEAT });
    for (let eighth = 0; eighth < 8; eighth++) {
      track.push({
        frequency: eighth % 2 === 0 ? 2400 : 1800,
        type: "square",
        duration: 0.03,
        volume: eighth % 2 === 0 ? 0.03 : 0.02,
        time: (bar * 4 + eighth * 0.5) * BEAT,
      });
    }
  }
  // Emitted in time order so the schedule reads like a score.
  return track.sort((a, b) => a.time - b.time);
}
