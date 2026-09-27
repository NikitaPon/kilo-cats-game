"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CAT_IDS, catName, drawCat as drawCatSprite, getCatPreset } from "@/characters";
import type { CatActor, CatId } from "@/characters";
import { playSequence, playTone } from "@/lib/audio";

interface Cat extends CatActor {
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** 0..1, how alert the cat is — a fish on the line makes it perk up. */
  excitement: number;
}

export interface Fish {
  name: string;
  emoji: string;
  color: string;
  /** Bite window width, as a fraction of the bar. */
  zone: number;
  /** Marker speed across the bar, in bars per second. */
  speed: number;
  score: number;
  /** Relative chance of being hooked. */
  weight: number;
  bodyWidth: number;
  bodyHeight: number;
}

type Phase = "idle" | "casting" | "waiting" | "biting" | "result";

interface GameState {
  phase: Phase;
  score: number;
  best: number;
  streak: number;
  cast: number;
  /** Index into the cat list: whoever is holding the rod this cast. */
  catIndex: number;
  bobberX: number;
  bobberY: number;
  /** 0..1, how far the line has flown out. */
  lineOut: number;
  waitLeft: number;
  waitTotal: number;
  fish: Fish | null;
  /** Centre of the bite window, 0..1 along the bar. */
  zoneCenter: number;
  /** Marker position, 0..1 along the bar. */
  marker: number;
  markerDir: number;
  biteLeft: number;
  resultLeft: number;
  caught: boolean;
  /** 0..1 ripple intensity at the bobber. */
  splash: number;
  /** 0..1 progress of the catch animation. */
  resultT: number;
}

const CANVAS_HEIGHT = 500;
const WATER_TOP = 140;
const BANK_TOP = 350;
const BOBBER_Y = 292;
const HOOKED_Y = 306;
/** Where the cats' feet rest. */
const FLOOR_Y = 470;
/** Lowest drawn point of the cat sprite, in unit space (back legs). */
const CAT_FOOT_OFFSET = 53;
const BAR_HEIGHT = 26;
const BAR_MAX_WIDTH = 320;
const BAR_Y = 182;
const BEST_KEY = "cat-fishing-best";
const CAST_MS = 450;
const RESULT_MS = 1100;
const BITE_LIMIT_MS = 3200;

/** Where each cat stands on the bank, relative to the canvas centre. */
const STAGE_MARKS: Record<CatId, number> = {
  Miuska: -170,
  Aliska: 170,
  Viki: 0,
};

export const FISH_TYPES: Fish[] = [
  { name: "Карась", emoji: "🐟", color: "#CD853F", zone: 0.3, speed: 0.5, score: 10, weight: 50, bodyWidth: 26, bodyHeight: 16 },
  { name: "Окунь", emoji: "🐠", color: "#4ECDC4", zone: 0.2, speed: 0.7, score: 25, weight: 30, bodyWidth: 30, bodyHeight: 18 },
  { name: "Щука", emoji: "🐡", color: "#2ECC71", zone: 0.14, speed: 0.85, score: 50, weight: 15, bodyWidth: 42, bodyHeight: 14 },
  { name: "Золотая рыбка", emoji: "✨", color: "#FFD700", zone: 0.1, speed: 0.95, score: 100, weight: 5, bodyWidth: 22, bodyHeight: 22 },
];

/** A cat's anchor is its body centre, so align the feet on the bank. */
export const stageY = (id: CatId) => FLOOR_Y - CAT_FOOT_OFFSET * getCatPreset(id).scale;

const createCat = (id: CatId, width: number): Cat => ({
  id,
  x: width / 2 + STAGE_MARKS[id],
  y: stageY(id),
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  excitement: 0,
});

const initialState = (best: number): GameState => ({
  phase: "idle",
  score: 0,
  best,
  streak: 0,
  cast: 0,
  catIndex: 0,
  bobberX: 400,
  bobberY: BOBBER_Y,
  lineOut: 0,
  waitLeft: 0,
  waitTotal: 1,
  fish: null,
  zoneCenter: 0.5,
  marker: 0,
  markerDir: 1,
  biteLeft: 0,
  resultLeft: 0,
  caught: false,
  splash: 0,
  resultT: 0,
});

function pickFish(): Fish {
  const total = FISH_TYPES.reduce((sum, f) => sum + f.weight, 0);
  let roll = Math.random() * total;
  for (const fish of FISH_TYPES) {
    roll -= fish.weight;
    if (roll <= 0) return fish;
  }
  return FISH_TYPES[0];
}

/** Score multiplier that grows with a run of successful hooks. */
export const streakMultiplier = (streak: number) => Math.min(1 + Math.floor(streak / 3), 5);

export const barGeometry = (width: number) => {
  const barWidth = Math.min(BAR_MAX_WIDTH, width * 0.6);
  return { x: (width - barWidth) / 2, y: BAR_Y, width: barWidth, height: BAR_HEIGHT };
};

export const inZone = (marker: number, center: number, zone: number) => Math.abs(marker - center) <= zone / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// --- drawing -----------------------------------------------------------------

function drawSky(ctx: CanvasRenderingContext2D, width: number, time: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, BANK_TOP);
  sky.addColorStop(0, "#7EC8E3");
  sky.addColorStop(1, "#CDEBFA");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, BANK_TOP);

  // Sun
  ctx.fillStyle = "#FFE680";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(width - 110, 62, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Drifting clouds
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 4; i++) {
    const cx = ((time * (6 + i * 3) + i * 260) % (width + 220)) - 110;
    const cy = 40 + i * 26;
    const r = 20 + (i % 3) * 7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.9, cy + 5, r * 0.8, 0, Math.PI * 2);
    ctx.arc(cx - r * 0.8, cy + 6, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Far treeline
  ctx.fillStyle = "#3F7F4E";
  ctx.beginPath();
  ctx.moveTo(0, BANK_TOP);
  for (let x = 0; x <= width; x += 40) {
    ctx.lineTo(x, BANK_TOP - 18 - ((x * 7) % 14));
  }
  ctx.lineTo(width, BANK_TOP);
  ctx.closePath();
  ctx.fill();
}

function drawWater(ctx: CanvasRenderingContext2D, width: number, time: number) {
  const water = ctx.createLinearGradient(0, WATER_TOP, 0, BANK_TOP);
  water.addColorStop(0, "#4FA8D8");
  water.addColorStop(1, "#1F5F8B");
  ctx.fillStyle = water;
  ctx.fillRect(0, WATER_TOP, width, BANK_TOP - WATER_TOP);

  // Sun reflection band
  ctx.fillStyle = "rgba(255,230,128,0.16)";
  for (let i = 0; i < 7; i++) {
    const y = WATER_TOP + 14 + i * 22;
    const wobble = Math.sin(time * 0.004 + i) * 14;
    ctx.fillRect(width - 150 + wobble, y, 70 - i * 6, 5);
  }

  // Surface ripples
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = WATER_TOP + 10 + i * 30;
    const phase = time * 0.002 + i;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 20) {
      const yOff = Math.sin(phase + x * 0.02) * 3;
      if (x === 0) ctx.moveTo(x, y + yOff);
      else ctx.lineTo(x, y + yOff);
    }
    ctx.stroke();
  }
}

function drawFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fish: Fish,
  dir: number,
  alpha = 1,
  wobble = 0
) {
  const w = fish.bodyWidth;
  const h = fish.bodyHeight;

  ctx.save();
  ctx.translate(x, y + wobble);
  ctx.scale(dir, 1);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = fish.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2 - h * 0.8, -h * 0.6);
  ctx.lineTo(-w / 2 - h * 0.8, h * 0.6);
  ctx.closePath();
  ctx.fill();

  // Dorsal fin
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w * 0.12, -h * 0.95);
  ctx.lineTo(w * 0.28, -h / 2);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(w * 0.26, -h * 0.12, Math.max(1.5, h * 0.14), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1A1A1A";
  ctx.beginPath();
  ctx.arc(w * 0.28, -h * 0.12, Math.max(0.8, h * 0.07), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBobber(ctx: CanvasRenderingContext2D, x: number, y: number, dip: number) {
  ctx.fillStyle = "#1A1A1A";
  ctx.fillRect(x - 2, y - 10 + dip, 4, 14);
  ctx.fillStyle = "#FF6B6B";
  ctx.beginPath();
  ctx.arc(x, y - 12 + dip, 7, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(x, y - 12 + dip, 7, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = "#FF6B6B";
  ctx.fillRect(x - 7, y - 12 + dip, 14, 3);
}

function drawRipples(ctx: CanvasRenderingContext2D, x: number, y: number, splash: number) {
  if (splash <= 0) return;
  for (let i = 0; i < 3; i++) {
    const t = splash * 1.6 - i * 0.35;
    if (t <= 0 || t >= 1) continue;
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - t)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + t * 46, 4 + t * 14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRod(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  out: number
) {
  const tipX = lerp(fromX + 6, toX, out);
  const tipY = lerp(fromY - 18, toY, out);

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo((tipX + toX) / 2, Math.min(tipY, toY) + 26, toX, toY);
  ctx.stroke();

  ctx.strokeStyle = "#8B5A2B";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fromX - 12, fromY + 6);
  ctx.lineTo(fromX + 6, fromY - 18);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawBar(ctx: CanvasRenderingContext2D, width: number, state: GameState) {
  const bar = barGeometry(width);
  if (state.phase !== "biting" && !(state.phase === "result" && state.caught)) return;

  const zone = state.fish?.zone ?? 0.2;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(bar.x - 4, bar.y - 4, bar.width + 8, bar.height + 8, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.roundRect(bar.x, bar.y, bar.width, bar.height, 6);
  ctx.fill();

  // Bite window
  const gradient = ctx.createLinearGradient(0, bar.y, 0, bar.y + bar.height);
  gradient.addColorStop(0, "#7BE495");
  gradient.addColorStop(1, "#3F9E5C");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(bar.x + (state.zoneCenter - zone / 2) * bar.width, bar.y, zone * bar.width, bar.height, 5);
  ctx.fill();

  if (state.phase === "biting") {
    const markerX = bar.x + state.marker * bar.width;
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(markerX, bar.y - 6);
    ctx.lineTo(markerX, bar.y + bar.height + 6);
    ctx.stroke();
  }
}

function drawBank(ctx: CanvasRenderingContext2D, width: number, time: number) {
  const bank = ctx.createLinearGradient(0, BANK_TOP, 0, CANVAS_HEIGHT);
  bank.addColorStop(0, "#8B6B4A");
  bank.addColorStop(1, "#6B4F35");
  ctx.fillStyle = bank;
  ctx.fillRect(0, BANK_TOP, width, CANVAS_HEIGHT - BANK_TOP);

  // Shoreline
  ctx.fillStyle = "#C9A227";
  ctx.fillRect(0, BANK_TOP, width, 6);

  // Reeds along the water's edge
  ctx.strokeStyle = "#3F7F4E";
  ctx.lineWidth = 2;
  for (let x = 12; x < width; x += 34) {
    const sway = Math.sin(time * 0.0015 + x) * 3;
    const h = 18 + ((x * 13) % 16);
    ctx.beginPath();
    ctx.moveTo(x, BANK_TOP + 4);
    ctx.quadraticCurveTo(x + sway, BANK_TOP + 4 - h * 0.6, x + sway * 2, BANK_TOP + 4 - h);
    ctx.stroke();
  }
}

function drawHud(ctx: CanvasRenderingContext2D, width: number, state: GameState) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(12, 12, 224, state.streak > 1 ? 84 : 64, 12);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Очки: ${state.score}`, 26, 40);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`Рекорд: ${state.best}`, 26, 62);

  if (state.streak > 1) {
    ctx.fillStyle = "#7BE495";
    ctx.fillText(`Серия: ${state.streak}  ×${streakMultiplier(state.streak)}`, 26, 82);
  }

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.roundRect(width - 168, 12, 156, 32, 12);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "14px Arial";
  ctx.fillText(`Забросов: ${state.cast}`, width - 154, 33);
}

function drawIdlePrompt(ctx: CanvasRenderingContext2D, width: number) {
  const bar = barGeometry(width);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(width / 2 - 190, bar.y - 44, 380, 36, 12);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 17px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Нажми Пробел, чтобы забросить удочку!", width / 2, bar.y - 20);
  ctx.textAlign = "left";
}

export default function CatFishing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const catsRef = useRef<Cat[]>([]);
  const gameRef = useRef<GameState>(initialState(0));

  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("Нажми Пробел, чтобы забросить удочку!");

  const changePhase = useCallback((next: Phase) => {
    gameRef.current.phase = next;
    setPhase(next);
  }, []);

  const beginCast = useCallback(() => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas || catsRef.current.length === 0) return;

    game.cast += 1;
    game.catIndex = Math.floor(Math.random() * catsRef.current.length);
    game.bobberX = 140 + Math.random() * (canvas.width - 280);
    game.bobberY = BOBBER_Y;
    game.lineOut = 0;
    game.fish = null;
    game.resultT = 0;
    game.splash = 1;
    changePhase("casting");
    setMessage(`${catName(catsRef.current[game.catIndex].id)} забрасывает удочку...`);
    playTone({ frequency: 320, type: "triangle", duration: 0.18, volume: 0.12, slideTo: 620 });
  }, [changePhase]);

  const beginBite = useCallback(() => {
    const game = gameRef.current;
    const fish = pickFish();
    game.fish = fish;
    game.zoneCenter = fish.zone / 2 + Math.random() * (1 - fish.zone);
    game.marker = 0;
    game.markerDir = 1;
    game.biteLeft = BITE_LIMIT_MS;
    changePhase("biting");
    setMessage("КЛЮЁТ! Нажми Пробел, когда ползунок в зелёной зоне!");
    playTone({ frequency: 700, type: "square", duration: 0.08, volume: 0.1 });
  }, [changePhase]);

  const resolveBite = useCallback(
    (hit: boolean) => {
      const game = gameRef.current;
      const fish = game.fish;
      if (!fish) return;

      game.caught = hit;
      game.splash = 1;

      if (hit) {
        const points = fish.score * streakMultiplier(game.streak);
        game.score += points;
        game.streak += 1;
        if (game.score > game.best) {
          game.best = game.score;
          try {
            window.localStorage.setItem(BEST_KEY, String(game.best));
          } catch {
            // storage unavailable
          }
        }
        setMessage(`${fish.emoji} Поймана «${fish.name}»! +${points} очков`);
        playSequence([
          { frequency: 523, type: "triangle" },
          { frequency: 659, type: "triangle" },
          { frequency: 784, type: "triangle" },
          { frequency: 1047, type: "triangle" },
        ]);
      } else {
        game.streak = 0;
        setMessage(`${fish.emoji} «${fish.name}» сорвалась... Попробуй ещё раз!`);
        playTone({ frequency: 400, type: "sawtooth", duration: 0.35, volume: 0.12, slideTo: 140 });
      }

      game.resultLeft = RESULT_MS;
      changePhase("result");
    },
    [changePhase]
  );

  /** The single player action: cast when idle, hook when something bites. */
  const act = useCallback(() => {
    const game = gameRef.current;
    if (game.phase === "idle") {
      beginCast();
    } else if (game.phase === "biting" && game.fish) {
      resolveBite(inZone(game.marker, game.zoneCenter, game.fish.zone));
    }
  }, [beginCast, resolveBite]);

  // Restore the saved record. The record is drawn on the canvas HUD, so this
  // only needs to seed the ref — no re-render, and no hydration mismatch.
  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(BEST_KEY));
      if (stored > 0) {
        gameRef.current.best = stored;
      }
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
      catsRef.current = CAT_IDS.map((id) => createCat(id, canvas.width));
    };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;

    const animate = (now: number) => {
      const dt = Math.min(now - last || 16, 50);
      last = now;
      const time = now / 1000;
      const game = gameRef.current;
      const width = canvas.width;
      const cats = catsRef.current;
      if (cats.length === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // --- update ---
      game.splash = Math.max(0, game.splash - dt / 700);

      if (game.phase === "casting") {
        game.lineOut = Math.min(1, game.lineOut + dt / CAST_MS);
        if (game.lineOut >= 1) {
          game.waitTotal = 700 + Math.random() * 1600;
          game.waitLeft = game.waitTotal;
          changePhase("waiting");
          setMessage("Ждём поклёвки...");
        }
      } else if (game.phase === "waiting") {
        game.waitLeft -= dt;
        if (game.waitLeft <= 0) {
          beginBite();
        }
      } else if (game.phase === "biting") {
        game.biteLeft -= dt;
        game.marker += game.markerDir * (game.fish?.speed ?? 0.5) * (dt / 1000);
        if (game.marker >= 1) {
          game.marker = 1;
          game.markerDir = -1;
        } else if (game.marker <= 0) {
          game.marker = 0;
          game.markerDir = 1;
        }
        if (game.biteLeft <= 0) {
          resolveBite(false);
        }
      } else if (game.phase === "result") {
        game.resultLeft -= dt;
        game.resultT = Math.min(1, game.resultT + dt / RESULT_MS);
        if (game.resultLeft <= 0) {
          beginCast();
        }
      }

      // Excitement: the cat with the rod perks up as the bite approaches
      cats.forEach((cat, i) => {
        const isAngler = i === game.catIndex;
        const target = isAngler
          ? game.phase === "biting"
            ? 1
            : game.phase === "waiting"
              ? 0.5
              : 0.2
          : game.phase === "result" && game.caught
            ? 0.6
            : 0;
        cat.excitement += (target - cat.excitement) * Math.min(1, dt / 220);
      });

      // --- draw ---
      ctx.clearRect(0, 0, width, CANVAS_HEIGHT);
      drawSky(ctx, width, time);
      drawWater(ctx, width, time);
      drawBank(ctx, width, time);

      // Ambient fish
      for (let i = 0; i < 3; i++) {
        const speed = 26 + i * 14;
        const x = ((time * speed + i * 260) % (width + 160)) - 80;
        drawFish(ctx, x, 180 + i * 36, FISH_TYPES[i % FISH_TYPES.length], 1, 0.35, Math.sin(time * 2 + i) * 3);
      }

      // The hooked fish
      if (game.fish && game.phase !== "idle") {
        const fish = game.fish;
        if (game.phase === "result") {
          if (game.caught) {
            drawFish(ctx, game.bobberX, HOOKED_Y - Math.sin(game.resultT * Math.PI) * 120, fish, 1, 1 - game.resultT, 0);
          } else {
            drawFish(ctx, game.bobberX - 18 - 300 * game.resultT, HOOKED_Y, fish, -1, 1 - game.resultT, 0);
          }
        } else {
          const approach = game.phase === "waiting" ? 1 - game.waitLeft / game.waitTotal : 1;
          drawFish(ctx, game.bobberX - 18 - 132 * (1 - approach), HOOKED_Y, fish, 1, 0.85, Math.sin(time * 6) * 4);
        }
      }

      if (game.phase !== "idle") {
        const rodCat = cats[Math.min(game.catIndex, cats.length - 1)];
        drawRod(ctx, rodCat.x, rodCat.y, game.bobberX, game.bobberY, game.lineOut);
        drawBobber(
          ctx,
          game.bobberX,
          game.bobberY,
          game.phase === "biting" ? Math.abs(Math.sin(time * 12)) * 5 : 0
        );
        drawRipples(ctx, game.bobberX, game.bobberY, game.splash);
      }

      cats.forEach((cat, i) => {
        const excited = i === game.catIndex && game.phase !== "idle" && cat.excitement > 0.4;
        drawCatSprite(ctx, {
          preset: getCatPreset(cat.id),
          x: cat.x,
          y: cat.y,
          rotation: cat.rotation,
          scaleX: cat.scaleX,
          scaleY: cat.scaleY,
          time,
          expression: excited ? "happy" : "neutral",
          tailWagAmplitude: 0.2 + cat.excitement * 0.25,
        });
      });

      drawBar(ctx, width, game);
      drawHud(ctx, width, game);
      if (game.phase === "idle") {
        drawIdlePrompt(ctx, width);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        act();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationRef.current);
    };
  }, [act, beginBite, beginCast, changePhase, resolveBite]);

  const busy = phase !== "idle" && phase !== "biting";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-200 to-cyan-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">🎣 Кошачья Рыбалка 🎣</h1>
      <p className="text-gray-600 mb-4">
        Нажми <kbd className="px-2 py-1 bg-white/70 rounded font-mono">Пробел</kbd> или кнопку, чтобы ловить рыбу!
      </p>

      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl border-4 border-white"
        onClick={act}
      />

      <div className="mt-4 text-center text-gray-700 text-lg font-medium min-h-7">{message}</div>

      <div className="mt-2 flex gap-4">
        <button
          onClick={act}
          disabled={busy}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all transform hover:scale-105 ${
            busy
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg"
          }`}
        >
          {phase === "idle" ? "🎣 Забросить удочку!" : phase === "biting" ? "🐟 Подсекай!" : "⏳ Ждём..."}
        </button>
      </div>

      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>
          Рыбачики:{" "}
          {CAT_IDS.map((id, i) => (
            <span key={id}>
              {i > 0 && ", "}
              <span className="font-semibold text-gray-700">{catName(id)}</span>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
