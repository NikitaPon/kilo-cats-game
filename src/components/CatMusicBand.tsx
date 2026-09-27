"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { CAT_MOTION, catName, drawCat as drawCatSprite, getCatPreset } from "@/characters";
import type { CatActor } from "@/characters";
import { playSequence, playTone } from "@/lib/audio";
import {
  APPROACH,
  BEAT,
  CANVAS_HEIGHT,
  GOOD_WINDOW,
  HIT_LINE_Y,
  LANE_BY_CAT,
  LANE_COUNT,
  LANE_CATS,
  LANE_INSTRUMENTS,
  LANE_KEYS,
  LEAD_IN,
  NOTE_HEIGHT,
  SONG_LENGTH,
  SPAWN_Y,
  SPECTATOR_CATS,
  SPECTATOR_SPOT,
  STAGE_MARKS,
  buildBackingTrack,
  buildChart,
  comboMultiplier,
  judge,
  judgementScore,
  laneLabel,
  summarise,
  type ChartNote,
  type Judgement,
  type LaneCatId,
  type Summary,
} from "./music-song";

/** Only the lane cats get an actor; spectators have no lane to play. */
interface Cat extends Omit<CatActor, "id"> {
  id: LaneCatId;
  /** 0..1, decays after each hit. Drives the squash and the happy face. */
  strike: number;
}

type Phase = "idle" | "countdown" | "playing" | "results";

interface LiveNote extends ChartNote {
  state: "pending" | "hit" | "missed";
  /** Song time when the note was resolved, for the pop animation. */
  resolvedAt: number;
}

interface Burst {
  x: number;
  y: number;
  emoji: string;
  color: string;
  life: number;
  drift: number;
  rise: number;
}

interface LaneFlash {
  life: number;
  judgement: Judgement | null;
  /** True when the player tapped a lane with no note in range. */
  stray: boolean;
}

interface GameState {
  phase: Phase;
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  missed: number;
  total: number;
  songTime: number;
  summary: Summary | null;
}

const BEST_KEY = "cat-music-band-best";
const NOTE_EMOJIS = ["🎵", "🎶", "🎼", "♪", "♫", "✨"];

const initialState = (best: number): GameState => ({
  phase: "idle",
  score: 0,
  best,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  missed: 0,
  total: 0,
  songTime: -LEAD_IN,
  summary: null,
});

const laneX = (lane: number, width: number) => width / 2 + STAGE_MARKS[LANE_INSTRUMENTS[lane].catId].x;
const laneWidth = (width: number) => Math.min(112, (width / LANE_COUNT) * 0.86);

/** Y of a note that arrives at `noteTime` while the song is at `songTime`. */
const noteY = (noteTime: number, songTime: number) => {
  const pixelsPerSecond = (HIT_LINE_Y - SPAWN_Y) / APPROACH;
  return HIT_LINE_Y - (noteTime - songTime) * pixelsPerSecond;
};

const createCat = (id: LaneCatId, width: number, height: number): Cat => ({
  id,
  x: width / 2 + STAGE_MARKS[id].x,
  y: height + STAGE_MARKS[id].y,
  strike: 0,
});

/** Which lane a pointer at canvas `x` belongs to — the nearest lane centre. */
const laneFromX = (x: number, width: number) => {
  let best = 0;
  let closest = Infinity;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const distance = Math.abs(x - laneX(lane, width));
    if (distance < closest) {
      closest = distance;
      best = lane;
    }
  }
  return best;
};

export default function CatMusicBand() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const catsRef = useRef<Cat[]>([]);
  const notesRef = useRef<LiveNote[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const flashesRef = useRef<LaneFlash[]>(
    Array.from({ length: LANE_COUNT }, () => ({ life: 0, judgement: null, stray: false }))
  );
  const stateRef = useRef<GameState>(initialState(0));
  const startRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);

  const changePhase = useCallback((next: Phase) => {
    stateRef.current.phase = next;
    setPhase(next);
  }, []);

  const startSong = useCallback(() => {
    const state = stateRef.current;
    if (state.phase === "countdown" || state.phase === "playing") return;

    const chart = buildChart();
    notesRef.current = chart.map((note) => ({ ...note, state: "pending", resolvedAt: 0 }));
    burstsRef.current = [];
    flashesRef.current = Array.from({ length: LANE_COUNT }, () => ({ life: 0, judgement: null, stray: false }));

    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.perfect = 0;
    state.good = 0;
    state.missed = 0;
    state.total = chart.length;
    state.songTime = -LEAD_IN;
    state.summary = null;
    setSummary(null);
    catsRef.current.forEach((cat) => {
      cat.strike = 0;
    });

    startRef.current = performance.now();
    changePhase("countdown");

    // The whole track is scheduled in one synchronous block so every tone
    // shares the same base time and stays locked to the visual clock.
    const lead = 0.15;
    for (const beat of buildBackingTrack()) {
      playTone({
        frequency: beat.frequency,
        type: beat.type,
        duration: beat.duration,
        volume: beat.volume,
        delay: lead + beat.time,
      });
    }
    for (const instrument of LANE_INSTRUMENTS) {
      playSequence(
        instrument.intro.map((note) => ({ ...note, volume: 0.13 })),
        0.11
      );
    }
  }, [changePhase]);

  const hitLane = useCallback((lane: number) => {
    const state = stateRef.current;
    if (state.phase !== "playing") return;

    const flash = flashesRef.current[lane];
    const cat = catsRef.current.find((candidate) => LANE_BY_CAT[candidate.id] === lane);
    if (cat) cat.strike = 1;

    // Nearest unjudged note in this lane, if one is inside the good window.
    let target = -1;
    let closest = Infinity;
    for (let i = 0; i < notesRef.current.length; i++) {
      const note = notesRef.current[i];
      if (note.lane !== lane || note.state !== "pending") continue;
      const distance = Math.abs(note.time - state.songTime);
      if (distance <= GOOD_WINDOW && distance < closest) {
        closest = distance;
        target = i;
      }
    }

    if (target === -1) {
      // A stray tap still flashes the lane, but it does not break the combo.
      flash.life = 1;
      flash.judgement = null;
      flash.stray = true;
      return;
    }

    const result = judge(notesRef.current[target].time - state.songTime);
    if (!result) {
      flash.life = 1;
      flash.judgement = null;
      flash.stray = true;
      return;
    }

    notesRef.current[target].state = "hit";
    notesRef.current[target].resolvedAt = state.songTime;
    flash.life = 1;
    flash.judgement = result;
    flash.stray = false;

    state.score += judgementScore(result) * comboMultiplier(state.combo);
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    if (result === "perfect") state.perfect += 1;
    else state.good += 1;

    const instrument = LANE_INSTRUMENTS[lane];
    playTone(instrument.hit);

    const width = canvasRef.current?.width ?? 0;
    const sparks = result === "perfect" ? 6 : 3;
    for (let i = 0; i < sparks; i++) {
      burstsRef.current.push({
        x: laneX(lane, width),
        y: HIT_LINE_Y,
        emoji: i === 0 ? instrument.emoji : NOTE_EMOJIS[Math.floor(Math.random() * NOTE_EMOJIS.length)],
        color: instrument.color,
        life: 1,
        drift: (Math.random() - 0.5) * 5,
        rise: 1.6 + Math.random() * 2.2,
      });
    }
  }, []);

  /** The one non-lane action: start the song, or play it again. */
  const act = useCallback(() => {
    const state = stateRef.current;
    if (state.phase === "idle" || state.phase === "results") startSong();
  }, [startSong]);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(BEST_KEY));
      if (stored > 0) stateRef.current.best = stored;
    } catch {
      // storage unavailable
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = Math.min(800, window.innerWidth - 40);
      canvas.height = CANVAS_HEIGHT;
      catsRef.current = LANE_CATS.map((id) => createCat(id, canvas.width, canvas.height));
    };
    resize();
    window.addEventListener("resize", resize);

    const drawBackground = (width: number, height: number, time: number) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#2C1810");
      gradient.addColorStop(0.3, "#4A2C2A");
      gradient.addColorStop(0.7, "#6B3A3A");
      gradient.addColorStop(1, "#8B4513");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#8B0000";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(60, 0);
      ctx.lineTo(40, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width - 60, 0);
      ctx.lineTo(width - 40, height);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#6B0000";
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 15, 0);
        ctx.quadraticCurveTo(i * 15 + 5, height / 2, i * 15 - 5, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width - i * 15, 0);
        ctx.quadraticCurveTo(width - i * 15 - 5, height / 2, width - i * 15 + 5, height);
        ctx.stroke();
      }

      ctx.fillStyle = "#4A3728";
      ctx.fillRect(0, height - 100, width, 100);
      ctx.strokeStyle = "#3A2718";
      ctx.lineWidth = 2;
      for (let i = 0; i < width; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, height - 100);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      const spots = ["rgba(255, 200, 100, 0.3)", "rgba(255, 150, 200, 0.3)", "rgba(100, 200, 255, 0.3)"];
      spots.forEach((color, i) => {
        const spotX = width * (0.25 + i * 0.25);
        const light = ctx.createRadialGradient(spotX, 0, 0, spotX, height - 100, 200);
        light.addColorStop(0, color);
        light.addColorStop(1, "transparent");
        ctx.fillStyle = light;
        ctx.beginPath();
        ctx.moveTo(spotX - 50, 0);
        ctx.lineTo(spotX - 150, height - 100);
        ctx.lineTo(spotX + 150, height - 100);
        ctx.lineTo(spotX + 50, 0);
        ctx.closePath();
        ctx.fill();
      });

      ctx.fillStyle = "#FFD700";
      for (let i = 0; i < 20; i++) {
        const starX = (Math.sin(i * 0.5 + time * 0.001) + 1) * (width / 2);
        const starY = (Math.cos(i * 0.7 + time * 0.0015) + 1) * (height / 3);
        ctx.globalAlpha = 0.3 + Math.sin(time * 0.005 + i * 0.5) * 0.3;
        ctx.beginPath();
        ctx.arc(starX, starY, 2 + Math.sin(time * 0.003 + i), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawLanes = (width: number, songTime: number, running: boolean) => {
      const w = laneWidth(width);

      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const x = laneX(lane, width);
        const instrument = LANE_INSTRUMENTS[lane];
        const flash = flashesRef.current[lane];

        ctx.fillStyle = `rgba(255,255,255,${0.04 + flash.life * 0.18})`;
        ctx.fillRect(x - w / 2, 0, w, HIT_LINE_Y + 20);

        ctx.strokeStyle = flash.life > 0 ? instrument.color : "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, 0);
        ctx.lineTo(x - w / 2, HIT_LINE_Y);
        ctx.moveTo(x + w / 2, 0);
        ctx.lineTo(x + w / 2, HIT_LINE_Y);
        ctx.stroke();

        // Beat guides so the player can feel the tempo.
        if (running) {
          ctx.strokeStyle = "rgba(255,255,255,0.08)";
          ctx.lineWidth = 1;
          const firstBeat = Math.ceil(songTime / BEAT) * BEAT;
          for (let k = 0; k < 3; k++) {
            const y = noteY(firstBeat + k * BEAT, songTime);
            if (y < 0 || y > HIT_LINE_Y) continue;
            ctx.beginPath();
            ctx.moveTo(x - w / 2, y);
            ctx.lineTo(x + w / 2, y);
            ctx.stroke();
          }
        }

        // Hit line
        ctx.fillStyle = flash.life > 0.4 ? instrument.color : "rgba(255,255,255,0.5)";
        ctx.fillRect(x - w / 2 - 4, HIT_LINE_Y - 3, w + 8, 6);

        // Judgement callout
        if (flash.life > 0 && flash.judgement) {
          ctx.globalAlpha = Math.min(1, flash.life * 1.4);
          ctx.fillStyle = flash.judgement === "perfect" ? "#FFD700" : "#7BE495";
          ctx.font = "bold 15px Arial";
          ctx.textAlign = "center";
          ctx.fillText(flash.judgement === "perfect" ? "ИДЕАЛЬНО!" : "Хорошо!", x, HIT_LINE_Y - 22);
          ctx.globalAlpha = 1;
        } else if (flash.life > 0 && flash.stray) {
          ctx.globalAlpha = Math.min(1, flash.life);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = "13px Arial";
          ctx.textAlign = "center";
          ctx.fillText("мимо", x, HIT_LINE_Y - 22);
          ctx.globalAlpha = 1;
        }

        // Lane header: key badge, instrument emoji and name. Kept at the top of
        // the lane so nothing overlaps the cats standing below the hit line.
        ctx.fillStyle = flash.life > 0 ? instrument.color : "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.roundRect(x - 46, 12, 24, 24, 6);
        ctx.fill();
        ctx.fillStyle = flash.life > 0 ? "#2C1810" : "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(laneLabel(lane), x - 34, 25);
        ctx.textBaseline = "alphabetic";

        ctx.font = "20px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(instrument.emoji, x + 4, 30);
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(instrument.name, x + 4, 48);
        ctx.textAlign = "left";
      }
    };

    const drawNotes = (width: number, songTime: number) => {
      const w = laneWidth(width);
      for (const note of notesRef.current) {
        const y = noteY(note.time, songTime);
        if (y < -NOTE_HEIGHT * 2 || y > HIT_LINE_Y + NOTE_HEIGHT) continue;

        const instrument = LANE_INSTRUMENTS[note.lane];
        const x = laneX(note.lane, width);

        if (note.state === "hit") {
          const age = songTime - note.resolvedAt;
          if (age > 0.35) continue;
          ctx.save();
          ctx.globalAlpha = 1 - age / 0.35;
          ctx.translate(x, HIT_LINE_Y);
          ctx.scale(1 + age * 3, 1 + age * 3);
          ctx.fillStyle = instrument.color;
          ctx.beginPath();
          ctx.roundRect(-w / 2, -NOTE_HEIGHT / 2, w, NOTE_HEIGHT, 10);
          ctx.fill();
          ctx.restore();
          continue;
        }

        if (note.state === "missed") {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = "#6A6A6A";
          ctx.beginPath();
          ctx.roundRect(x - w / 2 + 5, y - NOTE_HEIGHT / 2, w - 10, NOTE_HEIGHT, 10);
          ctx.fill();
          ctx.restore();
          continue;
        }

        const close = Math.abs(note.time - songTime) < GOOD_WINDOW;
        ctx.fillStyle = close ? "#FFFFFF" : instrument.color;
        ctx.strokeStyle = close ? instrument.color : "rgba(0,0,0,0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x - w / 2 + 4, y - NOTE_HEIGHT / 2, w - 8, NOTE_HEIGHT, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = "22px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillText(instrument.emoji, x, y);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      }
    };

    const drawBursts = (dt: number) => {
      burstsRef.current = burstsRef.current.filter((burst) => {
        burst.life -= dt / 900;
        burst.y -= (burst.rise * dt) / 16;
        burst.x += (burst.drift * dt) / 16;
        if (burst.life <= 0) return false;
        ctx.save();
        ctx.globalAlpha = Math.max(0, burst.life);
        ctx.font = `${16 + burst.life * 12}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = burst.color;
        ctx.fillText(burst.emoji, burst.x, burst.y);
        ctx.restore();
        return true;
      });
    };

    const drawHud = (state: GameState, width: number) => {
      const accuracy = state.total
        ? Math.round(((state.perfect + state.good * 0.5) / state.total) * 100)
        : 0;

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.roundRect(12, 62, 182, 78, 12);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 19px Arial";
      ctx.fillText(`Очки: ${state.score}`, 26, 90);
      ctx.font = "13px Arial";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`Рекорд: ${state.best}`, 26, 110);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`Точность: ${accuracy}%`, 26, 130);

      if (state.combo > 1) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.roundRect(width / 2 - 66, 62, 132, 40, 20);
        ctx.fill();
        ctx.fillStyle = "#7BE495";
        ctx.font = "bold 19px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Комбо ${state.combo}  ×${comboMultiplier(state.combo)}`, width / 2, 88);
        ctx.textAlign = "left";
      }
    };

    const drawCountdown = (state: GameState, width: number, height: number) => {
      const remaining = Math.ceil(-state.songTime);
      if (remaining < 1 || remaining > 3) return;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 96px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(remaining), width / 2, height / 2 + 24);
      ctx.textAlign = "left";
    };

    const drawPrompt = (width: number, height: number) => {
      const y = height / 2 - 44;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.roundRect(width / 2 - 220, y, 440, 76, 14);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 19px Arial";
      ctx.fillText("Коты готовы! Нажми, чтобы начать", width / 2, y + 34);
      ctx.font = "15px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("A · S · D  —  или тапни по дорожке", width / 2, y + 60);
      ctx.textAlign = "left";
    };

    const drawResults = (state: GameState, width: number, height: number) => {
      const result = state.summary;
      if (!result) return;

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, width, height);

      const panelWidth = 350;
      const panelHeight = 252;
      const px = (width - panelWidth) / 2;
      const py = (height - panelHeight) / 2 - 6;

      ctx.fillStyle = "rgba(46, 24, 16, 0.96)";
      ctx.beginPath();
      ctx.roundRect(px, py, panelWidth, panelHeight, 16);
      ctx.fill();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 19px Arial";
      ctx.fillText("Выступление окончено!", width / 2, py + 36);

      ctx.font = "bold 60px Arial";
      ctx.fillStyle = result.grade === "S" ? "#FFD700" : result.grade === "D" ? "#FF6B6B" : "#7BE495";
      ctx.fillText(result.grade, width / 2, py + 98);

      ctx.font = "15px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const lines = [
        `Очки: ${result.score}`,
        `Точность: ${Math.round(result.accuracy)}%`,
        `Максимальное комбо: ${result.maxCombo}`,
        `Идеально: ${result.perfect}   Хорошо: ${result.good}   Мимо: ${result.missed}`,
      ];
      lines.forEach((line, i) => ctx.fillText(line, width / 2, py + 132 + i * 26));
      ctx.textAlign = "left";
    };

    let last = 0;

    const animate = (now: number) => {
      const dt = Math.min(now - last || 16, 50);
      last = now;
      const time = now / 1000;
      const state = stateRef.current;
      const width = canvas.width;

      if (state.phase === "countdown" || state.phase === "playing") {
        state.songTime = (now - startRef.current) / 1000 - LEAD_IN;

        if (state.phase === "countdown" && state.songTime >= 0) {
          changePhase("playing");
        }

        if (state.phase === "playing") {
          for (const note of notesRef.current) {
            if (note.state === "pending" && state.songTime > note.time + GOOD_WINDOW) {
              note.state = "missed";
              note.resolvedAt = state.songTime;
              state.missed += 1;
              state.combo = 0;
            }
          }

          if (state.songTime > SONG_LENGTH + 0.7) {
            const result = summarise({
              score: state.score,
              maxCombo: state.maxCombo,
              perfect: state.perfect,
              good: state.good,
              missed: state.missed,
              total: state.total,
            });
            state.summary = result;
            if (result.score > state.best) {
              state.best = result.score;
              try {
                window.localStorage.setItem(BEST_KEY, String(state.best));
              } catch {
                // storage unavailable
              }
            }
            setSummary(result);
            changePhase("results");
            playSequence(
              result.grade === "S"
                ? [{ frequency: 523 }, { frequency: 659 }, { frequency: 784 }, { frequency: 1047 }]
                : [{ frequency: 392 }, { frequency: 330 }],
              0.12
            );
          }
        }
      }

      flashesRef.current.forEach((flash) => {
        flash.life = Math.max(0, flash.life - dt / 320);
        if (flash.life === 0) {
          flash.judgement = null;
          flash.stray = false;
        }
      });
      catsRef.current.forEach((cat) => {
        cat.strike = Math.max(0, cat.strike - dt / 260);
      });

      // --- draw ---
      const height = CANVAS_HEIGHT;
      ctx.clearRect(0, 0, width, height);
      const running = state.phase === "countdown" || state.phase === "playing";
      drawBackground(width, height, time);
      drawLanes(width, state.songTime, running);
      if (running) drawNotes(width, state.songTime);

      // Cats with no lane sit to the side and watch.
      SPECTATOR_CATS.forEach((id, i) => {
        const bob = Math.sin(time * 1.2 + i * 1.9) * 4;
        drawCatSprite(ctx, {
          preset: getCatPreset(id),
          x: SPECTATOR_SPOT.x,
          y: height + STAGE_MARKS.Miuska.y + bob,
          scaleX: SPECTATOR_SPOT.scale,
          scaleY: SPECTATOR_SPOT.scale,
          time,
          expression: running ? "happy" : "squint",
          tailWag: running ? undefined : Math.sin(time * 1.1) * 0.18,
        });
      });

      catsRef.current.forEach((cat) => {
        const bop =
          running ? Math.sin(state.songTime * Math.PI * 4) * CAT_MOTION.pawBopRange * 0.6 : 0;
        drawCatSprite(ctx, {
          preset: getCatPreset(cat.id),
          x: cat.x,
          y: cat.y,
          scaleX: 1 + cat.strike * 0.12,
          scaleY: 1 + cat.strike * 0.16,
          time,
          blinking: false,
          expression: cat.strike > 0.35 ? "happy" : "neutral",
          pawOffset: bop + cat.strike * 6,
          tailWag:
            cat.strike > 0
              ? Math.sin(time * CAT_MOTION.activeTailWagSpeed) * CAT_MOTION.activeTailWagAmplitude
              : undefined,
        });
      });

      drawBursts(dt);
      if (running) drawHud(state, width);
      if (state.phase === "countdown") drawCountdown(state, width, height);
      if (state.phase === "idle") drawPrompt(width, height);
      if (state.phase === "results") drawResults(state, width, height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        act();
        return;
      }
      const lane = LANE_KEYS.findIndex((codes) => codes.includes(event.code));
      if (lane >= 0) {
        event.preventDefault();
        hitLane(lane);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationRef.current);
    };
  }, [act, changePhase, hitLane]);

  /** Tapping a lane plays it; tapping anywhere while idle starts the song. */
  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (stateRef.current.phase === "idle" || stateRef.current.phase === "results") {
        act();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      hitLane(laneFromX(x, canvas.width));
    },
    [act, hitLane]
  );

  const running = phase === "countdown" || phase === "playing";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-amber-900 to-amber-800 p-4">
      <h1 className="text-3xl font-bold text-white mb-2">🎵 Кошачий Оркестр 🎵</h1>
      <p className="text-amber-200 mb-4">
        Лови ноты в ритм! Клавиши{" "}
        {LANE_INSTRUMENTS.map((instrument, i) => (
          <Fragment key={instrument.catId}>
            {i > 0 && ", "}
            <kbd className="px-2 py-1 bg-amber-700 rounded font-mono text-white">{laneLabel(i)}</kbd>
          </Fragment>
        ))}{" "}
        — или тапни по дорожке
      </p>

      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl border-4 border-amber-600 touch-none select-none"
        onPointerDown={handlePointerDown}
      />

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {LANE_INSTRUMENTS.map((instrument) => (
          <span
            key={instrument.catId}
            className="px-3 py-1 rounded-full text-sm text-white"
            style={{ backgroundColor: instrument.color }}
          >
            {instrument.emoji} {catName(instrument.catId)} · {instrument.name}
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-4">
        <button
          onClick={act}
          disabled={running}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all transform hover:scale-105 ${
            running
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
          }`}
        >
          {running ? "🎵 Играем... 🎵" : phase === "results" ? "🔁 Ещё раз!" : "🎸 Начать выступление!"}
        </button>
      </div>

      {summary && !running && (
        <p className="mt-3 text-amber-100 text-lg">
          Оценка <span className="font-bold text-amber-300">{summary.grade}</span> · {summary.score} очков · точность{" "}
          {Math.round(summary.accuracy)}%
        </p>
      )}

      <div className="mt-6 text-center text-amber-200 text-sm">
        <p>
          Наши музыканты:{" "}
          {LANE_CATS.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && (i === LANE_CATS.length - 1 ? " и " : ", ")}
              <span className="font-semibold text-white">{catName(id)}</span>
            </Fragment>
          ))}
        </p>
        {SPECTATOR_CATS.length > 0 && (
          <p className="mt-1 text-amber-300/80">
            На диване: {SPECTATOR_CATS.map((id) => catName(id)).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
