"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { catName, drawCat as drawCatSprite, getCatPreset } from "@/characters";
import type { CatId } from "@/characters";
import { playSequence, playTone } from "@/lib/audio";
import {
  BASEBOARD_HEIGHT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CAT_ACCEL,
  CAT_LEAN,
  CAT_SPEED,
  COUCH,
  MOUSE_BOUNDS,
  MOUSE_FLEE_DISTANCE,
  MOUSE_TURN_INTERVAL,
  PLAYER_CAT,
  ROOM,
  ROUND_SECONDS,
  SPECTATORS,
  WALL_HEIGHT,
  canCatch,
  clampToArea,
  comboMultiplier,
  goldenChance,
  maxAlive,
  mouseColor,
  mouseEarColor,
  mousePoints,
  mouseRadius,
  mouseSpeed,
  roundProgress,
  spawnInterval,
  spectatorPosition,
  summarise,
  timeLeft,
  type Mouse,
  type MouseKind,
  type Summary,
} from "./cat-hunt";

type Phase = "idle" | "playing" | "results";

interface Actor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  /** 0..1, decays after a catch — drives the pounce squash. */
  pounce: number;
}

interface Ring {
  x: number;
  y: number;
  life: number;
  color: string;
}

interface GameState {
  phase: Phase;
  score: number;
  best: number;
  combo: number;
  maxCombo: number;
  caught: number;
  golden: number;
  elapsed: number;
  /** Seconds until the next spawn. */
  spawnIn: number;
  summary: Summary | null;
}

const BEST_KEY = "cat-hunt-best";

const initialState = (best: number): GameState => ({
  phase: "idle",
  score: 0,
  best,
  combo: 0,
  maxCombo: 0,
  caught: 0,
  golden: 0,
  elapsed: 0,
  spawnIn: 0.6,
  summary: null,
});

/** Spawns a mouse somewhere on the floor, away from the cat. */
function spawnMouse(catX: number, catY: number, kind: MouseKind, speed: number): Mouse {
  let x = 0;
  let y = 0;
  // Retry a few times to place it far enough away to be a fair shot.
  for (let attempt = 0; attempt < 8; attempt++) {
    x = MOUSE_BOUNDS.left + Math.random() * (MOUSE_BOUNDS.right - MOUSE_BOUNDS.left);
    y = MOUSE_BOUNDS.top + Math.random() * (MOUSE_BOUNDS.bottom - MOUSE_BOUNDS.top);
    if (Math.hypot(x - catX, y - catY) > 160) break;
  }
  const angle = Math.random() * Math.PI * 2;
  return {
    kind,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    turnIn: MOUSE_TURN_INTERVAL * (0.5 + Math.random()),
    wiggle: Math.random() * Math.PI * 2,
    facing: Math.cos(angle) >= 0 ? 1 : -1,
  };
}

export default function CatHunt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const catRef = useRef<Actor>({ x: 400, y: ROOM.top + 60, vx: 0, vy: 0, facing: 1, pounce: 0 });
  const miceRef = useRef<Mouse[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 400, y: 400, active: false });
  const stateRef = useRef<GameState>(initialState(0));
  const lastTickRef = useRef(-1);

  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<Summary | null>(null);

  const changePhase = useCallback((next: Phase) => {
    stateRef.current.phase = next;
    setPhase(next);
  }, []);

  const startRound = useCallback(() => {
    const state = stateRef.current;
    const cat = catRef.current;
    miceRef.current = [];
    ringsRef.current = [];
    cat.x = 400;
    cat.y = ROOM.top + 60;
    cat.vx = 0;
    cat.vy = 0;

    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.caught = 0;
    state.golden = 0;
    state.elapsed = 0;
    state.spawnIn = 0.4;
    state.summary = null;
    setSummary(null);
    lastTickRef.current = -1;

    changePhase("playing");
    playSequence(
      [
        { frequency: 440, type: "square" },
        { frequency: 587, type: "square" },
        { frequency: 880, type: "square" },
      ],
      0.1
    );
  }, [changePhase]);

  const act = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== "playing") startRound();
  }, [startRound]);

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

    // --- room -----------------------------------------------------------------

    const drawRoom = (width: number) => {
      // Wall
      const wall = ctx.createLinearGradient(0, 0, 0, WALL_HEIGHT);
      wall.addColorStop(0, "#F3E5D3");
      wall.addColorStop(1, "#E4D0B8");
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, width, WALL_HEIGHT);

      // Wallpaper stripes
      ctx.fillStyle = "rgba(180, 150, 120, 0.18)";
      for (let x = 0; x < width; x += 34) {
        ctx.fillRect(x, 0, 14, WALL_HEIGHT);
      }

      // Wall clock — the hand sweeps once over the round
      const cx = width - 90;
      const cy = 92;
      ctx.fillStyle = "#8B5A2B";
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFF8EC";
      ctx.beginPath();
      ctx.arc(cx, cy, 33, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5A3A1E";
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
        ctx.lineTo(cx + Math.cos(a) * 23, cy + Math.sin(a) * 23);
        ctx.stroke();
      }
      const hand = roundProgress(stateRef.current.elapsed) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = "#C0392B";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hand) * 24, cy + Math.sin(hand) * 24);
      ctx.stroke();

      // Picture frame
      ctx.fillStyle = "#8B5A2B";
      ctx.fillRect(120, 52, 96, 72);
      ctx.fillStyle = "#9EC7E8";
      ctx.fillRect(128, 60, 80, 56);
      ctx.fillStyle = "#6B4A2B";
      ctx.beginPath();
      ctx.moveTo(128, 116);
      ctx.lineTo(160, 82);
      ctx.lineTo(184, 116);
      ctx.closePath();
      ctx.fill();

      // Couch the spectators sit on
      ctx.fillStyle = "#7A5C8E";
      ctx.beginPath();
      ctx.roundRect(80, COUCH.y + 34, CANVAS_WIDTH - 160, COUCH.bottom - COUCH.y - 34, 14);
      ctx.fill();
      ctx.fillStyle = "#6A4E7E";
      ctx.beginPath();
      ctx.roundRect(94, COUCH.y, CANVAS_WIDTH - 188, 62, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        const x = 80 + ((CANVAS_WIDTH - 160) * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x, COUCH.y + 40);
        ctx.lineTo(x, COUCH.bottom);
        ctx.stroke();
      }

      // Baseboard and floor
      ctx.fillStyle = "#C9A227";
      ctx.fillRect(0, WALL_HEIGHT, width, BASEBOARD_HEIGHT);
      const floor = ctx.createLinearGradient(0, WALL_HEIGHT, 0, CANVAS_HEIGHT);
      floor.addColorStop(0, "#A9743F");
      floor.addColorStop(1, "#7E5427");
      ctx.fillStyle = floor;
      ctx.fillRect(0, WALL_HEIGHT + BASEBOARD_HEIGHT, width, CANVAS_HEIGHT);
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 2;
      for (let y = WALL_HEIGHT + 30; y < CANVAS_HEIGHT; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Rug
      ctx.fillStyle = "rgba(180, 90, 90, 0.35)";
      ctx.beginPath();
      ctx.ellipse(width / 2, 430, width * 0.34, 54, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(width / 2, 430, width * 0.26, 40, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Cheese plate, decoration
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(78, 470, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F1C40F";
      ctx.beginPath();
      ctx.moveTo(66, 466);
      ctx.lineTo(92, 464);
      ctx.lineTo(78, 478);
      ctx.closePath();
      ctx.fill();
    };

    const drawMouse = (mouse: Mouse, time: number) => {
      const r = mouseRadius(mouse.kind);
      const facing = mouse.facing;
      ctx.save();
      ctx.translate(mouse.x, mouse.y);
      ctx.scale(facing, 1);

      // Tail
      ctx.strokeStyle = mouseColor(mouse.kind);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.3);
      const wiggle = Math.sin(time * 9 + mouse.wiggle) * 5;
      ctx.quadraticCurveTo(-r * 2.4, r * 0.4 + wiggle, -r * 3.2, -wiggle);
      ctx.stroke();

      // Body
      ctx.fillStyle = mouseColor(mouse.kind);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ear
      ctx.fillStyle = mouseEarColor(mouse.kind);
      ctx.beginPath();
      ctx.arc(r * 0.35, -r * 0.55, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Snout and eye
      ctx.fillStyle = mouseColor(mouse.kind);
      ctx.beginPath();
      ctx.ellipse(r * 0.85, r * 0.1, r * 0.5, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1A1A1A";
      ctx.beginPath();
      ctx.arc(r * 0.5, -r * 0.15, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 1.25, r * 0.08, 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawRing = (ring: Ring) => {
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = ring.life;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 8 + (1 - ring.life) * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const drawHud = (state: GameState, width: number) => {
      const left = Math.ceil(timeLeft(state.elapsed));

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.roundRect(12, 12, 196, 84, 12);
      ctx.fill();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px Arial";
      ctx.fillText(`Очки: ${state.score}`, 26, 42);
      ctx.font = "14px Arial";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`Рекорд: ${state.best}`, 26, 64);
      ctx.fillStyle = left <= 10 ? "#FF6B6B" : "rgba(255,255,255,0.85)";
      ctx.fillText(`Осталось: ${left} с`, 26, 84);

      if (state.combo > 1) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.roundRect(width - 158, 12, 146, 40, 20);
        ctx.fill();
        ctx.fillStyle = "#7BE495";
        ctx.font = "bold 19px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`Комбо ${state.combo} ×${comboMultiplier(state.combo)}`, width - 85, 38);
        ctx.textAlign = "left";
      }
    };

    const drawPrompt = (width: number) => {
      const y = CANVAS_HEIGHT / 2 - 52;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.roundRect(width / 2 - 250, y, 500, 96, 14);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 21px Arial";
      ctx.fillText(`${catName(PLAYER_CAT)} готов к охоте!`, width / 2, y + 34);
      ctx.font = "15px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText("Веди мышкой или клавишами WASD / стрелки", width / 2, y + 60);
      ctx.fillText("Лови мышей, пока идут 60 секунд", width / 2, y + 82);
      ctx.textAlign = "left";
    };

    const drawResults = (state: GameState, width: number, height: number) => {
      const result = state.summary;
      if (!result) return;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, width, height);

      const panelWidth = 350;
      const panelHeight = 250;
      const px = (width - panelWidth) / 2;
      const py = (height - panelHeight) / 2 - 6;

      ctx.fillStyle = "rgba(40, 28, 18, 0.96)";
      ctx.beginPath();
      ctx.roundRect(px, py, panelWidth, panelHeight, 16);
      ctx.fill();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 19px Arial";
      ctx.fillText("Охота закончена!", width / 2, py + 36);
      ctx.font = "bold 60px Arial";
      ctx.fillStyle = result.grade === "S" ? "#FFD700" : result.grade === "D" ? "#FF6B6B" : "#7BE495";
      ctx.fillText(result.grade, width / 2, py + 98);
      ctx.font = "15px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      const lines = [
        `Очки: ${result.score}`,
        `Поймано мышей: ${result.caught}`,
        `Золотых: ${result.golden}   Макс. комбо: ${result.maxCombo}`,
      ];
      lines.forEach((line, i) => ctx.fillText(line, width / 2, py + 132 + i * 26));
      ctx.textAlign = "left";
    };

    let last = 0;

    const animate = (now: number) => {
      const dt = Math.min((now - last || 16) / 1000, 0.05);
      last = now;
      const time = now / 1000;
      const state = stateRef.current;
      const width = canvas.width;
      const cat = catRef.current;

      if (state.phase === "playing") {
        state.elapsed += dt;

        // --- steering ---
        const keys = keysRef.current;
        let dirX = 0;
        let dirY = 0;
        if (keys.ArrowLeft || keys.KeyA) dirX -= 1;
        if (keys.ArrowRight || keys.KeyD) dirX += 1;
        if (keys.ArrowUp || keys.KeyW) dirY -= 1;
        if (keys.ArrowDown || keys.KeyS) dirY += 1;

        let targetVx: number;
        let targetVy: number;
        if (dirX !== 0 || dirY !== 0) {
          // Keyboard: move along the pressed direction, normalised so diagonals
          // are not faster.
          const length = Math.hypot(dirX, dirY) || 1;
          targetVx = (dirX / length) * CAT_SPEED;
          targetVy = (dirY / length) * CAT_SPEED;
        } else if (pointerRef.current.active) {
          // Mouse: chase the cursor.
          const dx = pointerRef.current.x - cat.x;
          const dy = pointerRef.current.y - cat.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 6) {
            targetVx = 0;
            targetVy = 0;
          } else {
            // Ease off as the cat arrives so it settles instead of jittering.
            const ease = Math.min(1, distance / 60);
            targetVx = (dx / distance) * CAT_SPEED * ease;
            targetVy = (dy / distance) * CAT_SPEED * ease;
          }
        } else {
          targetVx = 0;
          targetVy = 0;
        }

        const blend = Math.min(1, dt * CAT_ACCEL);
        cat.vx += (targetVx - cat.vx) * blend;
        cat.vy += (targetVy - cat.vy) * blend;
        const moved = clampToArea(cat.x + cat.vx * dt, cat.y + cat.vy * dt, ROOM);
        // Hitting a wall kills the velocity into it, so the cat does not stick.
        if (moved.x !== cat.x + cat.vx * dt) cat.vx = 0;
        if (moved.y !== cat.y + cat.vy * dt) cat.vy = 0;
        cat.x = moved.x;
        cat.y = moved.y;
        if (Math.abs(cat.vx) > 12) cat.facing = cat.vx > 0 ? 1 : -1;

        // --- mice ---
        const speed = mouseSpeed(state.elapsed);
        for (const mouse of miceRef.current) {
          mouse.turnIn -= dt;
          const distanceToCat = Math.hypot(mouse.x - cat.x, mouse.y - cat.y);
          if (distanceToCat < MOUSE_FLEE_DISTANCE) {
            // Run directly away, at a panic speed.
            const length = distanceToCat || 1;
            const panic = speed * 1.35;
            mouse.vx = ((mouse.x - cat.x) / length) * panic;
            mouse.vy = ((mouse.y - cat.y) / length) * panic;
            mouse.turnIn = MOUSE_TURN_INTERVAL;
          } else if (mouse.turnIn <= 0) {
            // Wander: pick a new heading.
            const angle = Math.random() * Math.PI * 2;
            mouse.vx = Math.cos(angle) * speed;
            mouse.vy = Math.sin(angle) * speed;
            mouse.turnIn = MOUSE_TURN_INTERVAL * (0.6 + Math.random() * 0.8);
          }
          mouse.wiggle += dt * 4;
          if (Math.abs(mouse.vx) > 5) mouse.facing = mouse.vx > 0 ? 1 : -1;

          const next = clampToArea(
            mouse.x + mouse.vx * dt,
            mouse.y + mouse.vy * dt,
            MOUSE_BOUNDS
          );
          if (next.x !== mouse.x + mouse.vx * dt) mouse.vx = -mouse.vx;
          if (next.y !== mouse.y + mouse.vy * dt) mouse.vy = -mouse.vy;
          mouse.x = next.x;
          mouse.y = next.y;
        }

        // --- catches ---
        miceRef.current = miceRef.current.filter((mouse) => {
          if (!canCatch(cat.x, cat.y, mouse.x, mouse.y, mouse.kind)) return true;
          const points = mousePoints(mouse.kind) * comboMultiplier(state.combo);
          state.score += points;
          state.combo += 1;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
          state.caught += 1;
          if (mouse.kind === "golden") state.golden += 1;
          cat.pounce = 1;
          ringsRef.current.push({ x: mouse.x, y: mouse.y, life: 1, color: mouseColor(mouse.kind) });
          if (mouse.kind === "golden") {
            playSequence([
              { frequency: 880, type: "sine" },
              { frequency: 1175, type: "sine" },
              { frequency: 1568, type: "sine" },
            ]);
          } else {
            playTone({ frequency: 900, type: "sine", duration: 0.12, volume: 0.16, slideTo: 420 });
          }
          return false;
        });

        // --- spawning ---
        state.spawnIn -= dt;
        if (state.spawnIn <= 0) {
          state.spawnIn = spawnInterval(state.elapsed);
          if (miceRef.current.length < maxAlive(state.elapsed)) {
            const kind: MouseKind = Math.random() < goldenChance(state.elapsed) ? "golden" : "regular";
            miceRef.current.push(spawnMouse(cat.x, cat.y, kind, speed));
          }
        }

        // Countdown ticks
        const second = Math.floor(state.elapsed);
        const remaining = Math.ceil(timeLeft(state.elapsed));
        if (second !== lastTickRef.current) {
          lastTickRef.current = second;
          if (remaining <= 5 && remaining > 0) {
            playTone({ frequency: remaining <= 2 ? 1200 : 800, type: "square", duration: 0.06, volume: 0.1 });
          }
        }

        if (state.elapsed >= ROUND_SECONDS) {
          const result = summarise({
            score: state.score,
            caught: state.caught,
            golden: state.golden,
            maxCombo: state.maxCombo,
          });
          state.summary = result;
          state.elapsed = ROUND_SECONDS;
          if (result.score > state.best) {
            state.best = result.score;
            try {
              window.localStorage.setItem(BEST_KEY, String(state.best));
            } catch {
              // storage unavailable
            }
          }
          miceRef.current = [];
          setSummary(result);
          changePhase("results");
          playSequence(
            result.grade === "S"
              ? [{ frequency: 523 }, { frequency: 659 }, { frequency: 784 }, { frequency: 1047 }]
              : [{ frequency: 440 }, { frequency: 330 }],
            0.13
          );
        }
      }

      cat.pounce = Math.max(0, cat.pounce - dt / 300);
      ringsRef.current = ringsRef.current.filter((ring) => {
        ring.life -= dt / 420;
        return ring.life > 0;
      });

      // --- draw ---
      ctx.clearRect(0, 0, width, CANVAS_HEIGHT);
      drawRoom(width);

      // Spectator cats on the couch
      SPECTATORS.forEach((id, i) => {
        const spot = spectatorPosition(id);
        const bob = Math.sin(time * 1.4 + i * 1.7) * 3;
        drawCatSprite(ctx, {
          preset: getCatPreset(id),
          x: spot.x,
          y: spot.y + bob,
          scaleX: COUCH.scale,
          scaleY: COUCH.scale,
          time,
          expression: state.phase === "idle" ? "squint" : "neutral",
        });
      });

      for (const mouse of miceRef.current) drawMouse(mouse, time);
      for (const ring of ringsRef.current) drawRing(ring);

      // The player's cat
      const lean = Math.max(-1, Math.min(1, cat.vx / CAT_SPEED)) * CAT_LEAN;
      const caughtSomething = state.phase === "results" || cat.pounce > 0;
      drawCatSprite(ctx, {
        preset: getCatPreset(PLAYER_CAT),
        x: cat.x,
        y: cat.y,
        // Mirror the sprite so the cat faces the way it runs.
        scaleX: cat.facing * (1 + cat.pounce * 0.14),
        scaleY: 1 + cat.pounce * 0.2,
        rotation: lean,
        time,
        expression: caughtSomething ? "happy" : "neutral",
        pawOffset: Math.sin(time * 9) * 3 * Math.min(1, Math.abs(cat.vx) / CAT_SPEED),
        tailWagAmplitude: 0.2 + (caughtSomething ? 0.15 : 0) + Math.min(0.12, Math.abs(cat.vx) / CAT_SPEED / 4),
      });

      if (state.phase === "playing") drawHud(state, width);
      if (state.phase === "idle") drawPrompt(width);
      if (state.phase === "results") drawResults(state, width, CANVAS_HEIGHT);

      animationRef.current = requestAnimationFrame(animate);
    };

    const resize = () => {
      canvas.width = Math.min(CANVAS_WIDTH, window.innerWidth - 40);
      canvas.height = CANVAS_HEIGHT;
    };
    resize();
    window.addEventListener("resize", resize);

    animationRef.current = requestAnimationFrame(animate);

    const MOVE_KEYS = new Set([
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
    ]);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        act();
        return;
      }
      if (MOVE_KEYS.has(event.code)) {
        event.preventDefault();
        keysRef.current[event.code] = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (MOVE_KEYS.has(event.code)) {
        event.preventDefault();
        keysRef.current[event.code] = false;
      }
    };

    const handleBlur = () => {
      // Never leave a key stuck down when the tab loses focus.
      keysRef.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      cancelAnimationFrame(animationRef.current);
    };
  }, [act, changePhase]);

  /** Track the cursor so the cat can chase it; only while a round is live. */
  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerRef.current = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      active: stateRef.current.phase === "playing",
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (stateRef.current.phase !== "playing") {
        act();
        return;
      }
      handlePointerMove(event);
    },
    [act, handlePointerMove]
  );

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  const running = phase === "playing";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-amber-100 to-orange-200 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">🐭 Кот-Охотник 🐭</h1>
      <p className="text-gray-600 mb-4">
        Веди {catName(PLAYER_CAT)} мышкой или WASD / стрелками и лови мышей!{" "}
        <kbd className="px-2 py-1 bg-white/70 rounded font-mono">Пробел</kbd> — начать
      </p>

      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-2xl border-4 border-white touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      />

      <div className="mt-4 flex gap-4">
        <button
          onClick={act}
          disabled={running}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all transform hover:scale-105 ${
            running
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
          }`}
        >
          {running ? "🐾 Охотимся..." : phase === "results" ? "🔁 Ещё раз!" : "🐾 Начать охоту!"}
        </button>
      </div>

      {summary && !running && (
        <p className="mt-3 text-gray-700 text-lg">
          Оценка <span className="font-bold text-green-600">{summary.grade}</span> · {summary.score} очков · поймано{" "}
          {summary.caught}
        </p>
      )}

      <div className="mt-6 text-center text-gray-600 text-sm">
        <p>Охотится: {catName(PLAYER_CAT)}</p>
        <p>Смотрят с дивана: {SPECTATORS.map((id) => catName(id)).join(" и ")}</p>
      </div>
    </div>
  );
}
