"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Types
interface FallingItem {
  id: number;
  x: number;
  y: number;
  type: "petal" | "confetti" | "bubble" | "star" | "mouse";
  color: string;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  caught: boolean;
  opacity: number;
}

interface Cat {
  x: number;
  y: number;
  baseY: number;
  jumping: boolean;
  jumpHeight: number;
  jumpPhase: number;
  targetX: number | null;
  name: "Miuska" | "Aliska";
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

// Constants
const ITEM_TYPES: Array<"petal" | "confetti" | "bubble" | "star" | "mouse"> = [
  "petal",
  "confetti",
  "bubble",
  "star",
  "mouse",
];

const ITEM_COLORS = {
  petal: ["#FFB7C5", "#FF69B4", "#FFC0CB", "#FF1493", "#DB7093"],
  confetti: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"],
  bubble: ["#87CEEB", "#B0E0E6", "#ADD8E6", "#E0FFFF", "#AFEEEE"],
  star: ["#FFD700", "#FFA500", "#FFEC8B", "#F0E68C", "#FFFACD"],
  mouse: ["#808080", "#A9A9A9", "#696969", "#778899", "#C0C0C0"],
};

const INITIAL_CLOUDS: Cloud[] = [
  { x: 100, y: 60, width: 150, height: 60, speed: 0.3 },
  { x: 350, y: 40, width: 180, height: 70, speed: 0.2 },
  { x: 600, y: 80, width: 140, height: 55, speed: 0.4 },
  { x: 800, y: 50, width: 160, height: 65, speed: 0.25 },
];

export default function CatSkyWonders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Use refs for game state to avoid re-renders during animation
  const itemsRef = useRef<FallingItem[]>([]);
  const catsRef = useRef<Cat[]>([
    { x: 250, y: 420, baseY: 420, jumping: false, jumpHeight: 0, jumpPhase: 0, targetX: null, name: "Miuska" },
    { x: 550, y: 430, baseY: 430, jumping: false, jumpHeight: 0, jumpPhase: 0, targetX: null, name: "Aliska" },
  ]);
  const cloudsRef = useRef<Cloud[]>([...INITIAL_CLOUDS]);
  const caughtCountRef = useRef(0);
  const isRainingRef = useRef(false);
  const itemCounterRef = useRef(0);
  
  // State for UI updates only
  const [caughtCount, setCaughtCount] = useState(0);
  const [isRaining, setIsRaining] = useState(false);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play magical sound
  const playMagicSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.1); // G5
      oscillator.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.2); // C6

      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not available
    }
  }, [getAudioContext]);

  // Play catch sound
  const playCatchSound = useCallback(() => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, [getAudioContext]);

  // Start the magical rain
  const startMagicRain = useCallback(() => {
    if (isRainingRef.current) return;

    isRainingRef.current = true;
    setIsRaining(true);
    caughtCountRef.current = 0;
    setCaughtCount(0);
    playMagicSound();

    // Create falling items
    const newItems: FallingItem[] = [];
    const numItems = 30 + Math.floor(Math.random() * 20);

    for (let i = 0; i < numItems; i++) {
      const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
      const colors = ITEM_COLORS[type];

      newItems.push({
        id: itemCounterRef.current++,
        x: 50 + Math.random() * 700,
        y: -50 - Math.random() * 200,
        type,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 15 + Math.random() * 20,
        speed: 1.5 + Math.random() * 2, // Slower speed
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.02,
        caught: false,
        opacity: 1,
      });
    }

    itemsRef.current = newItems;

    // Make cats start jumping
    catsRef.current = catsRef.current.map((cat) => ({
      ...cat,
      jumping: true,
      jumpPhase: Math.random() * Math.PI * 2,
      targetX: 200 + Math.random() * 400,
    }));

    // Stop after a few seconds
    setTimeout(() => {
      isRainingRef.current = false;
      setIsRaining(false);
      catsRef.current = catsRef.current.map((cat) => ({
        ...cat,
        jumping: false,
        targetX: null,
      }));
    }, 6000);
  }, [playMagicSound]);

  // Draw a cloud
  const drawCloud = useCallback((ctx: CanvasRenderingContext2D, cloud: Cloud) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();

    // Draw fluffy cloud shape
    const cx = cloud.x + cloud.width / 2;
    const cy = cloud.y + cloud.height / 2;

    ctx.arc(cx - cloud.width * 0.25, cy, cloud.height * 0.4, 0, Math.PI * 2);
    ctx.arc(cx, cy - cloud.height * 0.15, cloud.height * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + cloud.width * 0.25, cy, cloud.height * 0.35, 0, Math.PI * 2);
    ctx.arc(cx - cloud.width * 0.1, cy + cloud.height * 0.2, cloud.height * 0.3, 0, Math.PI * 2);
    ctx.arc(cx + cloud.width * 0.15, cy + cloud.height * 0.15, cloud.height * 0.35, 0, Math.PI * 2);

    ctx.fill();

    // Add subtle shadow
    ctx.fillStyle = "rgba(200, 220, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(cx, cy + cloud.height * 0.3, cloud.height * 0.4, 0, Math.PI);
    ctx.fill();
  }, []);

  // Draw a falling item
  const drawItem = useCallback((ctx: CanvasRenderingContext2D, item: FallingItem) => {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    ctx.globalAlpha = item.opacity;

    switch (item.type) {
      case "petal":
        // Draw flower petal
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, item.size * 0.6, item.size, 0, 0, Math.PI * 2);
        ctx.fill();
        // Add highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath();
        ctx.ellipse(-item.size * 0.2, -item.size * 0.3, item.size * 0.15, item.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "confetti":
        // Draw confetti rectangle
        ctx.fillStyle = item.color;
        ctx.fillRect(-item.size / 2, -item.size / 4, item.size, item.size / 2);
        // Add shine
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillRect(-item.size / 2, -item.size / 4, item.size / 3, item.size / 4);
        break;

      case "bubble":
        // Draw bubble
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
        ctx.stroke();
        // Add shine
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(-item.size * 0.15, -item.size * 0.15, item.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "star":
        // Draw star
        ctx.fillStyle = item.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = item.size / 2;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        // Add glow
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        break;

      case "mouse":
        // Draw toy mouse
        ctx.fillStyle = item.color;
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, item.size * 0.5, item.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.arc(-item.size * 0.3, -item.size * 0.25, item.size * 0.15, 0, Math.PI * 2);
        ctx.arc(item.size * 0.3, -item.size * 0.25, item.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(-item.size * 0.1, -item.size * 0.05, 2, 0, Math.PI * 2);
        ctx.arc(item.size * 0.1, -item.size * 0.05, 2, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(item.size * 0.4, 0);
        ctx.quadraticCurveTo(item.size * 0.7, -item.size * 0.2, item.size * 0.6, -item.size * 0.4);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }, []);

  // Draw a cat - unified design based on CatGame.tsx
  const drawCat = useCallback((ctx: CanvasRenderingContext2D, cat: Cat, time: number) => {
    const x = cat.x;
    const y = cat.y - cat.jumpHeight;

    ctx.save();
    ctx.translate(x, y);

    const isMiuska = cat.name === "Miuska";
    const catColor = "#1a1a1a";
    const bellyColor = isMiuska ? "#1a1a1a" : "#f5f5f5";
    const eyeColor = isMiuska ? "#FFD700" : "#4CAF50";
    const scale = isMiuska ? 1 : 1.2;

    ctx.scale(scale, scale);

    // Tail animation
    const tailWag = Math.sin(time * 3) * 0.2;
    ctx.save();
    ctx.rotate(tailWag);
    ctx.fillStyle = catColor;
    ctx.beginPath();
    ctx.moveTo(-30, -10);
    ctx.quadraticCurveTo(-50, -30, -45, -50);
    ctx.quadraticCurveTo(-40, -55, -35, -50);
    ctx.quadraticCurveTo(-40, -30, -25, -10);
    ctx.fill();
    ctx.restore();

    // Back legs
    ctx.fillStyle = catColor;
    ctx.beginPath();
    ctx.ellipse(-15, 35, 12, 18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, 35, 12, 18, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = catColor;
    ctx.beginPath();
    ctx.ellipse(0, 10, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly (for Aliska)
    if (!isMiuska) {
      ctx.fillStyle = bellyColor;
      ctx.beginPath();
      ctx.ellipse(0, 15, 20, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front legs
    ctx.fillStyle = catColor;
    ctx.beginPath();
    ctx.ellipse(-20, 30, 8, 15, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, 30, 8, 15, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Paws (white for Aliska)
    if (!isMiuska) {
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.ellipse(-20, 42, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(20, 42, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head
    ctx.fillStyle = catColor;
    ctx.beginPath();
    ctx.ellipse(0, -25, 25, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(-20, -40);
    ctx.lineTo(-12, -55);
    ctx.lineTo(-5, -38);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, -40);
    ctx.lineTo(12, -55);
    ctx.lineTo(5, -38);
    ctx.closePath();
    ctx.fill();

    // Inner ears
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    ctx.moveTo(-17, -42);
    ctx.lineTo(-12, -52);
    ctx.lineTo(-8, -40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(17, -42);
    ctx.lineTo(12, -52);
    ctx.lineTo(8, -40);
    ctx.closePath();
    ctx.fill();

    // Face markings for Aliska
    if (!isMiuska) {
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.ellipse(0, -20, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    const eyeY = -28;
    const eyeSpacing = 12;

    // Eye whites
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing, eyeY, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing, eyeY, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Irises
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing, eyeY, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing, eyeY, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing, eyeY, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing, eyeY, 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(-eyeSpacing - 1, eyeY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing - 1, eyeY - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#FFB6C1";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-4, -12);
    ctx.lineTo(4, -12);
    ctx.closePath();
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -8);
    ctx.moveTo(-6, -6);
    ctx.quadraticCurveTo(0, -2, 6, -6);
    ctx.stroke();

    // Whiskers
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-20, -15 + i * 5);
      ctx.lineTo(-40, -18 + i * 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, -15 + i * 5);
      ctx.lineTo(40, -18 + i * 8);
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;
    let caughtCountUpdate = 0;

    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      const time = timestamp / 1000;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, "#87CEEB");
      skyGradient.addColorStop(0.5, "#B0E0E6");
      skyGradient.addColorStop(1, "#98FB98");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw sun
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(700, 80, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Update and draw clouds
      cloudsRef.current = cloudsRef.current.map((cloud) => ({
        ...cloud,
        x: cloud.x + cloud.speed > canvas.width ? -cloud.width : cloud.x + cloud.speed,
      }));
      cloudsRef.current.forEach((cloud) => drawCloud(ctx, cloud));

      // Draw ground
      ctx.fillStyle = "#90EE90";
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

      // Draw grass details
      ctx.strokeStyle = "#228B22";
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.width; i += 15) {
        const height = 10 + ((i * 7) % 15);
        ctx.beginPath();
        ctx.moveTo(i, canvas.height - 80);
        ctx.lineTo(i + 3, canvas.height - 80 - height);
        ctx.stroke();
      }

      // Draw flowers on ground
      const flowerPositions = [50, 150, 300, 450, 600, 750];
      flowerPositions.forEach((fx) => {
        // Stem
        ctx.strokeStyle = "#228B22";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx, canvas.height - 80);
        ctx.lineTo(fx, canvas.height - 100);
        ctx.stroke();

        // Petals
        ctx.fillStyle = ["#FF69B4", "#FFB6C1", "#DDA0DD", "#FF6B6B", "#4ECDC4"][
          Math.floor(fx / 150) % 5
        ];
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.ellipse(
            fx + Math.cos(angle) * 6,
            canvas.height - 100 + Math.sin(angle) * 6,
            5,
            8,
            angle,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        // Center
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(fx, canvas.height - 100, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update falling items
      const canvasHeight = canvas.height;
      itemsRef.current = itemsRef.current.filter((item) => {
        if (item.caught || item.y > canvasHeight + 50) return false;

        // Update position
        item.y += item.speed;
        item.x += Math.sin(item.wobble) * 1.5;
        item.wobble += item.wobbleSpeed;
        item.rotation += item.rotationSpeed;

        // Check if cats can catch
        catsRef.current.forEach((cat) => {
          const dx = Math.abs(cat.x - item.x);
          const dy = Math.abs(cat.baseY - cat.jumpHeight - item.y);

          if (dx < 50 && dy < 60 && !item.caught) {
            item.caught = true;
            playCatchSound();
            caughtCountRef.current++;
            caughtCountUpdate++;
          }
        });

        return !item.caught;
      });

      // Draw items
      itemsRef.current.forEach((item) => drawItem(ctx, item));

      // Update cats
      catsRef.current = catsRef.current.map((cat) => {
        let newJumpHeight = cat.jumpHeight;
        let newJumpPhase = cat.jumpPhase;
        let newX = cat.x;

        if (cat.jumping) {
          // Jumping animation
          newJumpPhase += 0.1;
          newJumpHeight = Math.abs(Math.sin(newJumpPhase)) * 80;

          // Move toward target
          if (cat.targetX !== null) {
            const dx = cat.targetX - cat.x;
            newX = cat.x + dx * 0.02;
          }
        } else {
          // Settle down
          newJumpHeight = Math.max(0, newJumpHeight - 5);
        }

        return {
          ...cat,
          x: newX,
          jumpHeight: newJumpHeight,
          jumpPhase: newJumpPhase,
        };
      });

      // Draw cats
      catsRef.current.forEach((cat) => drawCat(ctx, cat, time));

      // Draw UI
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(10, 10, 200, 40);
      ctx.strokeStyle = "#4ECDC4";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 200, 40);

      ctx.fillStyle = "#333";
      ctx.font = "bold 16px Arial";
      ctx.fillText(`✨ Поймано: ${caughtCountRef.current}`, 25, 35);

      // Instructions
      if (!isRainingRef.current) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 - 30, 300, 60);
        ctx.strokeStyle = "#4ECDC4";
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2 - 30, 300, 60);

        ctx.fillStyle = "#333";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Нажми ПРОБЕЛ для волшебного дождя!", canvas.width / 2, canvas.height / 2 + 5);
        ctx.textAlign = "left";
      }

      // Update UI state periodically
      if (caughtCountUpdate > 0) {
        setCaughtCount(caughtCountRef.current);
        caughtCountUpdate = 0;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawCat, drawCloud, drawItem, playCatchSound]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        startMagicRain();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startMagicRain]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
        ✨ Небесные Чудеса ✨
      </h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={startMagicRain}
        className="border-4 border-white rounded-2xl shadow-2xl cursor-pointer"
      />
      <p className="text-white mt-4 text-lg drop-shadow">
        Нажми <kbd className="px-2 py-1 bg-white/20 rounded">Пробел</kbd> или кликни, чтобы пошёл волшебный дождь!
      </p>
      <p className="text-white/80 mt-2 text-sm">
        Смотри, как Миуска и Алиска прыгают и ловят падающие чудеса! 🐱
      </p>
    </div>
  );
}
