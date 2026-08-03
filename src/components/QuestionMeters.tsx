"use client";

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

function DifficultyMeter({ question }: { question: Question }) {
  const difficulty = difficultyOf(question);

  if (!difficulty) {
    return null;
  }

  const tone = toneFor(difficulty.level);

  return (
    <span
      aria-label={`Schwierigkeit: ${difficulty.label}`}
      className="flex h-4 items-end gap-[2px]"
      title={`Schwierigkeit: ${difficulty.label} — ${difficulty.percent}% von ${difficulty.answered.toLocaleString(
        "de-DE"
      )} Antworten waren richtig`}
    >
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          className="w-[3px] rounded-[1px] transition-colors"
          key={step}
          style={{
            height: `${step * 20}%`,
            backgroundColor: step <= difficulty.level ? tone : "var(--surface-muted)"
          }}
        />
      ))}
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
  const shown = Math.min(count, 5);

  return (
    <span
      aria-label={
        isRepeat ? `Altfrage aus ${count} Klausuren` : "Neu — bisher eine Klausur"
      }
      className="flex h-4 items-center gap-[3px]"
      title={
        isRepeat
          ? `Altfrage — kam in ${count} Klausuren vor: ${repeats.terms.join(", ")}`
          : `Neu — bisher nur in ${repeats.terms[0] || "dieser Klausur"}`
      }
    >
      {Array.from({ length: shown }, (_, index) => (
        <span
          className="h-[7px] w-[7px] rounded-full"
          key={index}
          style={
            isRepeat
              ? { backgroundColor: "var(--accent)" }
              : { border: "1.5px solid var(--text-subtle)" }
          }
        />
      ))}
      {count > 5 ? (
        <span className="text-label font-medium text-accent">+{count - 5}</span>
      ) : null}
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
