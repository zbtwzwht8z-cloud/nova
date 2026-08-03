"use client";

import { cn } from "@/components/ui";
import type { Question } from "@/lib/types";

// Thresholds are calibrated against the real distribution of the bank, not
// picked as round numbers: the base rate sits near 84% correct, so an even
// 0-100 split would file half of everything under "very easy" and the meter
// would never move. These land at roughly 19/25/27/21/9 percent across all
// subjects.
const BANDS = [
  { min: 93, level: 1, label: "Sehr leicht" },
  { min: 86, level: 2, label: "Leicht" },
  { min: 76, level: 3, label: "Mittel" },
  { min: 62, level: 4, label: "Schwer" },
  { min: 0, level: 5, label: "Sehr schwer" }
] as const;

// Below this the sample says more about who happened to answer than about the
// question, so no meter is shown at all.
const MIN_SAMPLE = 30;

export function difficultyOf(question: Question) {
  const stats = question.stats;

  if (!stats || stats.answered < MIN_SAMPLE) {
    return null;
  }

  const percent = (stats.correct / stats.answered) * 100;
  const band = BANDS.find((entry) => percent >= entry.min) || BANDS[BANDS.length - 1];

  return { ...band, percent: Math.round(percent), answered: stats.answered };
}

function toneFor(level: number) {
  if (level <= 2) {
    return "var(--accent)";
  }

  return level === 3 ? "var(--warning)" : "var(--danger)";
}

// A gauge needle rather than a bar chart: rising bars read as signal strength,
// which is what they mean everywhere else on a screen.
const GAUGE_R = 9;
const GAUGE_LEN = Math.PI * GAUGE_R;

function DifficultyMeter({ question }: { question: Question }) {
  const difficulty = difficultyOf(question);

  if (!difficulty) {
    return null;
  }

  const tone = toneFor(difficulty.level);
  // Needle sits in the middle of its band, so the five levels are visibly
  // distinct instead of the first one pointing at hard-left "empty".
  const fraction = (difficulty.level - 0.5) / 5;
  const angle = Math.PI * (1 - fraction);
  const tipX = 12 + GAUGE_R * Math.cos(angle);
  const tipY = 12 - GAUGE_R * Math.sin(angle);

  return (
    <span
      aria-label={`Schwierigkeit: ${difficulty.label}`}
      className="flex items-center"
      title={`Schwierigkeit: ${difficulty.label} — ${difficulty.percent}% von ${difficulty.answered.toLocaleString(
        "de-DE"
      )} Antworten waren richtig`}
    >
      <svg className="h-[15px] w-[24px]" viewBox="0 0 24 15">
        <path
          d={`M ${12 - GAUGE_R} 12 A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${12 + GAUGE_R} 12`}
          fill="none"
          stroke="var(--surface-muted)"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path
          d={`M ${12 - GAUGE_R} 12 A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${12 + GAUGE_R} 12`}
          fill="none"
          stroke={tone}
          strokeDasharray={GAUGE_LEN}
          strokeDashoffset={GAUGE_LEN * (1 - fraction)}
          strokeLinecap="round"
          strokeWidth="3"
        />
        <circle cx={tipX} cy={tipY} fill={tone} r="2.4" stroke="var(--surface)" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

function RepeatMeter({ question }: { question: Question }) {
  const repeats = question.repeats;

  if (!repeats) {
    return null;
  }

  const count = Math.max(1, repeats.count);
  const isRepeat = count > 1;

  // One glyph for both states rather than two: the loop always means "times
  // this has been asked", the number says how often, and the colour separates a
  // one-off from a returning question. A separate "new" icon just read as a
  // loading spinner at this size.
  return (
    <span
      aria-label={
        isRepeat ? `Altfrage aus ${count} Klausuren` : "Neu — bisher eine Klausur"
      }
      className="flex items-center gap-1"
      style={{ color: isRepeat ? "var(--accent)" : "var(--text-subtle)" }}
      title={
        isRepeat
          ? `Altfrage — kam in ${count} Klausuren vor: ${repeats.terms.join(", ")}`
          : `Neu — bisher nur in ${repeats.terms[0] || "dieser Klausur"}`
      }
    >
      <svg
        className="h-[14px] w-[14px]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        viewBox="0 0 24 24"
      >
        <path d="M17 2.1l4 4-4 4" />
        <path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8" />
        <path d="M7 21.9l-4-4 4-4" />
        <path d="M21 11.8v2a4 4 0 0 1-4 4H4.2" />
      </svg>
      <span
        className={cn(
          "text-[11px] leading-none tabular-nums",
          isRepeat ? "font-semibold" : "font-medium"
        )}
      >
        {count}
      </span>
    </span>
  );
}

// Difficulty and how often the question has come up, side by side. Deliberately
// different shapes — a rising bar meter next to round pips — so the two don't
// read as one control at a glance.
export default function QuestionMeters({ question }: { question: Question }) {
  const hasDifficulty = Boolean(difficultyOf(question));
  const hasRepeats = Boolean(question.repeats);

  if (!hasDifficulty && !hasRepeats) {
    return null;
  }

  return (
    <span className="flex items-center gap-3">
      <DifficultyMeter question={question} />
      {hasDifficulty && hasRepeats ? (
        <span aria-hidden="true" className="h-3 w-px bg-border" />
      ) : null}
      <RepeatMeter question={question} />
    </span>
  );
}
