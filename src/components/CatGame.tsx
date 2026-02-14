"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface Cat {
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  color: string;
  bellyColor: string;
  eyeColor: string;
  name: string;
  isLarge: boolean;
  // Animation state
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  // For balloon transformation
  isBalloon: boolean;
  balloonColor: string;
  // For star catching
  hasStar: boolean;
  starY: number;
  starOpacity: number;
}

interface Trick {
  name: string;
  duration: number;
  sound: "jump" | "spin" | "balloon" | "star" | "stack" | "swim" | "rocket" | "dance";
  execute: (progress: number, cat1: Cat, cat2: Cat) => void;
}

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
  ctx.fillStyle = "#FFD700";
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
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.restore();
};

export default function CatGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrickName, setCurrentTrickName] = useState("");
  
  const cat1Ref = useRef<Cat>({
    x: 0,
    y: 0,
    baseY: 0,
    width: 80,
    height: 70,
    color: "#1a1a1a",
    bellyColor: "#1a1a1a",
    eyeColor: "#FFD700",
    name: "Midnight",
    isLarge: false,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    isBalloon: false,
    balloonColor: "#FF6B6B",
    hasStar: false,
    starY: 0,
    starOpacity: 0,
  });

  const cat2Ref = useRef<Cat>({
    x: 0,
    y: 0,
    baseY: 0,
    width: 100,
    height: 85,
    color: "#1a1a1a",
    bellyColor: "#FFFFFF",
    eyeColor: "#4CAF50",
    name: "Oreo",
    isLarge: true,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    isBalloon: false,
    balloonColor: "#4ECDC4",
    hasStar: false,
    starY: 0,
    starOpacity: 0,
  });

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
      execute: (progress, cat1, cat2) => {
        // Both cats jump up
        const jumpPhase = Math.sin(progress * Math.PI);
        cat1.y = cat1.baseY - jumpPhase * 150;
        cat2.y = cat2.baseY - jumpPhase * 120;
        
        // Rotate during jump
        cat1.rotation = Math.sin(progress * Math.PI * 2) * 0.3;
        cat2.rotation = -Math.sin(progress * Math.PI * 2) * 0.3;
        
        // Stretch effect
        cat1.scaleY = 1 + jumpPhase * 0.2;
        cat2.scaleY = 1 + jumpPhase * 0.15;
      },
    },
    {
      name: "Сальто-симфония!",
      duration: 2500,
      sound: "spin",
      execute: (progress, cat1, cat2) => {
        // Full rotation somersaults
        cat1.rotation = progress * Math.PI * 4;
        cat2.rotation = -progress * Math.PI * 4;
        
        // Bounce up during somersault
        const bounce = Math.abs(Math.sin(progress * Math.PI * 2));
        cat1.y = cat1.baseY - bounce * 100;
        cat2.y = cat2.baseY - bounce * 80;
        
        // Squash and stretch
        cat1.scaleX = 1 + Math.sin(progress * Math.PI * 4) * 0.2;
        cat1.scaleY = 1 - Math.sin(progress * Math.PI * 4) * 0.2;
        cat2.scaleX = 1 + Math.sin(progress * Math.PI * 4 + 0.5) * 0.2;
        cat2.scaleY = 1 - Math.sin(progress * Math.PI * 4 + 0.5) * 0.2;
      },
    },
    {
      name: "Превращение в шарики!",
      duration: 3000,
      sound: "balloon",
      execute: (progress, cat1, cat2) => {
        // Transform into balloons
        if (progress < 0.3) {
          // Inflate
          const inflate = progress / 0.3;
          cat1.isBalloon = true;
          cat2.isBalloon = true;
          cat1.scaleX = 1 + inflate * 0.3;
          cat1.scaleY = 1 + inflate * 0.5;
          cat2.scaleX = 1 + inflate * 0.3;
          cat2.scaleY = 1 + inflate * 0.5;
        } else if (progress < 0.7) {
          // Float around
          const floatProgress = (progress - 0.3) / 0.4;
          cat1.y = cat1.baseY - 100 - Math.sin(floatProgress * Math.PI * 3) * 30;
          cat2.y = cat2.baseY - 80 - Math.sin(floatProgress * Math.PI * 3 + 1) * 30;
          cat1.x += Math.sin(floatProgress * Math.PI * 2) * 2;
          cat2.x -= Math.sin(floatProgress * Math.PI * 2) * 2;
        } else {
          // Deflate back
          const deflate = 1 - (progress - 0.7) / 0.3;
          cat1.scaleX = 1 + deflate * 0.3;
          cat1.scaleY = 1 + deflate * 0.5;
          cat2.scaleX = 1 + deflate * 0.3;
          cat2.scaleY = 1 + deflate * 0.5;
          cat1.y = cat1.baseY - deflate * 100;
          cat2.y = cat2.baseY - deflate * 80;
          if (progress > 0.95) {
            cat1.isBalloon = false;
            cat2.isBalloon = false;
          }
        }
      },
    },
    {
      name: "Ловля звёзд!",
      duration: 2500,
      sound: "star",
      execute: (progress, cat1, cat2) => {
        // Stars fall and cats catch them
        if (progress < 0.5) {
          // Stars falling
          cat1.hasStar = true;
          cat2.hasStar = true;
          cat1.starY = -50 + progress * 2 * 250;
          cat2.starY = -50 + progress * 2 * 250;
          cat1.starOpacity = 1;
          cat2.starOpacity = 1;
          
          // Cats reach up
          const reach = Math.sin(progress * Math.PI * 2);
          cat1.y = cat1.baseY - reach * 30;
          cat2.y = cat2.baseY - reach * 25;
          cat1.rotation = reach * 0.2;
          cat2.rotation = -reach * 0.2;
        } else {
          // Caught! Celebrate
          const celebrate = (progress - 0.5) / 0.5;
          cat1.starY = 0;
          cat2.starY = 0;
          cat1.starOpacity = 1 - celebrate;
          cat2.starOpacity = 1 - celebrate;
          
          // Happy bounce
          cat1.y = cat1.baseY - Math.abs(Math.sin(celebrate * Math.PI * 3)) * 50;
          cat2.y = cat2.baseY - Math.abs(Math.sin(celebrate * Math.PI * 3 + 0.5)) * 40;
          
          if (progress > 0.9) {
            cat1.hasStar = false;
            cat2.hasStar = false;
          }
        }
      },
    },
    {
      name: "Кошачья башня!",
      duration: 2000,
      sound: "stack",
      execute: (progress, cat1, cat2) => {
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
          cat1.y = cat2.baseY - cat2.height - 20 + land * 20;
          cat1.rotation = land * Math.PI * 2;
          cat2.scaleY = 0.8;
        } else {
          // Jump off
          const off = (progress - 0.7) / 0.3;
          cat1.y = cat1.baseY - Math.sin(off * Math.PI) * 80;
          cat1.rotation = off * Math.PI * 2;
          cat2.scaleY = 0.8 + off * 0.2;
        }
      },
    },
    {
      name: "Синхронное плавание!",
      duration: 2500,
      sound: "swim",
      execute: (progress, cat1, cat2) => {
        // Wave-like swimming motion
        const wave = Math.sin(progress * Math.PI * 4);
        cat1.y = cat1.baseY - 50 + wave * 30;
        cat2.y = cat2.baseY - 40 - wave * 30;
        cat1.rotation = wave * 0.4;
        cat2.rotation = -wave * 0.4;
        cat1.x = cat1.x + Math.cos(progress * Math.PI * 2) * 2;
        cat2.x = cat2.x - Math.cos(progress * Math.PI * 2) * 2;
        
        // Stretch for swimming effect
        cat1.scaleX = 1 + Math.abs(wave) * 0.1;
        cat2.scaleX = 1 + Math.abs(wave) * 0.1;
      },
    },
    {
      name: "Ракетный запуск!",
      duration: 2000,
      sound: "rocket",
      execute: (progress, cat1, cat2) => {
        if (progress < 0.3) {
          // Crouch down
          const crouch = progress / 0.3;
          cat1.scaleY = 1 - crouch * 0.3;
          cat2.scaleY = 1 - crouch * 0.3;
          cat1.y = cat1.baseY + crouch * 20;
          cat2.y = cat2.baseY + crouch * 20;
        } else if (progress < 0.6) {
          // Launch up!
          const launch = (progress - 0.3) / 0.3;
          cat1.scaleY = 1.3;
          cat2.scaleY = 1.3;
          cat1.y = cat1.baseY - launch * 200;
          cat2.y = cat2.baseY - launch * 180;
          cat1.rotation = launch * 0.3;
          cat2.rotation = -launch * 0.3;
        } else {
          // Fall back
          const fall = (progress - 0.6) / 0.4;
          cat1.y = cat1.baseY - 200 + fall * 200;
          cat2.y = cat2.baseY - 180 + fall * 180;
          cat1.rotation = (1 - fall) * 0.3;
          cat2.rotation = -(1 - fall) * 0.3;
          cat1.scaleY = 1.3 - fall * 0.3;
          cat2.scaleY = 1.3 - fall * 0.3;
        }
      },
    },
    {
      name: "Зеркальный танец!",
      duration: 2000,
      sound: "dance",
      execute: (progress, cat1, cat2) => {
        // Mirror each other's movements
        const dance = Math.sin(progress * Math.PI * 6);
        cat1.rotation = dance * 0.5;
        cat2.rotation = -dance * 0.5;
        cat1.scaleX = 1 + dance * 0.1;
        cat2.scaleX = 1 - dance * 0.1;
        cat1.y = cat1.baseY - Math.abs(dance) * 30;
        cat2.y = cat2.baseY - Math.abs(dance) * 30;
        
        // Slight position mirroring
        cat1.x = cat1.x + dance * 0.5;
        cat2.x = cat2.x - dance * 0.5;
      },
    },
  ], []);

  const drawCat = useCallback((ctx: CanvasRenderingContext2D, cat: Cat, isBlinking: boolean) => {
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.rotate(cat.rotation);
    ctx.scale(cat.scaleX, cat.scaleY);
    ctx.globalAlpha = cat.opacity;

    if (cat.isBalloon) {
      // Draw balloon cat
      ctx.beginPath();
      ctx.ellipse(0, -cat.height / 2, cat.width / 2 + 10, cat.height / 2 + 20, 0, 0, Math.PI * 2);
      ctx.fillStyle = cat.balloonColor;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Balloon string
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, 30, 0, 60);
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Cat face on balloon
      // Eyes
      ctx.fillStyle = cat.eyeColor;
      ctx.beginPath();
      ctx.ellipse(-15, -cat.height / 2 - 5, 8, isBlinking ? 2 : 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(15, -cat.height / 2 - 5, 8, isBlinking ? 2 : 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      if (!isBlinking) {
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(-15, -cat.height / 2 - 5, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(15, -cat.height / 2 - 5, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nose
      ctx.fillStyle = "#FFB6C1";
      ctx.beginPath();
      ctx.moveTo(0, -cat.height / 2 + 10);
      ctx.lineTo(-5, -cat.height / 2 + 18);
      ctx.lineTo(5, -cat.height / 2 + 18);
      ctx.closePath();
      ctx.fill();

      // Whiskers
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      [-1, 1].forEach((side) => {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(side * 15, -cat.height / 2 + 15 + i * 5);
          ctx.lineTo(side * 35, -cat.height / 2 + 10 + i * 8);
          ctx.stroke();
        }
      });
    } else {
      // Draw normal cat
      const bodyOffset = cat.height / 2;

      // Body
      ctx.beginPath();
      ctx.ellipse(0, bodyOffset, cat.width / 2, cat.height / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = cat.color;
      ctx.fill();

      // Belly (for Oreo)
      if (cat.bellyColor !== cat.color) {
        ctx.beginPath();
        ctx.ellipse(0, bodyOffset + 5, cat.width / 3, cat.height / 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = cat.bellyColor;
        ctx.fill();
      }

      // Head
      const headY = -cat.height / 4;
      ctx.beginPath();
      ctx.ellipse(0, headY, cat.width / 2.5, cat.height / 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = cat.color;
      ctx.fill();

      // Ears
      const earSize = cat.isLarge ? 18 : 14;
      ctx.beginPath();
      ctx.moveTo(-cat.width / 3, headY - cat.height / 4);
      ctx.lineTo(-cat.width / 4 - earSize / 2, headY - cat.height / 2 - earSize);
      ctx.lineTo(-cat.width / 6, headY - cat.height / 5);
      ctx.closePath();
      ctx.fillStyle = cat.color;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cat.width / 3, headY - cat.height / 4);
      ctx.lineTo(cat.width / 4 + earSize / 2, headY - cat.height / 2 - earSize);
      ctx.lineTo(cat.width / 6, headY - cat.height / 5);
      ctx.closePath();
      ctx.fill();

      // Inner ears
      ctx.fillStyle = "#FFB6C1";
      ctx.beginPath();
      ctx.moveTo(-cat.width / 3 + 3, headY - cat.height / 4);
      ctx.lineTo(-cat.width / 4 - earSize / 3, headY - cat.height / 2 - earSize / 1.5);
      ctx.lineTo(-cat.width / 6 - 2, headY - cat.height / 5);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cat.width / 3 - 3, headY - cat.height / 4);
      ctx.lineTo(cat.width / 4 + earSize / 3, headY - cat.height / 2 - earSize / 1.5);
      ctx.lineTo(cat.width / 6 + 2, headY - cat.height / 5);
      ctx.closePath();
      ctx.fill();

      // Eyes
      const eyeY = headY - 5;
      const eyeSpacing = cat.width / 6;
      ctx.fillStyle = cat.eyeColor;
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing, eyeY, 10, isBlinking ? 2 : 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(eyeSpacing, eyeY, 10, isBlinking ? 2 : 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      if (!isBlinking) {
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(-eyeSpacing, eyeY, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(eyeSpacing, eyeY, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(-eyeSpacing - 2, eyeY - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeSpacing - 2, eyeY - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nose
      ctx.fillStyle = "#FFB6C1";
      ctx.beginPath();
      ctx.moveTo(0, eyeY + 15);
      ctx.lineTo(-6, eyeY + 23);
      ctx.lineTo(6, eyeY + 23);
      ctx.closePath();
      ctx.fill();

      // Mouth
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, eyeY + 23);
      ctx.lineTo(0, eyeY + 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-8, eyeY + 30, 8, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, eyeY + 30, 8, 0, Math.PI, true);
      ctx.stroke();

      // Whiskers
      ctx.strokeStyle = cat.color === "#1a1a1a" ? "#555" : "#333";
      ctx.lineWidth = 1.5;
      [-1, 1].forEach((side) => {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(side * 12, eyeY + 20 + i * 5);
          ctx.lineTo(side * 40, eyeY + 15 + i * 8);
          ctx.stroke();
        }
      });

      // Front paws
      const pawY = bodyOffset + cat.height / 3;
      ctx.fillStyle = cat.bellyColor === "#FFFFFF" ? "#FFFFFF" : cat.color;
      
      // Left paw
      ctx.beginPath();
      ctx.ellipse(-cat.width / 4, pawY, 15, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Right paw
      ctx.beginPath();
      ctx.ellipse(cat.width / 4, pawY, 15, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Paw details
      ctx.fillStyle = cat.bellyColor === "#FFFFFF" ? "#1a1a1a" : "#333";
      for (let i = 0; i < 3; i++) {
        // Left paw toes
        ctx.beginPath();
        ctx.ellipse(-cat.width / 4 - 8 + i * 8, pawY + 5, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right paw toes
        ctx.beginPath();
        ctx.ellipse(cat.width / 4 - 8 + i * 8, pawY + 5, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tail
      ctx.strokeStyle = cat.color;
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cat.width / 3, bodyOffset);
      ctx.quadraticCurveTo(
        cat.width / 2 + 30,
        bodyOffset - 20,
        cat.width / 2 + 20,
        bodyOffset - 50
      );
      ctx.stroke();

      // Star if catching
      if (cat.hasStar && cat.starOpacity > 0) {
        drawStar(ctx, 0, headY - 50 + cat.starY, 20, cat.starOpacity);
      }
    }

    ctx.restore();
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
    const cat1 = cat1Ref.current;
    const cat2 = cat2Ref.current;
    
    cat1.x = canvas.width / 2 - 120;
    cat1.y = canvas.height - 150;
    cat1.baseY = canvas.height - 150;
    cat1.rotation = 0;
    cat1.scaleX = 1;
    cat1.scaleY = 1;
    cat1.opacity = 1;
    cat1.isBalloon = false;
    cat1.hasStar = false;
    cat1.starY = 0;
    cat1.starOpacity = 0;

    cat2.x = canvas.width / 2 + 80;
    cat2.y = canvas.height - 160;
    cat2.baseY = canvas.height - 160;
    cat2.rotation = 0;
    cat2.scaleX = 1;
    cat2.scaleY = 1;
    cat2.opacity = 1;
    cat2.isBalloon = false;
    cat2.hasStar = false;
    cat2.starY = 0;
    cat2.starOpacity = 0;
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
    const cat1InitialX = cat1Ref.current.x;
    const cat2InitialX = cat2Ref.current.x;

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      drawBackground(ctx, canvas.width, canvas.height, time);

      const state = trickStateRef.current;
      const cat1 = cat1Ref.current;
      const cat2 = cat2Ref.current;

      if (isPlaying) {
        const trick = tricks[state.currentTrick];
        const elapsed = time - state.trickStartTime;
        state.progress = Math.min(elapsed / trick.duration, 1);

        // Execute trick
        trick.execute(state.progress, cat1, cat2);

        if (state.progress >= 1) {
          setIsPlaying(false);
          setCurrentTrickName("");
          resetCatPosition(canvas);
          cat1.x = cat1InitialX;
          cat2.x = cat2InitialX;
        }
      } else {
        // Idle animation - gentle breathing
        state.idleTime = time;
        state.breathePhase = Math.sin(time * 0.002) * 0.03;
        cat1.scaleY = 1 + state.breathePhase;
        cat2.scaleY = 1 + state.breathePhase * 0.8;

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
      drawCat(ctx, cat1, state.isBlinking);
      drawCat(ctx, cat2, state.isBlinking);

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
        <p>Наши звёзды: <span className="font-semibold text-gray-700">Миднайт</span> (чёрный кот с жёлтыми глазами) и <span className="font-semibold text-gray-700">Орео</span> (чёрно-белый кот с зелёными глазами)</p>
      </div>
    </div>
  );
}
