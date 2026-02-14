"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

interface Cat {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  bellyColor: string;
  eyeColor: string;
  name: string;
  isLarge: boolean;
  rotation: number;
  scaleX: number;
  scaleY: number;
  // Animation
  isPlaying: boolean;
  playProgress: number;
  armAngle: number;
  tailWag: number;
}

interface Instrument {
  name: string;
  emoji: string;
  color: string;
  sound: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MusicNote {
  x: number;
  y: number;
  emoji: string;
  opacity: number;
  velocity: number;
  rotation: number;
  rotationSpeed: number;
}

interface SoundWave {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
}

const INSTRUMENTS: Omit<Instrument, "x" | "y" | "width" | "height">[] = [
  { name: "Drum", emoji: "🥁", color: "#8B4513", sound: "drum" },
  { name: "Bell", emoji: "🔔", color: "#FFD700", sound: "bell" },
  { name: "Xylophone", emoji: "🎵", color: "#FF69B4", sound: "xylophone" },
  { name: "Piano", emoji: "🎹", color: "#1a1a1a", sound: "piano" },
  { name: "Guitar", emoji: "🎸", color: "#CD853F", sound: "guitar" },
  { name: "Trumpet", emoji: "🎺", color: "#FFD700", sound: "trumpet" },
  { name: "Violin", emoji: "🎻", color: "#8B4513", sound: "violin" },
  { name: "Maraca", emoji: "🪇", color: "#DEB887", sound: "maraca" },
];

const NOTE_EMOJIS = ["🎵", "🎶", "🎼", "♪", "♫", "✨"];

// Audio context for generating sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

const playSound = (type: string, volume: number = 0.3) => {
  try {
    const ctx = getAudioContext();
    
    // Short musical melodies for each instrument
    const melodies: Record<string, { notes: number[]; type: OscillatorType; noteDuration: number }> = {
      drum: { notes: [150, 100, 150, 100], type: "triangle", noteDuration: 0.1 },
      bell: { notes: [880, 988, 1047, 880], type: "sine", noteDuration: 0.15 },
      xylophone: { notes: [523, 659, 784, 659], type: "sine", noteDuration: 0.12 },
      piano: { notes: [262, 330, 392, 523], type: "triangle", noteDuration: 0.15 },
      guitar: { notes: [196, 247, 294, 392], type: "sawtooth", noteDuration: 0.12 },
      trumpet: { notes: [294, 370, 440, 370], type: "square", noteDuration: 0.13 },
      violin: { notes: [294, 330, 392, 440], type: "sawtooth", noteDuration: 0.15 },
      maraca: { notes: [2000, 2500, 2000, 2500], type: "square", noteDuration: 0.05 },
    };
    
    const melody = melodies[type] || melodies.drum;
    
    // Play each note in the melody
    melody.notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = melody.type;
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * melody.noteDuration);
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + i * melody.noteDuration);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * melody.noteDuration + melody.noteDuration * 0.9);
      
      oscillator.start(ctx.currentTime + i * melody.noteDuration);
      oscillator.stop(ctx.currentTime + i * melody.noteDuration + melody.noteDuration);
    });
  } catch (e) {
    console.log("Audio not available");
  }
};

export default function CatMusicBand() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentInstruments, setCurrentInstruments] = useState<string[]>([]);
  
  const cat1Ref = useRef<Cat>({
    x: 0,
    y: 0,
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
    isPlaying: false,
    playProgress: 0,
    armAngle: 0,
    tailWag: 0,
  });

  const cat2Ref = useRef<Cat>({
    x: 0,
    y: 0,
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
    isPlaying: false,
    playProgress: 0,
    armAngle: 0,
    tailWag: 0,
  });

  const instrumentsRef = useRef<Instrument[]>([]);
  const notesRef = useRef<MusicNote[]>([]);
  const wavesRef = useRef<SoundWave[]>([]);
  const stateRef = useRef({
    idleTime: 0,
    blinkTimer: 0,
    isBlinking: false,
    playStartTime: 0,
    breathePhase: 0,
  });

  const selectRandomInstruments = useCallback(() => {
    const shuffled = [...INSTRUMENTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }, []);

  const drawCat = useCallback((ctx: CanvasRenderingContext2D, cat: Cat, isBlinking: boolean) => {
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.rotate(cat.rotation);
    ctx.scale(cat.scaleX, cat.scaleY);

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

    // Mouth - happy when playing
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, eyeY + 23);
    ctx.lineTo(0, eyeY + 30);
    ctx.stroke();
    
    if (cat.isPlaying) {
      // Happy open mouth
      ctx.beginPath();
      ctx.arc(0, eyeY + 30, 10, 0, Math.PI, false);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-8, eyeY + 30, 8, 0, Math.PI, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, eyeY + 30, 8, 0, Math.PI, true);
      ctx.stroke();
    }

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

    // Front paws with animation
    const pawY = bodyOffset + cat.height / 3;
    ctx.fillStyle = cat.bellyColor === "#FFFFFF" ? "#FFFFFF" : cat.color;
    
    // Animated paws when playing
    const pawOffset = cat.isPlaying ? Math.sin(cat.playProgress * Math.PI * 4) * 10 : 0;
    
    // Left paw
    ctx.beginPath();
    ctx.ellipse(-cat.width / 4 - pawOffset, pawY, 15, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Right paw
    ctx.beginPath();
    ctx.ellipse(cat.width / 4 + pawOffset, pawY, 15, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Paw details
    ctx.fillStyle = cat.bellyColor === "#FFFFFF" ? "#1a1a1a" : "#333";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(-cat.width / 4 - 8 + i * 8 - pawOffset, pawY + 5, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cat.width / 4 - 8 + i * 8 + pawOffset, pawY + 5, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tail with wagging animation
    ctx.strokeStyle = cat.color;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cat.width / 3, bodyOffset);
    
    const tailWag = cat.isPlaying ? Math.sin(cat.playProgress * Math.PI * 8) * 30 : Math.sin(stateRef.current.idleTime * 0.003) * 10;
    ctx.quadraticCurveTo(
      cat.width / 2 + 30 + tailWag,
      bodyOffset - 20,
      cat.width / 2 + 20 + tailWag * 1.5,
      bodyOffset - 50
    );
    ctx.stroke();

    ctx.restore();
  }, []);

  const drawInstrument = useCallback((ctx: CanvasRenderingContext2D, instrument: Instrument, isPlaying: boolean, playProgress: number) => {
    ctx.save();
    ctx.translate(instrument.x, instrument.y);
    
    // Shake effect when playing
    if (isPlaying) {
      const shake = Math.sin(playProgress * Math.PI * 8) * 3;
      ctx.translate(shake, 0);
    }
    
    // Draw instrument body
    ctx.fillStyle = instrument.color;
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    
    // Base shape
    ctx.beginPath();
    ctx.roundRect(-instrument.width / 2, -instrument.height / 2, instrument.width, instrument.height, 10);
    ctx.fill();
    ctx.stroke();
    
    // Draw emoji
    ctx.font = `${Math.min(instrument.width, instrument.height) * 0.6}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(instrument.emoji, 0, 0);
    
    // Glow effect when playing
    if (isPlaying) {
      ctx.shadowColor = instrument.color;
      ctx.shadowBlur = 20 + Math.sin(playProgress * Math.PI * 4) * 10;
      ctx.beginPath();
      ctx.roundRect(-instrument.width / 2, -instrument.height / 2, instrument.width, instrument.height, 10);
      ctx.stroke();
    }
    
    ctx.restore();
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    // Stage gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#2C1810");
    gradient.addColorStop(0.3, "#4A2C2A");
    gradient.addColorStop(0.7, "#6B3A3A");
    gradient.addColorStop(1, "#8B4513");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stage curtains
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

    // Curtain folds
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

    // Stage floor
    ctx.fillStyle = "#4A3728";
    ctx.fillRect(0, height - 100, width, 100);
    
    // Floor boards
    ctx.strokeStyle = "#3A2718";
    ctx.lineWidth = 2;
    for (let i = 0; i < width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, height - 100);
      ctx.lineTo(i, height);
      ctx.stroke();
    }

    // Spotlights
    const spotColors = ["rgba(255, 200, 100, 0.3)", "rgba(255, 150, 200, 0.3)", "rgba(100, 200, 255, 0.3)"];
    spotColors.forEach((color, i) => {
      const spotX = width * (0.25 + i * 0.25);
      const gradient = ctx.createRadialGradient(spotX, 0, 0, spotX, height - 100, 200);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(spotX - 50, 0);
      ctx.lineTo(spotX - 150, height - 100);
      ctx.lineTo(spotX + 150, height - 100);
      ctx.lineTo(spotX + 50, 0);
      ctx.closePath();
      ctx.fill();
    });

    // Stars/sparkles
    ctx.fillStyle = "#FFD700";
    for (let i = 0; i < 20; i++) {
      const starX = (Math.sin(i * 0.5 + time * 0.001) + 1) * width / 2;
      const starY = (Math.cos(i * 0.7 + time * 0.0015) + 1) * height / 3;
      const starSize = 2 + Math.sin(time * 0.003 + i) * 1;
      ctx.globalAlpha = 0.3 + Math.sin(time * 0.005 + i * 0.5) * 0.3;
      ctx.beginPath();
      ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawNotes = useCallback((ctx: CanvasRenderingContext2D, notes: MusicNote[]) => {
    notes.forEach((note) => {
      ctx.save();
      ctx.globalAlpha = note.opacity;
      ctx.translate(note.x, note.y);
      ctx.rotate(note.rotation);
      ctx.font = "30px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(note.emoji, 0, 0);
      ctx.restore();
    });
  }, []);

  const drawWaves = useCallback((ctx: CanvasRenderingContext2D, waves: SoundWave[]) => {
    waves.forEach((wave) => {
      ctx.save();
      ctx.globalAlpha = wave.opacity;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }, []);

  const startPlaying = useCallback(() => {
    if (isPlaying) return;
    
    // Select random instruments
    const selected = selectRandomInstruments();
    setCurrentInstruments(selected.map(i => i.name));
    
    // Position instruments
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    instrumentsRef.current = selected.map((inst, i) => ({
      ...inst,
      x: i === 0 ? canvas.width / 2 - 180 : canvas.width / 2 + 180,
      y: canvas.height - 180,
      width: 80,
      height: 80,
    }));
    
    stateRef.current.playStartTime = performance.now();
    setIsPlaying(true);
    
    // Play sounds
    selected.forEach((inst, i) => {
      setTimeout(() => playSound(inst.sound, 0.3), i * 100);
    });
  }, [isPlaying, selectRandomInstruments]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = Math.min(800, window.innerWidth - 40);
      canvas.height = 500;
      
      // Reset cat positions
      cat1Ref.current.x = canvas.width / 2 - 120;
      cat1Ref.current.y = canvas.height - 150;
      cat2Ref.current.x = canvas.width / 2 + 80;
      cat2Ref.current.y = canvas.height - 160;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      drawBackground(ctx, canvas.width, canvas.height, time);

      const state = stateRef.current;
      const cat1 = cat1Ref.current;
      const cat2 = cat2Ref.current;

      if (isPlaying) {
        const elapsed = time - state.playStartTime;
        const duration = 2000;
        const progress = Math.min(elapsed / duration, 1);
        
        cat1.isPlaying = true;
        cat2.isPlaying = true;
        cat1.playProgress = progress;
        cat2.playProgress = progress;
        
        // Generate notes and waves
        if (Math.random() < 0.1) {
          instrumentsRef.current.forEach((inst) => {
            notesRef.current.push({
              x: inst.x + (Math.random() - 0.5) * 40,
              y: inst.y - 40,
              emoji: NOTE_EMOJIS[Math.floor(Math.random() * NOTE_EMOJIS.length)],
              opacity: 1,
              velocity: -2 - Math.random() * 2,
              rotation: 0,
              rotationSpeed: (Math.random() - 0.5) * 0.1,
            });
            
            wavesRef.current.push({
              x: inst.x,
              y: inst.y,
              radius: 40,
              opacity: 0.6,
              color: inst.color,
            });
          });
        }
        
        if (progress >= 1) {
          setIsPlaying(false);
          setCurrentInstruments([]);
          cat1.isPlaying = false;
          cat2.isPlaying = false;
          instrumentsRef.current = [];
        }
      } else {
        // Idle animation
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

      // Update and filter notes
      notesRef.current = notesRef.current.filter((note) => {
        note.y += note.velocity;
        note.x += Math.sin(time * 0.01 + note.x) * 0.5;
        note.rotation += note.rotationSpeed;
        note.opacity -= 0.01;
        return note.opacity > 0;
      });

      // Update and filter waves
      wavesRef.current = wavesRef.current.filter((wave) => {
        wave.radius += 3;
        wave.opacity -= 0.02;
        return wave.opacity > 0;
      });

      // Draw waves
      drawWaves(ctx, wavesRef.current);

      // Draw instruments
      instrumentsRef.current.forEach((inst) => {
        drawInstrument(ctx, inst, isPlaying, cat1.playProgress);
      });

      // Draw cats
      drawCat(ctx, cat1, state.isBlinking);
      drawCat(ctx, cat2, state.isBlinking);

      // Draw notes
      drawNotes(ctx, notesRef.current);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Keyboard handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        startPlaying();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, startPlaying, drawBackground, drawCat, drawInstrument, drawNotes, drawWaves]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-amber-900 to-amber-800 p-4">
      <h1 className="text-3xl font-bold text-white mb-2">🎵 Cat Music Band 🎵</h1>
      <p className="text-amber-200 mb-4">
        Press <kbd className="px-2 py-1 bg-amber-700 rounded font-mono text-white">Space</kbd> or click to make music!
      </p>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-2xl border-4 border-amber-600"
          onClick={startPlaying}
        />
        
        {currentInstruments.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow-lg">
            <span className="text-lg font-semibold text-purple-600">
              🎶 {currentInstruments.join(" + ")} 🎶
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={startPlaying}
          disabled={isPlaying}
          className={`px-6 py-3 rounded-full font-semibold text-white transition-all transform hover:scale-105 ${
            isPlaying
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
          }`}
        >
          {isPlaying ? "🎵 Playing... 🎵" : "🎸 Jam Session! 🎸"}
        </button>
      </div>

      <div className="mt-6 text-center text-amber-200 text-sm">
        <p>
          Meet our musicians: <span className="font-semibold text-white">Midnight</span> and{" "}
          <span className="font-semibold text-white">Oreo</span> - they love making music together!
        </p>
      </div>
    </div>
  );
}
