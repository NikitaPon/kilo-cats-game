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
  name: "Midnight" | "Oreo";
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

const CLOUDS: Cloud[] = [
  { x: 100, y: 60, width: 150, height: 60, speed: 0.3 },
  { x: 350, y: 40, width: 180, height: 70, speed: 0.2 },
  { x: 600, y: 80, width: 140, height: 55, speed: 0.4 },
  { x: 800, y: 50, width: 160, height: 65, speed: 0.25 },
];

export default function CatSkyWonders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRaining, setIsRaining] = useState(false);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [cats, setCats] = useState<Cat[]>([
    { x: 250, y: 420, baseY: 420, jumping: false, jumpHeight: 0, jumpPhase: 0, targetX: null, name: "Midnight" },
    { x: 550, y: 430, baseY: 430, jumping: false, jumpHeight: 0, jumpPhase: 0, targetX: null, name: "Oreo" },
  ]);
  const [clouds, setClouds] = useState<Cloud[]>(CLOUDS);
  const [caughtCount, setCaughtCount] = useState(0);
  const animationRef = useRef<number | null>(null);
  const itemCounterRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

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
    if (isRaining) return;

    setIsRaining(true);
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
        speed: 2 + Math.random() * 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        caught: false,
        opacity: 1,
      });
    }

    setItems(newItems);

    // Make cats start jumping
    setCats((prevCats) =>
      prevCats.map((cat) => ({
        ...cat,
        jumping: true,
        jumpPhase: Math.random() * Math.PI * 2,
        targetX: 200 + Math.random() * 400,
      }))
    );

    // Stop after a few seconds
    setTimeout(() => {
      setIsRaining(false);
      setCats((prevCats) =>
        prevCats.map((cat) => ({
          ...cat,
          jumping: false,
          targetX: null,
        }))
      );
    }, 5000);
  }, [isRaining, playMagicSound]);

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
          const r = i === 0 ? item.size / 2 : item.size / 2;
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

  // Draw a cat
  const drawCat = useCallback((ctx: CanvasRenderingContext2D, cat: Cat) => {
    const x = cat.x;
    const y = cat.y - cat.jumpHeight;

    ctx.save();

    if (cat.name === "Midnight") {
      // Midnight - black cat with yellow eyes
      ctx.fillStyle = "#1a1a1a";

      // Body
      ctx.beginPath();
      ctx.ellipse(x, y + 25, 35, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.beginPath();
      ctx.arc(x, y - 5, 28, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 25);
      ctx.lineTo(x - 12, y - 45);
      ctx.lineTo(x - 2, y - 25);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 20, y - 25);
      ctx.lineTo(x + 12, y - 45);
      ctx.lineTo(x + 2, y - 25);
      ctx.fill();

      // Eyes - yellow
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.ellipse(x - 10, y - 8, 6, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 10, y - 8, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(x - 10, y - 8, 2, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 10, y - 8, 2, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = "#FF69B4";
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x - 4, y + 8);
      ctx.lineTo(x + 4, y + 8);
      ctx.fill();

      // Tail
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 35);
      ctx.quadraticCurveTo(x + 50, y + 20, x + 55, y + 5);
      ctx.stroke();

    } else {
      // Oreo - black and white cat with green eyes
      // Body - black back
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.ellipse(x, y + 25, 40, 32, 0, 0, Math.PI * 2);
      ctx.fill();

      // White belly
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(x, y + 30, 25, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head - black
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(x, y - 5, 32, 0, Math.PI * 2);
      ctx.fill();

      // White face patch
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(x, y + 5, 18, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears - black with white inside
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 28);
      ctx.lineTo(x - 14, y - 52);
      ctx.lineTo(x - 2, y - 28);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 22, y - 28);
      ctx.lineTo(x + 14, y - 52);
      ctx.lineTo(x + 2, y - 28);
      ctx.fill();

      // Inner ears - white
      ctx.fillStyle = "#FFB6C1";
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 30);
      ctx.lineTo(x - 14, y - 44);
      ctx.lineTo(x - 6, y - 30);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 18, y - 30);
      ctx.lineTo(x + 14, y - 44);
      ctx.lineTo(x + 6, y - 30);
      ctx.fill();

      // Eyes - green
      ctx.fillStyle = "#32CD32";
      ctx.beginPath();
      ctx.ellipse(x - 12, y - 5, 7, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 12, y - 5, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(x - 12, y - 5, 2, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 12, y - 5, 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.fillStyle = "#FF69B4";
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x - 5, y + 12);
      ctx.lineTo(x + 5, y + 12);
      ctx.fill();

      // Paws - white
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.ellipse(x - 25, y + 50, 10, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 25, y + 50, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail - black and white
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 35, y + 40);
      ctx.quadraticCurveTo(x + 60, y + 25, x + 65, y + 5);
      ctx.stroke();

      // White tail tip
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 58, y + 12);
      ctx.quadraticCurveTo(x + 62, y + 8, x + 65, y + 5);
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

    let animationId: number = 0;

    const gameLoop = () => {
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
      setClouds((prevClouds) =>
        prevClouds.map((cloud) => ({
          ...cloud,
          x: cloud.x + cloud.speed > canvas.width ? -cloud.width : cloud.x + cloud.speed,
        }))
      );

      clouds.forEach((cloud) => drawCloud(ctx, cloud));

      // Draw ground
      ctx.fillStyle = "#90EE90";
      ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

      // Draw grass details
      ctx.strokeStyle = "#228B22";
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.width; i += 15) {
        const height = 10 + Math.random() * 15;
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

      // Update and draw falling items
      setItems((prevItems) => {
        const newItems: FallingItem[] = [];

        prevItems.forEach((item) => {
          if (item.caught || item.y > canvas.height + 50) return;

          // Update position
          item.y += item.speed;
          item.x += Math.sin(item.wobble) * 1.5;
          item.wobble += item.wobbleSpeed;
          item.rotation += item.rotationSpeed;

          // Check if cats can catch
          setCats((prevCats) => {
            const updatedCats = prevCats.map((cat) => {
              const dx = Math.abs(cat.x - item.x);
              const dy = Math.abs(cat.baseY - cat.jumpHeight - item.y);

              if (dx < 50 && dy < 60 && !item.caught) {
                item.caught = true;
                playCatchSound();
                setCaughtCount((c) => c + 1);
              }
              return cat;
            });
            return updatedCats;
          });

          if (!item.caught) {
            newItems.push(item);
          }
        });

        // Draw items
        newItems.forEach((item) => drawItem(ctx, item));

        return newItems;
      });

      // Update and draw cats
      setCats((prevCats) =>
        prevCats.map((cat) => {
          let newJumpHeight = cat.jumpHeight;
          let newJumpPhase = cat.jumpPhase;
          let newX = cat.x;

          if (cat.jumping) {
            // Jumping animation
            newJumpPhase += 0.15;
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
        })
      );

      cats.forEach((cat) => drawCat(ctx, cat));

      // Draw UI
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(10, 10, 200, 40);
      ctx.strokeStyle = "#4ECDC4";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 200, 40);

      ctx.fillStyle = "#333";
      ctx.font = "bold 16px Arial";
      ctx.fillText(`✨ Caught: ${caughtCount}`, 25, 35);

      // Instructions
      if (!isRaining) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(canvas.width / 2 - 150, canvas.height / 2 - 30, 300, 60);
        ctx.strokeStyle = "#4ECDC4";
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2 - 30, 300, 60);

        ctx.fillStyle = "#333";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Press SPACE for Magic Rain!", canvas.width / 2, canvas.height / 2 + 5);
        ctx.textAlign = "left";
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    animationRef.current = animationId;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cats, clouds, isRaining, items, caughtCount, drawCat, drawCloud, drawItem, playCatchSound]);

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
        ✨ Sky Wonders ✨
      </h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={startMagicRain}
        className="border-4 border-white rounded-2xl shadow-2xl cursor-pointer"
      />
      <p className="text-white mt-4 text-lg drop-shadow">
        Press <kbd className="px-2 py-1 bg-white/20 rounded">Space</kbd> or click to make magic rain from the clouds!
      </p>
      <p className="text-white/80 mt-2 text-sm">
        Watch the cats jump and catch the falling wonders! 🐱
      </p>
    </div>
  );
}
