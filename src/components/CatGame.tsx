"use client";

import { Fragment, useEffect, useRef, useState, useCallback } from "react";

import { CAT_COLORS, CAT_IDS, catName, drawCat as drawCatSprite, drawCatBalloon, getCatPreset } from "@/characters";
import type { CatActor, CatId } from "@/characters";
import { getAudioContext } from "@/lib/audio";
import { CAST, STAGE_MARKS, TRICKS, type Trick } from "./cat-acrobatics";

interface Cat extends CatActor {
  baseY: number;
  // Animation state
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  // For balloon transformation
  isBalloon: boolean;
  // For star catching
  hasStar: boolean;
  starY: number;
  starOpacity: number;
}



// Play trick-specific sounds
const playTrickSound = (type: Trick["sound"]) => {
  try {
    const ctx = getAudioContext();
    
    switch (type) {
      case "jump": {
        // Bouncy jump sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      }
      case "spin": {
        // Spinning whoosh sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        for (let i = 0; i < 4; i++) {
          osc.frequency.setValueAtTime(300 + i * 100, ctx.currentTime + i * 0.15);
        }
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
        break;
      }
      case "balloon": {
        // Magical inflation sound
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc2.type = "triangle";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
        osc2.frequency.setValueAtTime(400, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        osc2.stop(ctx.currentTime + 0.5);
        break;
      }
      case "star": {
        // Sparkling star sound
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(800 + i * 200, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.2);
        }
        break;
      }
      case "stack": {
        // Playful stack sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.setValueAtTime(300, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(450, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        break;
      }
      case "swim": {
        // Watery swimming sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.setValueAtTime(250, ctx.currentTime + 0.2);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        break;
      }
      case "rocket": {
        // Rocket launch sound
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc2.type = "square";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
        osc2.frequency.setValueAtTime(50, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
        break;
      }
      case "dance": {
        // Rhythmic dance beat
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = i % 2 === 0 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(300 + i * 50, ctx.currentTime + i * 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.15);
          osc.start(ctx.currentTime + i * 0.1);
          osc.stop(ctx.currentTime + i * 0.1 + 0.15);
        }
        break;
      }
    }
  } catch (e) {
    console.log("Audio not available");
  }
};

// Helper function to draw star - defined outside component
const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) => {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = CAT_COLORS.star;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  
  // Glow effect
  ctx.shadowColor = CAT_COLORS.star;
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.restore();
};

export default function CatGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrickName, setCurrentTrickName] = useState("");
  
  const catsRef = useRef<Cat[]>(
    CAT_IDS.map((id) => ({
      x: 0,
      y: 0,
      baseY: 0,
      id,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      isBalloon: false,
      hasStar: false,
      starY: 0,
      starOpacity: 0,
    }))
  );

  const trickStateRef = useRef({
    currentTrick: 0,
    progress: 0,
    trickStartTime: 0,
    idleTime: 0,
    breathePhase: 0,
    blinkTimer: 0,
    isBlinking: false,
  });



  const drawCat = useCallback((ctx: CanvasRenderingContext2D, cat: Cat, isBlinking: boolean, time: number = 0) => {
    const preset = getCatPreset(cat.id);
    const sprite = {
      preset,
      x: cat.x,
      y: cat.y,
      rotation: cat.rotation,
      scaleX: cat.scaleX,
      scaleY: cat.scaleY,
      opacity: cat.opacity,
      time,
      blinking: isBlinking,
    };

    if (cat.isBalloon) {
      drawCatBalloon(ctx, sprite);
      return;
    }

    drawCatSprite(ctx, sprite);

    // Star if catching — drawn in the cat's own scaled space
    if (cat.hasStar && cat.starOpacity > 0) {
      ctx.save();
      ctx.translate(cat.x, cat.y);
      ctx.rotate(cat.rotation);
      ctx.scale(cat.scaleX * preset.scale, cat.scaleY * preset.scale);
      drawStar(ctx, 0, -50 + cat.starY, 20, cat.starOpacity);
      ctx.restore();
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(0.5, "#B0E0E6");
    gradient.addColorStop(1, "#98FB98");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sun
    const sunX = width - 100;
    const sunY = 80;
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    // Sun rays
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12 + time * 0.001;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(angle) * 50, sunY + Math.sin(angle) * 50);
      ctx.lineTo(sunX + Math.cos(angle) * 70, sunY + Math.sin(angle) * 70);
      ctx.stroke();
    }

    // Clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const drawCloud = (x: number, y: number, scale: number) => {
      ctx.beginPath();
      ctx.arc(x, y, 25 * scale, 0, Math.PI * 2);
      ctx.arc(x + 25 * scale, y - 10 * scale, 30 * scale, 0, Math.PI * 2);
      ctx.arc(x + 50 * scale, y, 25 * scale, 0, Math.PI * 2);
      ctx.arc(x + 25 * scale, y + 10 * scale, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
    };

    drawCloud(100 + Math.sin(time * 0.0005) * 20, 60, 1);
    drawCloud(300 + Math.sin(time * 0.0003 + 1) * 15, 100, 0.8);
    drawCloud(500 + Math.sin(time * 0.0004 + 2) * 25, 50, 1.2);

    // Ground
    ctx.fillStyle = "#7CFC00";
    ctx.fillRect(0, height - 80, width, 80);

    // Grass details
    ctx.strokeStyle = "#228B22";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 15) {
      const grassHeight = 10 + Math.sin(i * 0.1 + time * 0.002) * 5;
      ctx.beginPath();
      ctx.moveTo(i, height - 80);
      ctx.lineTo(i + 5, height - 80 - grassHeight);
      ctx.stroke();
    }

    // Flowers
    const flowerColors = ["#FF69B4", "#FF6347", "#9370DB", "#FFD700"];
    for (let i = 50; i < width; i += 100) {
      const flowerY = height - 90;
      ctx.fillStyle = "#228B22";
      ctx.fillRect(i - 1, flowerY, 2, 15);
      
      ctx.fillStyle = flowerColors[Math.floor(i / 100) % flowerColors.length];
      for (let j = 0; j < 5; j++) {
        const angle = (j * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.ellipse(
          i + Math.cos(angle) * 6,
          flowerY + Math.sin(angle) * 6,
          5,
          5,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(i, flowerY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const resetCatPosition = useCallback((canvas: HTMLCanvasElement) => {
    catsRef.current.forEach((cat) => {
      const mark = STAGE_MARKS[cat.id];
      cat.x = canvas.width / 2 + mark.x;
      cat.y = canvas.height + mark.y;
      cat.baseY = canvas.height + mark.y;
      cat.rotation = 0;
      cat.scaleX = 1;
      cat.scaleY = 1;
      cat.opacity = 1;
      cat.isBalloon = false;
      cat.hasStar = false;
      cat.starY = 0;
      cat.starOpacity = 0;
    });
  }, []);

  const startTrick = useCallback(() => {
    if (isPlaying) return;
    
    const randomTrick = Math.floor(Math.random() * TRICKS.length);
    trickStateRef.current.currentTrick = randomTrick;
    trickStateRef.current.trickStartTime = performance.now();
    trickStateRef.current.progress = 0;
    setIsPlaying(true);
    setCurrentTrickName(TRICKS[randomTrick].name);
    
    // Play the trick sound
    playTrickSound(TRICKS[randomTrick].sound);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = Math.min(800, window.innerWidth - 40);
      canvas.height = 500;
      resetCatPosition(canvas);
    };
    resize();
    window.addEventListener("resize", resize);

    // Store initial positions
    const initialXs = catsRef.current.map((cat) => cat.x);

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      drawBackground(ctx, canvas.width, canvas.height, time);

      const state = trickStateRef.current;
      const cats = catsRef.current;

      if (isPlaying) {
        const trick = TRICKS[state.currentTrick];
        const elapsed = time - state.trickStartTime;
        state.progress = Math.min(elapsed / trick.duration, 1);

        // Execute trick
        trick.execute(state.progress, cats);

        if (state.progress >= 1) {
          setIsPlaying(false);
          setCurrentTrickName("");
          resetCatPosition(canvas);
          cats.forEach((cat, i) => {
            cat.x = initialXs[i];
          });
        }
      } else {
        // Idle animation - gentle breathing
        state.idleTime = time;
        state.breathePhase = Math.sin(time * 0.002) * 0.03;
        cats.forEach((cat, i) => {
          cat.scaleY = 1 + state.breathePhase * (1 - i * 0.2);
        });

        // Occasional blinking
        state.blinkTimer += 16;
        if (state.blinkTimer > 3000 + Math.random() * 2000) {
          state.isBlinking = true;
          state.blinkTimer = 0;
        }
        if (state.isBlinking && state.blinkTimer > 150) {
          state.isBlinking = false;
        }
      }

      // Draw cats
      cats.forEach((cat) => drawCat(ctx, cat, state.isBlinking, time / 1000));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Keyboard handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        startTrick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, startTrick, drawBackground, drawCat, resetCatPosition]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-green-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">🐱 Кошачьи Акробаты! 🐱</h1>
      <p className="text-gray-600 mb-4">Нажми <kbd className="px-2 py-1 bg-gray-200 rounded font-mono">Пробел</kbd> или кнопку, чтобы увидеть трюки!</p>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl border-4 border-white"
          onClick={startTrick}
        />
        
        {currentTrickName && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg">
            <span className="text-lg font-semibold text-purple-600">✨ {currentTrickName} ✨</span>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={startTrick}
          disabled={isPlaying}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all transform hover:scale-105 ${
            isPlaying
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
          }`}
        >
          {isPlaying ? "Выступаем..." : "🎪 Показать трюк! 🎪"}
        </button>
      </div>

      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>
          Наши звёзды:{" "}
          {CAST.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && (i === CAST.length - 1 ? " и " : ", ")}
              <span className="font-semibold text-gray-700">{catName(id)}</span> ({getCatPreset(id).description})
            </Fragment>
          ))}
        </p>
      </div>
    </div>
  );
}
