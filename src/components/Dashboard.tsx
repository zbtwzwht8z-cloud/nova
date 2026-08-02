"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  ListChecks,
  Play,
  Plus,
  Target,
  Trash2,
  X
} from "lucide-react";

import { Button, Input, cn } from "@/components/ui";
import type {
  ExamDate,
  Question,
  StoredProgress,
  StudySessionLog
} from "@/lib/types";

type LeaderEntry = {
  userId: string;
  name: string;
  weeklyAnswered: number;
  accuracy: number;
};

type DashboardProps = {
  questions: Question[];
  progress: StoredProgress;
  sessionLogs: StudySessionLog[];
  leaderboard: LeaderEntry[];
  mistakeCount: number;
  openSession: StudySessionLog | null;
  onResume: (session: StudySessionLog) => void;
  onStartMistakes: () => void;
  onOpenSubjects: () => void;
  onOpenSessions: () => void;
  onPracticeSubject: (subject: string) => void;
  onSaveExams: (exams: ExamDate[]) => void;
};

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Local calendar day key — not toISOString, which shifts across midnight in
// any timezone east or west of UTC and would file answers under the wrong day.
function dayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function parseExamStart(exam: ExamDate) {
  const [year, month, day] = exam.date.split("-").map(Number);
  const [hour, minute] = (exam.time || "09:00").split(":").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, hour || 0, minute || 0);
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 4)));

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function StatTile({
  label,
  value,
  suffix,
  hint,
  icon,
  tone = "var(--accent)",
  delay = 0
}: {
  label: string;
  value: number;
  suffix?: string;
  hint?: string;
  icon: React.ReactNode;
  tone?: string;
  delay?: number;
}) {
  const animated = useCountUp(value);

  return (
    <div
      className="dash-enter grid gap-2 rounded-2xl border border-border bg-surface p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="flex items-center gap-2 text-label font-medium text-text-subtle">
        <span style={{ color: tone }}>{icon}</span>
        {label}
      </span>
      <strong className="text-[26px] font-semibold leading-none tabular-nums text-text">
        {Math.round(animated)}
        {suffix ? (
          <span className="text-body font-medium text-text-muted">{suffix}</span>
        ) : null}
      </strong>
      {hint ? <span className="text-label text-text-subtle">{hint}</span> : null}
    </div>
  );
}

export default function Dashboard({
  questions,
  progress,
  sessionLogs,
  leaderboard,
  mistakeCount,
  openSession,
  onResume,
  onStartMistakes,
  onOpenSubjects,
  onOpenSessions,
  onPracticeSubject,
  onSaveExams
}: DashboardProps) {
  const [editingExams, setEditingExams] = useState(false);

  const answers = progress.answers || {};
  const exams = useMemo(
    () =>
      [...(progress.examDates || [])].sort((left, right) =>
        `${left.date}${left.time || ""}`.localeCompare(`${right.date}${right.time || ""}`)
      ),
    [progress.examDates]
  );

  // Today, the streak, and the last 14 days in one pass over the answers.
  const activity = useMemo(() => {
    const perDay = new Map<string, { answered: number; correct: number }>();

    for (const answer of Object.values(answers)) {
      const when = new Date(answer.answeredAt);

      if (Number.isNaN(when.getTime())) {
        continue;
      }

      const key = dayKey(when);
      const entry = perDay.get(key) || { answered: 0, correct: 0 };
      entry.answered += 1;

      if (answer.correct === true) {
        entry.correct += 1;
      }

      perDay.set(key, entry);
    }

    const today = startOfDay(new Date());
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today.getTime() - (13 - index) * DAY);
      const entry = perDay.get(dayKey(date)) || { answered: 0, correct: 0 };

      return { date, ...entry };
    });

    // Streak counts back from today; a day not yet worked doesn't break it —
    // only a gap before it does.
    let streak = 0;
    for (let index = 0; ; index += 1) {
      const date = new Date(today.getTime() - index * DAY);
      const worked = (perDay.get(dayKey(date))?.answered || 0) > 0;

      if (worked) {
        streak += 1;
        continue;
      }

      if (index === 0) {
        continue;
      }

      break;
    }

    const todayEntry = perDay.get(dayKey(today)) || { answered: 0, correct: 0 };
    const weekAnswered = days.slice(7).reduce((sum, day) => sum + day.answered, 0);
    const weekCorrect = days.slice(7).reduce((sum, day) => sum + day.correct, 0);

    return { days, streak, today: todayEntry, weekAnswered, weekCorrect };
  }, [answers]);

  // Per-subject readiness, used for the next exam's subjects.
  const bySubject = useMemo(() => {
    const map = new Map<string, { total: number; answered: number; correct: number; graded: number }>();

    for (const question of questions) {
      const entry = map.get(question.subject) || {
        total: 0,
        answered: 0,
        correct: 0,
        graded: 0
      };
      entry.total += 1;

      const answer = answers[question.id];

      if (answer) {
        entry.answered += 1;

        if (answer.correct !== undefined) {
          entry.graded += 1;
          entry.correct += answer.correct ? 1 : 0;
        }
      }

      map.set(question.subject, entry);
    }

    return map;
  }, [questions, answers]);

  // Index of the soonest sitting that hasn't finished, so the arrows can page
  // through the whole timetable — past ones included — starting from there.
  const upcomingIndex = useMemo(() => {
    const now = Date.now();
    const found = exams.findIndex((exam) => {
      const start = parseExamStart(exam);
      // Still "next" while it's running today, not the moment it starts.
      return start ? start.getTime() + 3 * 60 * 60 * 1000 >= now : false;
    });

    return found === -1 ? Math.max(0, exams.length - 1) : found;
  }, [exams]);

  const [examOffset, setExamOffset] = useState(0);

  // A changed timetable (added, removed, saved) invalidates the offset.
  useEffect(() => {
    setExamOffset(0);
  }, [exams]);

  const shownIndex = Math.min(
    Math.max(0, upcomingIndex + examOffset),
    Math.max(0, exams.length - 1)
  );
  const shownExam = exams[shownIndex] || null;
  const isUpcoming = shownIndex === upcomingIndex;

  const countdown = useMemo(() => {
    const start = shownExam ? parseExamStart(shownExam) : null;

    if (!start) {
      return null;
    }

    const diff = start.getTime() - Date.now();
    const past = diff < 0;
    const days = Math.floor(Math.abs(diff) / DAY);
    const hours = Math.floor((Math.abs(diff) % DAY) / (60 * 60 * 1000));

    return { days, hours, past, start };
  }, [shownExam]);

  const maxDay = Math.max(1, ...activity.days.map((day) => day.answered));
  // Round the top of the axis to a clean step so the ticks read 0/40/80 rather
  // than 0/37/74, and keep it even so the midpoint is a whole number.
  const axisStep = maxDay <= 20 ? 5 : maxDay <= 60 ? 10 : maxDay <= 200 ? 20 : 50;
  const axisMax = Math.max(axisStep * 2, Math.ceil(maxDay / (axisStep * 2)) * axisStep * 2);
  const weekAccuracy = activity.weekAnswered
    ? Math.round((activity.weekCorrect / activity.weekAnswered) * 100)
    : 0;
  const activeLeaders = leaderboard.filter((entry) => entry.weeklyAnswered > 0);
  const recentSessions = sessionLogs.slice(0, 4);

  return (
    <div className="mx-auto grid max-w-content gap-6">
      {/* Countdown first: everything else is in service of the next sitting. */}
      <section
        className="dash-enter relative overflow-hidden rounded-[22px] border border-border bg-surface p-6"
        style={{ animationDelay: "0ms" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-[0.13]"
          style={{
            background:
              "radial-gradient(circle, var(--accent) 0%, transparent 70%)"
          }}
        />

        <div className="relative grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="flex items-center gap-2 text-label font-medium text-text-subtle">
              <CalendarClock size={15} aria-hidden="true" />
              {isUpcoming
                ? "Nächste Klausur"
                : countdown?.past
                  ? "Vergangene Klausur"
                  : "Spätere Klausur"}
              {exams.length > 1 ? (
                <span className="tabular-nums text-text-subtle">
                  {shownIndex + 1}/{exams.length}
                </span>
              ) : null}
            </span>

            <div className="flex items-center gap-1">
              {exams.length > 1 ? (
                <>
                  <Button
                    aria-label="Vorherige Klausur"
                    className="px-2 text-text-subtle"
                    disabled={shownIndex === 0}
                    onClick={() => setExamOffset((current) => current - 1)}
                    title="Vorherige Klausur"
                    variant="ghost"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label="Nächste Klausur"
                    className="px-2 text-text-subtle"
                    disabled={shownIndex >= exams.length - 1}
                    onClick={() => setExamOffset((current) => current + 1)}
                    title="Nächste Klausur"
                    variant="ghost"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                  {!isUpcoming ? (
                    <Button
                      className="px-2 text-text-subtle"
                      onClick={() => setExamOffset(0)}
                      title="Zurück zur nächsten Klausur"
                      variant="ghost"
                    >
                      <span className="text-label">Heute</span>
                    </Button>
                  ) : null}
                </>
              ) : null}
              <Button
                className="px-2 text-text-subtle"
                onClick={() => setEditingExams((current) => !current)}
                variant="ghost"
              >
                {editingExams ? <X size={15} /> : <Plus size={15} />}
                <span className="text-label">
                  {editingExams ? "Fertig" : "Termine"}
                </span>
              </Button>
            </div>
          </div>

          {shownExam && countdown ? (
            <>
              <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
                <div className="grid gap-1">
                  <div className="flex items-baseline gap-2">
                    <strong
                      className="text-[52px] font-semibold leading-none tracking-tight tabular-nums"
                      style={{
                        color: countdown.days <= 1 ? "var(--danger)" : "var(--accent)"
                      }}
                    >
                      {Math.max(0, countdown.days)}
                    </strong>
                    <span className="text-h3 font-medium text-text-muted">
                      {countdown.days === 1 ? "Tag" : "Tage"}
                    </span>
                    {countdown.days < 3 ? (
                      <span className="text-body text-text-subtle">
                        + {Math.max(0, countdown.hours)} Std.
                      </span>
                    ) : null}
                  </div>
                  <span className="text-body-sm text-text-muted">
                    {countdown.start.toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "2-digit"
                    })}
                    {shownExam.time ? ` · ${shownExam.time} Uhr` : ""}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {shownExam.subjects.map((subject) => (
                    <span
                      className="rounded-full border border-border bg-surface-muted px-3 py-1 text-body-sm text-text"
                      key={subject}
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              {/* Readiness for exactly the subjects being examined — the only
                  coverage number that means anything before a sitting. */}
              <div className="grid gap-3">
                {shownExam.subjects.map((subject, index) => {
                  const entry = bySubject.get(subject);

                  if (!entry || !entry.total) {
                    return (
                      <div
                        className="flex items-center justify-between gap-3 text-body-sm text-text-subtle"
                        key={subject}
                      >
                        <span>{subject}</span>
                        <span>keine Fragen im Bestand</span>
                      </div>
                    );
                  }

                  const done = Math.round((entry.answered / entry.total) * 100);
                  const accuracy = entry.graded
                    ? Math.round((entry.correct / entry.graded) * 100)
                    : null;

                  return (
                    <button
                      className="group grid gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-muted"
                      key={subject}
                      onClick={() => onPracticeSubject(subject)}
                      type="button"
                    >
                      <div className="flex items-baseline justify-between gap-3 text-body-sm">
                        <span className="truncate font-medium text-text">{subject}</span>
                        <span className="shrink-0 tabular-nums text-text-muted">
                          {entry.answered}/{entry.total}
                          {accuracy !== null ? ` · ${accuracy}%` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(done, done > 0 ? 2 : 0)}%`,
                            backgroundColor:
                              accuracy === null
                                ? "var(--text-subtle)"
                                : accuracy >= 75
                                  ? "var(--accent)"
                                  : accuracy >= 55
                                    ? "var(--warning)"
                                    : "var(--danger)",
                            transition: `width 900ms cubic-bezier(.16,1,.3,1) ${
                              120 + index * 90
                            }ms`
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="m-0 text-body-sm text-text-muted">
              Keine Termine eingetragen — über „Termine" hinzufügen.
            </p>
          )}

          {editingExams ? (
            <ExamEditor exams={exams} onSave={onSaveExams} />
          ) : exams.length > 1 ? (
            <div className="grid gap-1 border-t border-border pt-4">
              {exams
                .filter((exam) => exam.id !== shownExam?.id)
                .slice(0, 3)
                .map((exam) => {
                  const start = parseExamStart(exam);

                  return (
                    <div
                      className="flex flex-wrap items-baseline justify-between gap-2 text-body-sm text-text-muted"
                      key={exam.id}
                    >
                      <span className="truncate">{exam.subjects.join(", ")}</span>
                      <span className="shrink-0 tabular-nums">
                        {start
                          ? start.toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit"
                            })
                          : exam.date}
                        {exam.time ? ` · ${exam.time}` : ""}
                      </span>
                    </div>
                  );
                })}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          delay={60}
          hint={
            activity.today.answered
              ? `${activity.today.correct} richtig`
              : "noch nichts gekreuzt"
          }
          icon={<Check size={14} />}
          label="Heute"
          value={activity.today.answered}
        />
        <StatTile
          delay={120}
          hint={activity.streak > 1 ? "Tage in Folge" : "heute angefangen"}
          icon={<Flame size={14} />}
          label="Serie"
          suffix={activity.streak === 1 ? " Tag" : " Tage"}
          tone="var(--warning)"
          value={activity.streak}
        />
        <StatTile
          delay={180}
          hint={`${activity.weekAnswered} Fragen in 7 Tagen`}
          icon={<Target size={14} />}
          label="Trefferquote"
          suffix="%"
          value={weekAccuracy}
        />
        <StatTile
          delay={240}
          hint={mistakeCount ? "zum Üben bereit" : "nichts offen"}
          icon={<ListChecks size={14} />}
          label="Offene Fehler"
          tone="var(--danger)"
          value={mistakeCount}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="dash-enter grid gap-4 rounded-2xl border border-border bg-surface p-5"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <strong className="text-body font-semibold text-text">Letzte 14 Tage</strong>
            <span className="text-label text-text-subtle">
              {activity.days.reduce((sum, day) => sum + day.answered, 0)} Fragen
            </span>
          </div>

          {/* Scale rounded up to something readable so the axis reads 0 / 40 /
              80 rather than 0 / 37 / 74. */}
          <div className="flex gap-2">
            <div className="flex h-32 w-8 shrink-0 flex-col justify-between text-right text-label tabular-nums text-text-subtle">
              {[axisMax, Math.round(axisMax / 2), 0].map((tick) => (
                <span className="leading-none" key={tick}>
                  {tick}
                </span>
              ))}
            </div>

            <div className="relative h-32 flex-1">
              {[0, 50, 100].map((position) => (
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-border"
                  key={position}
                  style={{ top: `${position}%`, opacity: position === 100 ? 1 : 0.5 }}
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-1.5">
                {activity.days.map((day, index) => {
                  const height = (day.answered / axisMax) * 100;
                  const isToday = index === activity.days.length - 1;

                  return (
                    <div
                      className="group relative flex h-full flex-1 flex-col justify-end"
                      key={day.date.toISOString()}
                      title={`${day.date.toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit"
                      })}: ${day.answered} Fragen`}
                    >
                      {day.answered ? (
                        <span
                          className="mb-0.5 text-center text-[10px] leading-none tabular-nums text-text-subtle"
                          style={{ color: isToday ? "var(--accent)" : undefined }}
                        >
                          {day.answered}
                        </span>
                      ) : null}
                      <div
                        className="w-full rounded-t-[3px]"
                        style={{
                          height: `${day.answered ? Math.max(height, 3) : 1.5}%`,
                          backgroundColor: day.answered
                            ? isToday
                              ? "var(--accent)"
                              : "color-mix(in srgb, var(--accent) 45%, var(--surface-muted))"
                            : "var(--surface-muted)",
                          transition: `height 700ms cubic-bezier(.16,1,.3,1) ${index * 35}ms`
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-between pl-10 text-label text-text-subtle">
            <span>
              {activity.days[0].date.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit"
              })}
            </span>
            <span>heute</span>
          </div>
        </div>

        <div className="grid gap-3 content-start">
          {openSession ? (
            <button
              className="dash-enter flex items-center gap-3 rounded-2xl border border-accent bg-accent p-4 text-left text-accent-foreground transition-opacity hover:opacity-90"
              onClick={() => onResume(openSession)}
              style={{ animationDelay: "340ms" }}
              type="button"
            >
              <Play className="shrink-0" size={20} aria-hidden="true" />
              <span className="grid min-w-0 gap-0.5">
                <span className="text-body font-medium">Sitzung fortsetzen</span>
                <span className="truncate text-body-sm opacity-90">
                  {openSession.answered}/{openSession.questionIds.length} ·{" "}
                  {openSession.label}
                </span>
              </span>
            </button>
          ) : (
            <button
              className="dash-enter flex items-center gap-3 rounded-2xl border border-accent bg-accent p-4 text-left text-accent-foreground transition-opacity hover:opacity-90"
              onClick={onOpenSubjects}
              style={{ animationDelay: "340ms" }}
              type="button"
            >
              <Play className="shrink-0" size={20} aria-hidden="true" />
              <span className="grid min-w-0 gap-0.5">
                <span className="text-body font-medium">Klausur starten</span>
                <span className="text-body-sm opacity-90">Fach oder Termin wählen</span>
              </span>
            </button>
          )}

          <button
            className="dash-enter flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-muted disabled:opacity-50"
            disabled={!mistakeCount}
            onClick={onStartMistakes}
            style={{ animationDelay: "380ms" }}
            type="button"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-danger">
              <ListChecks size={18} aria-hidden="true" />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-body font-medium text-text">Fehler üben</span>
              <span className="text-body-sm text-text-muted">
                {mistakeCount} {mistakeCount === 1 ? "Fehler" : "Fehler"}
              </span>
            </span>
          </button>

          <button
            className="dash-enter flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:bg-surface-muted"
            onClick={onOpenSubjects}
            style={{ animationDelay: "420ms" }}
            type="button"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-accent">
              <BookOpenCheck size={18} aria-hidden="true" />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-body font-medium text-text">Klausuren</span>
              <span className="text-body-sm text-text-muted">Nach Fach &amp; Semester</span>
            </span>
          </button>
        </div>
      </section>

      {recentSessions.length ? (
        <section
          className="dash-enter grid gap-3"
          style={{ animationDelay: "460ms" }}
        >
          <h2 className="m-0 text-body font-semibold">Letzte Sitzungen</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            {recentSessions.map((session, index) => {
              const score = session.answered
                ? Math.round((session.correct / session.answered) * 100)
                : null;

              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between gap-4 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-muted",
                    index > 0 && "border-t border-border"
                  )}
                  key={session.id}
                  onClick={onOpenSessions}
                  type="button"
                >
                  <span className="min-w-0 truncate text-body-sm font-medium text-text">
                    {session.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-body-sm">
                    {score === null ? (
                      <span className="text-text-subtle">—</span>
                    ) : (
                      <span
                        className="rounded-full px-2 py-0.5 font-medium tabular-nums"
                        style={{
                          color:
                            score >= 75
                              ? "var(--accent)"
                              : score >= 55
                                ? "var(--warning)"
                                : "var(--danger)",
                          backgroundColor: `color-mix(in srgb, ${
                            score >= 75
                              ? "var(--accent)"
                              : score >= 55
                                ? "var(--warning)"
                                : "var(--danger)"
                          } 12%, var(--surface))`
                        }}
                      >
                        {score}%
                      </span>
                    )}
                    <span className="tabular-nums text-text-subtle">
                      {new Date(session.finishedAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit"
                      })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeLeaders.length ? (
        <section
          className="dash-enter grid gap-3"
          style={{ animationDelay: "500ms" }}
        >
          <h2 className="m-0 text-body font-semibold">Diese Woche</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            {activeLeaders.slice(0, 8).map((entry, index) => (
              <div
                className={cn(
                  "flex items-center gap-3 bg-surface px-4 py-2.5",
                  index > 0 && "border-t border-border"
                )}
                key={entry.userId}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label font-semibold"
                  style={
                    index === 0
                      ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
                      : { backgroundColor: "var(--surface-muted)", color: "var(--text-muted)" }
                  }
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-text">
                  {entry.name}
                </span>
                <span className="shrink-0 text-body-sm tabular-nums text-text-muted">
                  {entry.weeklyAnswered} · {entry.accuracy}%
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ExamEditor({
  exams,
  onSave
}: {
  exams: ExamDate[];
  onSave: (exams: ExamDate[]) => void;
}) {
  const [draft, setDraft] = useState<ExamDate[]>(exams);

  useEffect(() => {
    setDraft(exams);
  }, [exams]);

  function update(index: number, patch: Partial<ExamDate>) {
    setDraft((current) =>
      current.map((exam, position) =>
        position === index ? { ...exam, ...patch } : exam
      )
    );
  }

  return (
    <div className="grid gap-3 border-t border-border pt-4">
      {draft.map((exam, index) => (
        <div className="grid gap-2 sm:grid-cols-[150px_100px_minmax(0,1fr)_auto]" key={exam.id}>
          <Input
            aria-label="Datum"
            onChange={(event) => update(index, { date: event.target.value })}
            type="date"
            value={exam.date}
          />
          <Input
            aria-label="Uhrzeit"
            onChange={(event) => update(index, { time: event.target.value })}
            type="time"
            value={exam.time || ""}
          />
          <Input
            aria-label="Fächer, mit Komma getrennt"
            onChange={(event) =>
              update(index, {
                subjects: event.target.value.split(",").map((part) => part.trim())
              })
            }
            placeholder="Fächer, mit Komma getrennt"
            value={exam.subjects.join(", ")}
          />
          <Button
            aria-label="Termin entfernen"
            className="px-3 text-text-subtle hover:text-danger"
            onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}
            variant="ghost"
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            setDraft((current) => [
              ...current,
              {
                id: `exam-${Date.now().toString(36)}`,
                date: "",
                time: "14:00",
                subjects: []
              }
            ])
          }
          variant="secondary"
        >
          <Plus size={16} aria-hidden="true" />
          Termin hinzufügen
        </Button>
        <Button
          onClick={() =>
            onSave(
              draft
                .filter((exam) => exam.date)
                .map((exam) => ({
                  ...exam,
                  subjects: exam.subjects.filter(Boolean)
                }))
            )
          }
          variant="primary"
        >
          <Check size={16} aria-hidden="true" />
          Speichern
        </Button>
      </div>
    </div>
  );
}
