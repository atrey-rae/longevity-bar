"use client";

import { useEffect, useState } from "react";

const BARVY = [
  "#ffc247",
  "#ff6b35",
  "#25a35a",
  "#54c2bd",
  "#fdf3e3",
  "#ff8a4c",
];
const EMOJI = ["🥥", "✨", "🎉", "🌴", "💛", "🥭"];

interface Kus {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  barva: string;
  emoji: string | null;
  velikost: number;
  rotace: number;
}

/**
 * Čistě CSS konfety (bez knihoven).
 * Kusy se generují až po připojení komponenty, aby nevznikl hydratační nesoulad.
 */
export default function Konfety({
  kusu = 46,
  trvaniMs = 5200,
}: {
  kusu?: number;
  trvaniMs?: number;
}) {
  const [kusy, setKusy] = useState<Kus[]>([]);

  useEffect(() => {
    const vygenerovane: Kus[] = Array.from({ length: kusu }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.6 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 240,
      barva: BARVY[i % BARVY.length],
      emoji: i % 5 === 0 ? EMOJI[Math.floor(Math.random() * EMOJI.length)] : null,
      velikost: 8 + Math.random() * 10,
      rotace: Math.random() * 360,
    }));
    setKusy(vygenerovane);
    const t = window.setTimeout(() => setKusy([]), trvaniMs);
    return () => window.clearTimeout(t);
  }, [kusu, trvaniMs]);

  if (kusy.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      {kusy.map((k) => (
        <span
          key={k.id}
          className="animate-konfety absolute top-0 block"
          style={
            {
              left: `${k.left}%`,
              animationDelay: `${k.delay}s`,
              animationDuration: `${k.duration}s`,
              "--drift": `${k.drift}px`,
              fontSize: k.emoji ? `${k.velikost + 10}px` : undefined,
              width: k.emoji ? undefined : `${k.velikost}px`,
              height: k.emoji ? undefined : `${k.velikost * 1.6}px`,
              background: k.emoji ? undefined : k.barva,
              borderRadius: k.emoji ? undefined : "2px",
              transform: `rotate(${k.rotace}deg)`,
            } as React.CSSProperties
          }
        >
          {k.emoji}
        </span>
      ))}
    </div>
  );
}
