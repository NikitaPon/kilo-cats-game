"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type GameShellProps = {
  children: React.ReactNode;
};

export default function GameShell({ children }: GameShellProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await shell.requestFullscreen();
      }
    } catch {
      setIsFullscreen(document.fullscreenElement === shell);
    }
  }, []);

  return (
    <div
      ref={shellRef}
      className="relative min-h-screen bg-white"
      style={isFullscreen ? { background: "#111827" } : undefined}
    >
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 px-4 py-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors flex items-center gap-2"
      >
        <span>←</span>
        <span>В меню</span>
      </Link>

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-pressed={isFullscreen}
        title={isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors flex items-center gap-2"
      >
        <span>{isFullscreen ? "⤡" : "⛶"}</span>
        <span>{isFullscreen ? "Обычный режим" : "На весь экран"}</span>
      </button>

      {children}
    </div>
  );
}