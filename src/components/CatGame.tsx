"use client";

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from "react";

import { CAT_COLORS, CAT_IDS, catName, drawCat as drawCatSprite, drawCatBalloon, getCatPreset } from "@/characters";
import type { CatActor, CatId } from "@/characters";

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

interface Trick {
  name: string;
  duration: number;
  sound: "jump" | "spin" | "balloon" | "star" | "stack" | "swim" | "rocket" | "dance";
  execute: (progress: number, cats: Cat[]) => void;
}

/** Stage marks per cat, relative to the canvas centre / bottom edge. */
const STAGE_MARKS: Record<CatId, { x: number; y: number }> = {
  Miuska: { x: -170, y: -150 },
  Aliska: { x: 170, y: -160 },
  Viki: { x: 0, y: -137 },
};

/** The full cast that performs on this stage. */
const CAST = CAT_IDS;

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

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

  const tricks: Trick[] = useMemo(() => [
    {
      name: "Двойной прыжок и Дай пять!",
      duration: 2000,
      sound: "jump",
      execute: (progress, [cat1, cat2, cat3]) => {
        // Both cats jump up
        const jumpPhase = Math.sin(progress * Math.PI);
        cat1.y = cat1.baseY - jumpPhase * 150;
        cat2.y = cat2.baseY - jumpPhase * 120;
        cat3.y = cat3.baseY - jumpPhase * 110;
        
        // Rotate during jump
        cat1.rotation = Math.sin(progress * Math.PI * 2) * 0.3;
        cat2.rotation = -Math.sin(progress * Math.PI * 2) * 0.3;
        cat3.rotation = Math.sin(progress * Math.PI * 2) * 0.25;
        
        // Stretch effect
        cat1.scaleY = 1 + jumpPhase * 0.2;
        cat2.scaleY = 1 + jumpPhase * 0.15;
        cat3.scaleY = 1 + jumpPhase * 0.18;
      },
    },
    {
      name: "Сальто-симфония!",
      duration: 2500,
      sound: "spin",
      execute: (progress, [cat1, cat2, cat3]) => {
        // Full rotation somersaults
        cat1.rotation = progress * Math.PI * 4;
        cat2.rotation = -progress * Math.PI * 4;
        cat3.rotation = progress * Math.PI * 3;
        
        // Bounce up during somersault
        const bounce = Math.abs(Math.sin(progress * Math.PI * 2));
        cat1.y = cat1.baseY - bounce * 100;
        cat2.y = cat2.baseY - bounce * 80;
        cat3.y = cat3.baseY - bounce * 90;
        
        // Squash and stretch
        cat1.scaleX = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
        cat1.scaleY = 1 - Math.sin(progress * Math.PI * 4) * 0.2;
        cat2.scaleX = 1 + Math.sin(progress * Math.PI * 4 + 0.5) * 0.2;
        cat2.scaleY = 1 - Math.sin(progress * Math.PI * 4 + 0.5) * 0.2;
        cat3.scaleX = 1 + Math.sin(progress * Math.PI * 3) * 0.2;
        cat3.scaleY = 1 - Math.sin(progress * Math.PI * 3) * 0.2;
      },
    },
    {
      name: "Превращение в шарики!",
      duration: 3000,
      sound: "balloon",
      execute: (progress, cats) => {
        // Transform into balloons
        const [cat1, cat2, cat3] = cats;
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
          cat1.y = cat1.baseY - 100 - Math.sin(floatProgress * Math.PI * 3) * 30;
          cat2.y = cat2.baseY - 80 - Math.sin(floatProgress * Math.PI * 3 + 1) * 30;
          cat3.y = cat3.baseY - 70 - Math.sin(floatProgress * Math.PI * 3 + 2) * 30;
          cat1.x += Math.sin(floatProgress * Math.PI * 2) * 2;
          cat2.x -= Math.sin(floatProgress * Math.PI * 2) * 2;
          cat3.x += Math.sin(floatProgress * Math.PI * 2 + 1) * 1.5;
        } else {
          // Deflate back
          const deflate = 1 - (progress - 0.7) / 0.3;
          cats.forEach((cat) => {
            cat.scaleX = 1 + deflate * 0.3;
            cat.scaleY = 1 + deflate * 0.5;
          });
          cat1.y = cat1.baseY - deflate * 100;
          cat2.y = cat2.baseY - deflate * 80;
          cat3.y = cat3.baseY - deflate * 70;
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
        const [cat1, cat2, cat3] = cats;
        if (progress < 0.5) {
          // Stars falling
          cats.forEach((cat) => {
            cat.hasStar = true;
            cat.starY = -50 + progress * 2 * 250;
            cat.starOpacity = 1;
          });
          
          // Cats reach up
          const reach = Math.sin(progress * Math.PI * 2);
          cat1.y = cat1.baseY - reach * 30;
          cat2.y = cat2.baseY - reach * 25;
          cat3.y = cat3.baseY - reach * 28;
          cat1.rotation = reach * 0.2;
          cat2.rotation = -reach * 0.2;
          cat3.rotation = reach * 0.25;
        } else {
          // Caught! Celebrate
          const celebrate = (progress - 0.5) / 0.5;
          cats.forEach((cat) => {
            cat.starY = 0;
            cat.starOpacity = 1 - celebrate;
          });
          
          // Happy bounce
          cat1.y = cat1.baseY - Math.abs(Math.sin(celebrate * Math.PI * 3)) * 50;
          cat2.y = cat2.baseY - Math.abs(Math.sin(celebrate * Math.PI * 3 + 0.5)) * 40;
          cat3.y = cat3.baseY - Math.abs(Math.sin(celebrate * Math.PI * 3 + 1)) * 45;
          
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
      execute: (progress, [cat1, cat2, cat3]) => {
        // One cat jumps on top of the other
        if (progress < 0.4) {
          // Preparation - cats move together
          const prep = progress / 0.4;
          cat1.x = cat1.x + (cat2.x - cat1.x) * prep * 0.3;
          cat1.y = cat1.baseY - prep * 100;
          cat2.scaleY = 0.8 + prep * 0.2;
        } else if (progress < 0.7) {
          // Landing on top
          const land = (progress - 0.4) / 0.3;
          cat1.y = cat2.baseY - getCatPreset(cat2.id).height - 20 + land * 20;
          cat1.rotation = land * Math.PI * 2;
          cat2.scaleY = 0.8;
        } else {
          // Jump off
          const off = (progress - 0.7) / 0.3;
          cat1.y = cat1.baseY - Math.sin(off * Math.PI) * 80;
          cat1.rotation = off * Math.PI * 2;
          cat2.scaleY = 0.8 + off * 0.2;
        }
        // The kitten watches the tower eagerly
        const watch = Math.sin(progress * Math.PI * 3);
        cat3.rotation = watch * 0.15;
        cat3.y = cat3.baseY - Math.abs(watch) * 18;
      },
    },
    {
      name: "Синхронное плавание!",
      duration: 2500,
      sound: "swim",
      execute: (progress, [cat1, cat2, cat3]) => {
        // Wave-like swimming motion
        const wave = Math.sin(progress * Math.PI * 4);
        cat1.y = cat1.baseY - 50 + wave * 30;
        cat2.y = cat2.baseY - 40 - wave * 30;
        cat3.y = cat3.baseY - 30 - wave * 20;
        cat1.rotation = wave * 0.4;
        cat2.rotation = -wave * 0.4;
        cat3.rotation = -wave * 0.3;
        cat1.x = cat1.x + Math.cos(progress * Math.PI * 2) * 2;
        cat2.x = cat2.x - Math.cos(progress * Math.PI * 2) * 2;
        cat3.x = cat3.x + Math.cos(progress * Math.PI * 2 + 1) * 1;
        
        // Stretch for swimming effect
        cat1.scaleX = 1 + Math.abs(wave) * 0.1;
        cat2.scaleX = 1 + Math.abs(wave) * 0.1;
        cat3.scaleX = 1 + Math.abs(wave) * 0.12;
      },
    },
    {
      name: "Ракетный запуск!",
      duration: 2000,
      sound: "rocket",
      execute: (progress, cats) => {
        const [cat1, cat2, cat3] = cats;
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
          cat1.scaleY = 1.3;
          cat2.scaleY = 1.3;
          cat3.scaleY = 1.3;
          cat1.y = cat1.baseY - launch * 200;
          cat2.y = cat2.baseY - launch * 180;
          cat3.y = cat3.baseY - launch * 210;
          cat1.rotation = launch * 0.3;
          cat2.rotation = -launch * 0.3;
          cat3.rotation = launch * 0.25;
        } else {
          // Fall back
          const fall = (progress - 0.6) / 0.4;
          cat1.y = cat1.baseY - 200 + fall * 200;
          cat2.y = cat2.baseY - 180 + fall * 180;
          cat3.y = cat3.baseY - 210 + fall * 210;
          cat1.rotation = (1 - fall) * 0.3;
          cat2.rotation = -(1 - fall) * 0.3;
          cat3.rotation = (1 - fall) * 0.25;
          cats.forEach((cat) => {
            cat.scaleY = 1.3 - fall * 0.3;
          });
        }
      },
    },
    {
      name: "Зеркальный танец!",
      duration: 2000,
      sound: "dance",
      execute: (progress, [cat1, cat2, cat3]) => {
        // Mirror each other's movements
        const dance = Math.sin(progress * Math.PI * 6);
        cat1.rotation = dance * 0.5;
        cat2.rotation = -dance * 0.5;
        cat3.rotation = dance * 0.45;
        cat1.scaleX = 1 + dance * 0.1;
        cat2.scaleX = 1 - dance * 0.1;
        cat3.scaleX = 1 + dance * 0.15;
        cat1.y = cat1.baseY - Math.abs(dance) * 30;
        cat2.y = cat2.baseY - Math.abs(dance) * 30;
        cat3.y = cat3.baseY - Math.abs(dance) * 40;
        
        // Slight position mirroring
        cat1.x = cat1.x + dance * 0.5;
        cat2.x = cat2.x - dance * 0.5;
        cat3.x = cat3.x + dance * 0.4;
      },
    },
  ], []);

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
    
    const randomTrick = Math.floor(Math.random() * tricks.length);
    trickStateRef.current.currentTrick = randomTrick;
    trickStateRef.current.trickStartTime = performance.now();
    trickStateRef.current.progress = 0;
    setIsPlaying(true);
    setCurrentTrickName(tricks[randomTrick].name);
    
    // Play the trick sound
    playTrickSound(tricks[randomTrick].sound);
  }, [isPlaying, tricks]);

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
        const trick = tricks[state.currentTrick];
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
  }, [isPlaying, startTrick, drawBackground, drawCat, resetCatPosition, tricks]);

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
