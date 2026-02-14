"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Types
interface HidingSpot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "pillow" | "box" | "curtain" | "basket" | "blanket";
}

interface Toy {
  id: string;
  type: "ball" | "yarn" | "fish" | "mouse" | "feather" | "star";
  x: number;
  y: number;
  hidingSpotId: string;
  discovered: boolean;
  color: string;
}

interface Cat {
  name: "Midnight" | "Oreo";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  isDiscovering: boolean;
  discoveredToy: Toy | null;
}

// Hiding spots configuration
const HIDING_SPOTS: HidingSpot[] = [
  { id: "pillow", name: "Под подушкой", x: 100, y: 280, width: 120, height: 60, type: "pillow" },
  { id: "box", name: "В коробке", x: 280, y: 320, width: 100, height: 80, type: "box" },
  { id: "curtain", name: "За занавеской", x: 450, y: 200, width: 80, height: 200, type: "curtain" },
  { id: "basket", name: "В корзине", x: 580, y: 300, width: 90, height: 70, type: "basket" },
  { id: "blanket", name: "Под одеялом", x: 700, y: 280, width: 130, height: 80, type: "blanket" },
];

// Toy types with colors
const TOY_TYPES: { type: Toy["type"]; name: string; color: string; emoji: string }[] = [
  { type: "ball", name: "Мячик", color: "#FF6B6B", emoji: "⚽" },
  { type: "yarn", name: "Клубок", color: "#9B59B6", emoji: "🧶" },
  { type: "fish", name: "Рыбка", color: "#3498DB", emoji: "🐟" },
  { type: "mouse", name: "Мышка", color: "#95A5A6", emoji: "🐭" },
  { type: "feather", name: "Перышко", color: "#2ECC71", emoji: "🪶" },
  { type: "star", name: "Звёздочка", color: "#F1C40F", emoji: "⭐" },
];

export default function CatHiddenToys() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [toys, setToys] = useState<Toy[]>([]);
  const [cats, setCats] = useState<Cat[]>([
    { name: "Midnight", x: 200, y: 400, targetX: 200, targetY: 400, isMoving: false, isDiscovering: false, discoveredToy: null },
    { name: "Oreo", x: 600, y: 420, targetX: 600, targetY: 420, isMoving: false, isDiscovering: false, discoveredToy: null },
  ]);
  const [discoveryAnimation, setDiscoveryAnimation] = useState<{
    active: boolean;
    x: number;
    y: number;
    progress: number;
    toy: Toy | null;
  }>({ active: false, x: 0, y: 0, progress: 0, toy: null });

  const [message, setMessage] = useState("Нажми Пробел — кошки найдут игрушки!");

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play discovery sound
  const playDiscoverySound = useCallback((toyType: Toy["type"]) => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Different sounds for different toys
    const frequencies: Record<Toy["type"], number[]> = {
      ball: [523, 659, 784], // C major arpeggio
      yarn: [392, 494, 587], // G major
      fish: [330, 415, 523], // E minor
      mouse: [440, 554, 659], // A major
      feather: [294, 370, 440], // D major
      star: [523, 659, 784, 1047], // C major with octave
    };

    const freqs = frequencies[toyType] || frequencies.ball;
    let noteIndex = 0;

    oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    // Play arpeggio
    const playNote = () => {
      if (noteIndex < freqs.length) {
        oscillator.frequency.setValueAtTime(freqs[noteIndex], ctx.currentTime);
        noteIndex++;
        setTimeout(playNote, 100);
      }
    };
    playNote();

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  }, [getAudioContext]);

  // Draw the room background
  const drawRoom = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Floor
    const floorGradient = ctx.createLinearGradient(0, height * 0.5, 0, height);
    floorGradient.addColorStop(0, "#DEB887");
    floorGradient.addColorStop(1, "#D2691E");
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, height * 0.5, width, height * 0.5);

    // Floor pattern
    ctx.strokeStyle = "#C4A574";
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, height * 0.5);
      ctx.lineTo(i + 30, height);
      ctx.stroke();
    }

    // Walls
    const wallGradient = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    wallGradient.addColorStop(0, "#FFF8DC");
    wallGradient.addColorStop(1, "#F5DEB3");
    ctx.fillStyle = wallGradient;
    ctx.fillRect(0, 0, width, height * 0.5);

    // Wallpaper pattern
    ctx.fillStyle = "#E8DCC8";
    for (let y = 20; y < height * 0.5; y += 40) {
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Window
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(width * 0.7, 30, 120, 150);
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 8;
    ctx.strokeRect(width * 0.7, 30, 120, 150);
    ctx.beginPath();
    ctx.moveTo(width * 0.7 + 60, 30);
    ctx.lineTo(width * 0.7 + 60, 180);
    ctx.moveTo(width * 0.7, 105);
    ctx.lineTo(width * 0.7 + 120, 105);
    ctx.stroke();

    // Sun outside window
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(width * 0.7 + 90, 70, 20, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  // Draw hiding spots
  const drawHidingSpots = useCallback((ctx: CanvasRenderingContext2D) => {
    HIDING_SPOTS.forEach((spot) => {
      ctx.save();

      switch (spot.type) {
        case "pillow":
          // Pillow shape
          ctx.fillStyle = "#E8B4B8";
          ctx.beginPath();
          ctx.ellipse(spot.x + spot.width / 2, spot.y + spot.height / 2, spot.width / 2, spot.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#D49A9E";
          ctx.lineWidth = 3;
          ctx.stroke();
          // Pillow pattern
          ctx.fillStyle = "#F5D5D8";
          ctx.beginPath();
          ctx.ellipse(spot.x + spot.width / 2, spot.y + spot.height / 2, spot.width / 4, spot.height / 4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case "box":
          // Cardboard box
          ctx.fillStyle = "#C4A484";
          ctx.fillRect(spot.x, spot.y, spot.width, spot.height);
          ctx.strokeStyle = "#8B7355";
          ctx.lineWidth = 3;
          ctx.strokeRect(spot.x, spot.y, spot.width, spot.height);
          // Box flaps
          ctx.fillStyle = "#B8956E";
          ctx.beginPath();
          ctx.moveTo(spot.x, spot.y);
          ctx.lineTo(spot.x + spot.width / 2, spot.y - 15);
          ctx.lineTo(spot.x + spot.width, spot.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case "curtain":
          // Curtain rod
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(spot.x - 20, spot.y - 10, spot.width + 40, 10);
          // Curtain fabric
          const curtainGradient = ctx.createLinearGradient(spot.x, 0, spot.x + spot.width, 0);
          curtainGradient.addColorStop(0, "#8B0000");
          curtainGradient.addColorStop(0.5, "#A52A2A");
          curtainGradient.addColorStop(1, "#8B0000");
          ctx.fillStyle = curtainGradient;
          ctx.fillRect(spot.x, spot.y, spot.width, spot.height);
          // Curtain folds
          ctx.strokeStyle = "#6B0000";
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(spot.x + (spot.width / 4) * i, spot.y);
            ctx.quadraticCurveTo(
              spot.x + (spot.width / 4) * i + 10,
              spot.y + spot.height / 2,
              spot.x + (spot.width / 4) * i,
              spot.y + spot.height
            );
            ctx.stroke();
          }
          break;

        case "basket":
          // Woven basket
          ctx.fillStyle = "#D2691E";
          ctx.beginPath();
          ctx.ellipse(spot.x + spot.width / 2, spot.y + spot.height - 10, spot.width / 2, spot.height / 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#8B4513";
          ctx.lineWidth = 4;
          ctx.stroke();
          // Basket weave pattern
          ctx.strokeStyle = "#A0522D";
          ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(spot.x + spot.width / 2, spot.y + spot.height - 20 - i * 15, spot.width / 2 - i * 5, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;

        case "blanket":
          // Blanket on floor
          const blanketGradient = ctx.createLinearGradient(spot.x, spot.y, spot.x + spot.width, spot.y + spot.height);
          blanketGradient.addColorStop(0, "#4169E1");
          blanketGradient.addColorStop(0.5, "#6495ED");
          blanketGradient.addColorStop(1, "#4169E1");
          ctx.fillStyle = blanketGradient;
          ctx.beginPath();
          ctx.moveTo(spot.x + 10, spot.y);
          ctx.lineTo(spot.x + spot.width - 10, spot.y);
          ctx.quadraticCurveTo(spot.x + spot.width + 10, spot.y + spot.height / 2, spot.x + spot.width - 10, spot.y + spot.height);
          ctx.lineTo(spot.x + 10, spot.y + spot.height);
          ctx.quadraticCurveTo(spot.x - 10, spot.y + spot.height / 2, spot.x + 10, spot.y);
          ctx.fill();
          // Blanket folds
          ctx.strokeStyle = "#3158C7";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(spot.x + 20, spot.y + 10);
          ctx.quadraticCurveTo(spot.x + spot.width / 2, spot.y + spot.height / 2, spot.x + spot.width - 20, spot.y + 10);
          ctx.stroke();
          break;
      }

      ctx.restore();
    });
  }, []);

  // Draw a cat
  const drawCat = useCallback((ctx: CanvasRenderingContext2D, cat: Cat, time: number) => {
    ctx.save();
    ctx.translate(cat.x, cat.y);

    const isMidnight = cat.name === "Midnight";
    const catColor = isMidnight ? "#1a1a1a" : "#2d2d2d";
    const bellyColor = isMidnight ? "#1a1a1a" : "#f5f5f5";
    const eyeColor = isMidnight ? "#FFD700" : "#4CAF50";
    const scale = isMidnight ? 1 : 1.2;

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

    // Belly (for Oreo)
    if (!isMidnight) {
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

    // Paws (white for Oreo)
    if (!isMidnight) {
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

    // Face markings for Oreo
    if (!isMidnight) {
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

    // Mysterious expression - slightly squinting
    if (!cat.isMoving && !cat.isDiscovering) {
      ctx.strokeStyle = catColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-eyeSpacing - 10, eyeY);
      ctx.lineTo(-eyeSpacing + 10, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeSpacing - 10, eyeY);
      ctx.lineTo(eyeSpacing + 10, eyeY);
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  // Draw a toy
  const drawToy = useCallback((ctx: CanvasRenderingContext2D, toy: Toy, time: number) => {
    if (!toy.discovered) return;

    ctx.save();
    ctx.translate(toy.x, toy.y);

    // Bounce animation
    const bounce = Math.abs(Math.sin(time * 2)) * 5;

    switch (toy.type) {
      case "ball":
        // Bouncing ball
        ctx.fillStyle = toy.color;
        ctx.beginPath();
        ctx.arc(0, -bounce, 20, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(-5, -bounce - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        // Stripes
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -bounce, 20, 0.5, 2.5);
        ctx.stroke();
        break;

      case "yarn":
        // Yarn ball
        ctx.fillStyle = toy.color;
        ctx.beginPath();
        ctx.arc(0, -bounce, 18, 0, Math.PI * 2);
        ctx.fill();
        // Yarn threads
        ctx.strokeStyle = "#7D3C98";
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(
            Math.cos(i * 1.2) * 10,
            -bounce + Math.sin(i * 1.2) * 10,
            12 + i * 2,
            i,
            i + 2
          );
          ctx.stroke();
        }
        // Loose thread
        ctx.strokeStyle = toy.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, -bounce);
        ctx.quadraticCurveTo(30, -bounce - 20, 25, -bounce - 40);
        ctx.stroke();
        break;

      case "fish":
        // Toy fish
        ctx.fillStyle = toy.color;
        ctx.beginPath();
        ctx.ellipse(0, -bounce, 25, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        ctx.moveTo(20, -bounce);
        ctx.lineTo(35, -bounce - 10);
        ctx.lineTo(35, -bounce + 10);
        ctx.closePath();
        ctx.fill();
        // Eye
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(-12, -bounce - 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-11, -bounce - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        // Fins
        ctx.fillStyle = "#2980B9";
        ctx.beginPath();
        ctx.moveTo(0, -bounce - 10);
        ctx.lineTo(-5, -bounce - 20);
        ctx.lineTo(5, -bounce - 10);
        ctx.closePath();
        ctx.fill();
        break;

      case "mouse":
        // Toy mouse
        ctx.fillStyle = toy.color;
        ctx.beginPath();
        ctx.ellipse(0, -bounce, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.arc(-12, -bounce - 12, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(12, -bounce - 12, 8, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(-6, -bounce - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(6, -bounce - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        // Nose
        ctx.fillStyle = "#FFB6C1";
        ctx.beginPath();
        ctx.arc(0, -bounce + 5, 3, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.strokeStyle = "#FFB6C1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-18, -bounce);
        ctx.quadraticCurveTo(-30, -bounce - 10, -35, -bounce + 5);
        ctx.stroke();
        break;

      case "feather":
        // Feather toy
        ctx.fillStyle = toy.color;
        ctx.beginPath();
        ctx.moveTo(0, -bounce - 40);
        ctx.quadraticCurveTo(-15, -bounce - 20, 0, -bounce);
        ctx.quadraticCurveTo(15, -bounce - 20, 0, -bounce - 40);
        ctx.fill();
        // Feather details
        ctx.strokeStyle = "#27AE60";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -bounce - 40);
        ctx.lineTo(0, -bounce);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(0, -bounce - 35 + i * 6);
          ctx.lineTo(-8, -bounce - 30 + i * 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -bounce - 35 + i * 6);
          ctx.lineTo(8, -bounce - 30 + i * 6);
          ctx.stroke();
        }
        break;

      case "star":
        // Star toy
        ctx.fillStyle = toy.color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = Math.cos(angle) * 20;
          const y = Math.sin(angle) * 20 - bounce;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        // Glow effect
        ctx.shadowColor = toy.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Sparkles
        ctx.fillStyle = "#FFFFFF";
        const sparkleTime = time * 3;
        for (let i = 0; i < 4; i++) {
          const angle = sparkleTime + (i * Math.PI) / 2;
          const dist = 25 + Math.sin(time * 5) * 5;
          const sx = Math.cos(angle) * dist;
          const sy = Math.sin(angle) * dist - bounce;
          ctx.beginPath();
          ctx.arc(sx, sy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }

    ctx.restore();
  }, []);

  // Discovery animation
  const drawDiscoveryEffect = useCallback((ctx: CanvasRenderingContext2D, anim: typeof discoveryAnimation, time: number) => {
    if (!anim.active || !anim.toy) return;

    ctx.save();
    ctx.translate(anim.x, anim.y);

    // Expanding circles
    ctx.strokeStyle = anim.toy.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - anim.progress;

    for (let i = 0; i < 3; i++) {
      const radius = (anim.progress * 100 + i * 20) % 150;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sparkles
    ctx.fillStyle = anim.toy.color;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 2;
      const dist = anim.progress * 80;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // "!" exclamation
    ctx.font = "bold 40px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.globalAlpha = 1 - anim.progress;
    ctx.fillText("!", 0, -60 - anim.progress * 30);

    ctx.restore();
  }, []);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime = Date.now();

    const animate = () => {
      const time = (Date.now() - startTime) / 1000;
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw room
      drawRoom(ctx, width, height);

      // Draw hiding spots
      drawHidingSpots(ctx);

      // Draw discovered toys
      toys.forEach((toy) => drawToy(ctx, toy, time));

      // Draw cats
      cats.forEach((cat) => drawCat(ctx, cat, time));

      // Draw discovery animation
      drawDiscoveryEffect(ctx, discoveryAnimation, time);

      // Update discovery animation
      if (discoveryAnimation.active) {
        setDiscoveryAnimation((prev) => {
          const newProgress = prev.progress + 0.02;
          if (newProgress >= 1) {
            return { active: false, x: 0, y: 0, progress: 0, toy: null };
          }
          return { ...prev, progress: newProgress };
        });
      }

      // Update cat positions (smooth movement)
      setCats((prevCats) =>
        prevCats.map((cat) => {
          if (cat.isMoving) {
            const dx = cat.targetX - cat.x;
            const dy = cat.targetY - cat.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5) {
              return { ...cat, x: cat.targetX, y: cat.targetY, isMoving: false };
            }

            const speed = 3;
            return {
              ...cat,
              x: cat.x + (dx / dist) * speed,
              y: cat.y + (dy / dist) * speed,
            };
          }
          return cat;
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [toys, cats, discoveryAnimation, drawRoom, drawHidingSpots, drawCat, drawToy, drawDiscoveryEffect]);

  // Handle discovery action
  const handleDiscover = useCallback(() => {
    // Check if any cat is still moving or discovering
    if (cats.some((cat) => cat.isMoving || cat.isDiscovering)) return;
    if (discoveryAnimation.active) return;

    // Find an unused hiding spot
    const usedSpots = toys.map((t) => t.hidingSpotId);
    const availableSpots = HIDING_SPOTS.filter((s) => !usedSpots.includes(s.id));

    if (availableSpots.length === 0) {
      setMessage("Все игрушки найдены! 🎉");
      return;
    }

    // Pick random spot and toy
    const randomSpot = availableSpots[Math.floor(Math.random() * availableSpots.length)];
    const randomToyType = TOY_TYPES[Math.floor(Math.random() * TOY_TYPES.length)];

    const newToy: Toy = {
      id: `toy-${Date.now()}`,
      type: randomToyType.type,
      x: randomSpot.x + randomSpot.width / 2,
      y: randomSpot.y + randomSpot.height / 2,
      hidingSpotId: randomSpot.id,
      discovered: false,
      color: randomToyType.color,
    };

    // Pick a random cat to discover
    const randomCatIndex = Math.random() > 0.5 ? 0 : 1;

    setCats((prevCats) =>
      prevCats.map((cat, index) => {
        if (index === randomCatIndex) {
          return {
            ...cat,
            targetX: randomSpot.x + randomSpot.width / 2,
            targetY: randomSpot.y + randomSpot.height + 30,
            isMoving: true,
            isDiscovering: true,
            discoveredToy: newToy,
          };
        }
        return cat;
      })
    );

    setMessage(`${randomCatIndex === 0 ? "Midnight" : "Oreo"} ищет игрушку...`);

    // After cat arrives, reveal toy
    setTimeout(() => {
      setToys((prevToys) => [...prevToys, { ...newToy, discovered: true }]);
      setDiscoveryAnimation({
        active: true,
        x: newToy.x,
        y: newToy.y,
        progress: 0,
        toy: newToy,
      });
      playDiscoverySound(newToy.type);
      setMessage(`Нашли ${randomToyType.name}! ${randomToyType.emoji}`);

      // Reset cat state
      setCats((prevCats) =>
        prevCats.map((cat) => ({
          ...cat,
          isDiscovering: false,
          discoveredToy: null,
        }))
      );
    }, 2500);
  }, [cats, toys, discoveryAnimation.active, playDiscoverySound]);

  // Keyboard and click handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleDiscover();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDiscover]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-600 mb-2">🎁 Спрятанные Игрушки</h2>
        <p className="text-gray-600">{message}</p>
      </div>

      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        onClick={handleDiscover}
        className="border-4 border-purple-300 rounded-xl cursor-pointer shadow-lg hover:border-purple-400 transition-colors"
      />

      <div className="flex gap-4 text-sm text-gray-500">
        <span>🎮 Нажми <kbd className="px-2 py-1 bg-gray-200 rounded">Пробел</kbd> или кликни</span>
        <span>🎯 Найдено игрушек: {toys.length}/{HIDING_SPOTS.length}</span>
      </div>

      {/* Toy collection display */}
      {toys.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {toys.map((toy) => {
            const toyInfo = TOY_TYPES.find((t) => t.type === toy.type);
            return (
              <span
                key={toy.id}
                className="px-3 py-1 rounded-full text-white text-sm"
                style={{ backgroundColor: toy.color }}
              >
                {toyInfo?.emoji} {toyInfo?.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
