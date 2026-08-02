"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";

export const TIMER_CHOICES = [30, 60, 90, 120, 180] as const;

function format(seconds: number) {
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;

  return `${m}:${String(s).padStart(2, "0")}`;
}

type QuestionTimerProps = {
  // Changing this restarts the clock — pass the question id.
  resetKey: string;
  limit: number;
  onLimitChange: (limit: number) => void;
  onDisable: () => void;
};

// Per-question countdown. Owns its own interval so the rest of the trainer
// doesn't re-render every second. Running out doesn't interrupt anything: it
// turns red and counts the overtime, rather than skipping the question.
export default function QuestionTimer({
  resetKey,
  limit,
  onLimitChange,
  onDisable
}: QuestionTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);

    return () => clearInterval(interval);
  }, [resetKey, limit]);

  const remaining = limit - elapsed;
  const over = remaining < 0;
  const ratio = Math.max(0, Math.min(1, elapsed / limit));
  const tone = over
    ? "var(--danger)"
    : remaining <= Math.max(5, limit * 0.15)
      ? "var(--warning)"
      : "var(--accent)";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <Timer aria-hidden="true" size={15} style={{ color: tone }} />

      <span
        aria-live="off"
        className="min-w-[52px] text-body-sm font-semibold tabular-nums"
        style={{ color: tone }}
      >
        {over ? `+${format(remaining)}` : format(remaining)}
      </span>

      <div
        aria-hidden="true"
        className="h-1 flex-1 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: tone,
            width: `${ratio * 100}%`,
            transition: "width 250ms linear"
          }}
        />
      </div>

      {over ? (
        <span className="text-label font-medium" style={{ color: tone }}>
          Zeit um
        </span>
      ) : null}

      <label className="sr-only" htmlFor="question-timer-limit">
        Zeit pro Frage
      </label>
      <select
        className="h-7 rounded-md border border-border bg-surface px-1.5 text-label text-text-muted outline-none transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] focus:border-accent focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)] focus-visible:outline-none"
        id="question-timer-limit"
        onChange={(event) => onLimitChange(Number(event.target.value))}
        value={limit}
      >
        {TIMER_CHOICES.map((choice) => (
          <option key={choice} value={choice}>
            {choice < 60 ? `${choice}s` : `${choice / 60} min`}
          </option>
        ))}
      </select>

      <button
        aria-label="Timer ausschalten"
        className="rounded p-1 text-text-subtle transition-colors hover:bg-surface-muted hover:text-text"
        onClick={onDisable}
        title="Timer ausschalten"
        type="button"
      >
        <X aria-hidden="true" size={14} />
      </button>
    </div>
  );
}
