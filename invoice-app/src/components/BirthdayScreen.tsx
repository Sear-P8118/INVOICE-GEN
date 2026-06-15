'use client';

import { useState } from 'react';

const CONFETTI_COLORS = ['#FF6B35', '#6366f1', '#f59e0b', '#10b981', '#38bdf8', '#ffffff'];

interface Piece {
  left: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  drift: number;
  rounded: boolean;
}

function makeConfetti(count: number): Piece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    size: 7 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: 3.5 + Math.random() * 3,
    delay: Math.random() * 3,
    drift: (Math.random() - 0.5) * 120,
    rounded: Math.random() > 0.5,
  }));
}

export default function BirthdayScreen({ onContinue }: { onContinue: () => void }) {
  // Generated once on the client (this screen only mounts client-side).
  const [pieces] = useState(() => makeConfetti(36));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Birthday celebration"
      className="bday-overlay fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-5"
      style={{ background: 'linear-gradient(150deg, #0a1326 0%, #14253f 55%, #0a1326 100%)' }}
    >
      {/* Glowing background details */}
      <div className="bday-glow pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.55), transparent 70%)' }} />
      <div className="bday-glow pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%)', animationDelay: '1.2s' }} />

      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            className="bday-confetti-piece"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.rounded ? '50%' : '2px',
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              ['--drift' as string]: `${p.drift}px`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="bday-card relative w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-8 text-center shadow-2xl backdrop-blur sm:p-10"
        style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
      >
        <div className="text-5xl sm:text-6xl">🎉</div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Happy Birthday, Sami!
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-slate-600 sm:text-base">
          Wishing you a brilliant birthday, a successful year ahead, and many more achievements with the businesses
          you&rsquo;ve built.
        </p>
        <button
          autoFocus
          onClick={onContinue}
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 py-4 text-base font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          Continue to dashboard
        </button>
      </div>
    </div>
  );
}
