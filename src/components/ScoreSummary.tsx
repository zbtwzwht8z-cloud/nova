"use client";

import { useEffect, useRef, useState } from "react";

export type TodayStats = {
  answered: number;
  correct: number;
  wrong: number;
};

type ScoreSummaryProps = {
  accuracy: number;
  correct: number;
  answered: number;
  total: number;
  elapsed?: string;
  title: string;
  today: TodayStats;
};

const RADIUS = 54;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DURATION = 1100;

function band(accuracy: number) {
  if (accuracy >= 80) {
    return { from: "#2f9a86", to: "#1d6558", text: "var(--accent)", label: "Stark" };
  }

  if (accuracy >= 60) {
    return { from: "#d9a520", to: "#a97a09", text: "#9a7008", label: "Solide" };
  }

  return { from: "#c25a55", to: "#8e2f2c", text: "var(--danger)", label: "Ausbaufähig" };
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Ease-out-quint: quick off the mark, long settle — reads as deceleration
// rather than a linear sweep.
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

// Drives the ring sweep and the counting number off one clock, so the number
// never lands before or after the arc it belongs to.
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    const start = performance.now();

    function tick(nowMs: number) {
      const progress = Math.min(1, (nowMs - start) / DURATION);
      setValue(target * easeOut(progress));

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return value;
}

function StatRow({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-body-sm text-text-muted">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="text-body font-semibold tabular-nums text-text">{value}</span>
    </div>
  );
}

export default function ScoreSummary({
  accuracy,
  correct,
  answered,
  total,
  elapsed,
  title,
  today
}: ScoreSummaryProps) {
  const clamped = Math.max(0, Math.min(100, accuracy));
  const animated = useCountUp(clamped);
  const tone = band(clamped);
  const gradientId = `score-${tone.label}`;

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10">
      <div className="score-enter grid justify-items-center gap-3 sm:justify-self-center">
        <span className="text-label text-text-subtle">{title}</span>

        <div className="relative h-[148px] w-[148px]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 148 148">
            <defs>
              <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor={tone.from} />
                <stop offset="100%" stopColor={tone.to} />
              </linearGradient>
            </defs>
            <circle
              cx="74"
              cy="74"
              fill="none"
              r={RADIUS}
              stroke="var(--surface-muted)"
              strokeWidth={STROKE}
            />
            <circle
              cx="74"
              cy="74"
              fill="none"
              r={RADIUS}
              stroke={`url(#${gradientId})`}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - animated / 100)}
              strokeLinecap="round"
              strokeWidth={STROKE}
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center justify-items-center">
            <strong
              className="text-[38px] font-semibold leading-none tracking-tight tabular-nums"
              style={{ color: tone.text }}
            >
              {Math.round(animated)}
              <span className="text-[22px] font-medium">%</span>
            </strong>
          </div>
        </div>

        <span className="text-body-sm font-medium" style={{ color: tone.text }}>
          {tone.label}
        </span>
      </div>

      <div className="score-enter score-enter-delayed grid gap-4">
        <div className="grid gap-2 rounded-lg border border-border bg-surface-muted p-4">
          <div className="flex items-baseline justify-between gap-4">
            <strong className="text-body-sm font-semibold text-text">Diese Sitzung</strong>
            <span className="text-label text-text-subtle">
              {total} {total === 1 ? "Frage" : "Fragen"}
              {elapsed ? ` · ${elapsed}` : ""}
            </span>
          </div>
          <StatRow color="var(--accent)" label="Richtig" value={correct} />
          <StatRow color="var(--danger)" label="Falsch" value={answered - correct} />
        </div>

        <div className="grid gap-2 rounded-lg border border-border p-4">
          <strong className="text-body-sm font-semibold text-text">Heute</strong>
          <StatRow color="var(--text-subtle)" label="Gekreuzt" value={today.answered} />
          <StatRow color="var(--accent)" label="Richtig" value={today.correct} />
          <StatRow color="var(--danger)" label="Falsch" value={today.wrong} />
        </div>
      </div>
    </div>
  );
}
