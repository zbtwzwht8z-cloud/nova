"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Play,
  RotateCcw
} from "lucide-react";

import HoldButton from "@/components/HoldButton";
import { Button, Segmented, Select } from "@/components/ui";
import type { Translate } from "@/lib/i18n";
import type { PaperSummary, SemesterGroup, SubjectSummary } from "@/lib/types";

type PapersViewProps = {
  semesters: SemesterGroup[];
  selectedSemester: string;
  onSemesterChange: (semester: string) => void;
  mode: "study" | "exam";
  onModeChange: (mode: "study" | "exam") => void;
  onStartPaper: (paper: PaperSummary, mode: "study" | "exam") => void;
  onStartPapers: (papers: PaperSummary[], mode: "study" | "exam") => void;
  onResetPaper: (paper: PaperSummary) => void;
  onToggleSubjectCompleted: (subject: string) => void;
  onMoveSubject: (semesterKey: string, subject: string, direction: -1 | 1) => void;
  completedSubjects: string[];
  t: Translate;
};

type Progress = { solved: boolean; answered: number; total: number };

function progressLabel({ answered, solved, total }: Progress, t: Translate) {
  if (solved) {
    return t("papers.solved");
  }

  if (answered === 0) {
    return t("papers.notStarted");
  }

  return `${answered} / ${total}`;
}

function scoreLabel(score: number | null) {
  return score === null ? "—" : `${Math.round(score)}%`;
}

// Session scores when there are any, otherwise the accuracy derived from the
// stored answers — so a paper that reads "Gelöst" always reports how it went.
function ScoreHistory({
  scores,
  fallback = null
}: {
  scores: number[];
  fallback?: number | null;
}) {
  if (!scores.length) {
    return fallback === null ? (
      <span className="tabular-nums text-text-subtle">—</span>
    ) : (
      <span className="font-medium tabular-nums text-text">
        {Math.round(fallback)}%
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 tabular-nums">
      {scores.map((score, index) => (
        <span
          className={
            index === 0
              ? "font-medium text-text"
              : "text-text-subtle"
          }
          key={index}
        >
          {Math.round(score)}%
          {index < scores.length - 1 ? (
            <span className="ml-1 text-text-subtle">·</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function countLabel(
  count: number,
  base: "question" | "paper" | "subject",
  t: Translate
) {
  return `${count} ${t(count === 1 ? `unit.${base}` : `unit.${base}s`)}`;
}

const checkboxClass =
  "h-4 min-h-0 w-4 shrink-0 rounded border border-border accent-accent";

export default function PapersView({
  semesters,
  selectedSemester,
  onSemesterChange,
  mode,
  onModeChange,
  onStartPaper,
  onStartPapers,
  onResetPaper,
  onToggleSubjectCompleted,
  onMoveSubject,
  completedSubjects,
  t
}: PapersViewProps) {
  const [openSubjectKey, setOpenSubjectKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const completedSet = useMemo(
    () => new Set(completedSubjects),
    [completedSubjects]
  );

  const papersByKey = useMemo(() => {
    const map = new Map<string, PaperSummary>();

    for (const semester of semesters) {
      for (const subject of semester.subjects) {
        for (const paper of subject.papers) {
          map.set(paper.key, paper);
        }
      }
    }

    return map;
  }, [semesters]);

  const effectiveSemester = semesters.some(
    (semester) => semester.key === selectedSemester
  )
    ? selectedSemester
    : semesters[0]?.key || "";
  const activeSemester =
    semesters.find((semester) => semester.key === effectiveSemester) || null;
  const openSubject =
    activeSemester?.subjects.find((subject) => subject.key === openSubjectKey) ||
    null;

  const selectedPapers = useMemo(
    () =>
      Array.from(selected)
        .map((key) => papersByKey.get(key))
        .filter((paper): paper is PaperSummary => Boolean(paper)),
    [selected, papersByKey]
  );
  const selectedQuestionCount = selectedPapers.reduce(
    (sum, paper) => sum + paper.total,
    0
  );

  function togglePaper(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSubject(subject: SubjectSummary) {
    const keys = subject.papers.map((paper) => paper.key);
    const allSelected = keys.length > 0 && keys.every((key) => selected.has(key));

    setSelected((current) => {
      const next = new Set(current);
      keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
      return next;
    });
  }

  function selectSemester(key: string) {
    setOpenSubjectKey(null);
    onSemesterChange(key);
  }

  return (
    <div className="mx-auto grid max-w-content gap-8 bg-bg font-sans text-body font-normal text-text">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <p className="m-0 max-w-[720px] text-body text-text-muted">{t("papers.intro")}</p>

        <div className="flex">
          <Segmented
            ariaLabel="Modus"
            onChange={onModeChange}
            options={[
              ["study", t("papers.study")],
              ["exam", t("papers.exam")]
            ] as const}
            value={mode}
          />
        </div>
      </section>

      <div className="grid gap-2 md:hidden">
            <label className="text-body-sm font-medium text-text" htmlFor="papers-semester">
              {t("papers.semester")}
            </label>
            <Select
              id="papers-semester"
              onChange={(event) => selectSemester(event.target.value)}
              value={effectiveSemester}
            >
              {semesters.map((semester) => (
                <option key={semester.key} value={semester.key}>
                  {semester.label} · {countLabel(semester.subjectCount, "subject", t)}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-8 md:grid-cols-12">
            <aside className="hidden md:col-span-3 md:block">
              <h2 className="m-0 mb-3 text-label font-semibold text-text-muted">
                {t("papers.semester")}
              </h2>
              <nav aria-label="Semesters" className="grid gap-1">
                {semesters.map((semester) => {
                  const active = effectiveSemester === semester.key;

                  return (
                    <Button
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "w-full justify-between bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] text-accent"
                          : "w-full justify-between"
                      }
                      key={semester.key}
                      onClick={() => selectSemester(semester.key)}
                      variant="ghost"
                    >
                      <span>{semester.label}</span>
                      <span className="text-label text-text-subtle">
                        {semester.subjectCount}
                      </span>
                    </Button>
                  );
                })}
              </nav>
            </aside>

            <section aria-labelledby="papers-list-heading" className="md:col-span-9">
              {openSubject ? (
                <SubjectPapers
                  isSelected={(key) => selected.has(key)}
                  mode={mode}
                  onBack={() => setOpenSubjectKey(null)}
                  onResetPaper={onResetPaper}
                  onStartPaper={onStartPaper}
                  onTogglePaper={togglePaper}
                  subject={openSubject}
                  t={t}
                />
              ) : (
                <SubjectList
                  completedSubjects={completedSet}
                  isPaperSelected={(key) => selected.has(key)}
                  onOpenSubject={(subject) => setOpenSubjectKey(subject.key)}
                  onMoveSubject={onMoveSubject}
                  onToggleSubject={toggleSubject}
                  onToggleSubjectCompleted={onToggleSubjectCompleted}
                  semester={activeSemester}
                  t={t}
                />
              )}
            </section>
          </div>

      {selected.size ? (
        <div
          className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg/95 px-6 py-3 backdrop-blur"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <span className="text-body-sm text-text-muted">
            {countLabel(selected.size, "paper", t)} ·{" "}
            {countLabel(selectedQuestionCount, "question", t)} {t("papers.selected")}
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setSelected(new Set())} variant="ghost">
              {t("common.clear")}
            </Button>
            <Button
              onClick={() => onStartPapers(selectedPapers, mode)}
              variant="primary"
            >
              <Play size={18} aria-hidden="true" />
              {t("papers.startPapers")} {countLabel(selected.size, "paper", t)}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubjectList({
  semester,
  onOpenSubject,
  onToggleSubject,
  onToggleSubjectCompleted,
  onMoveSubject,
  completedSubjects,
  isPaperSelected,
  t
}: {
  semester: SemesterGroup | null;
  onOpenSubject: (subject: SubjectSummary) => void;
  onToggleSubject: (subject: SubjectSummary) => void;
  onToggleSubjectCompleted: (subject: string) => void;
  onMoveSubject: (semesterKey: string, subject: string, direction: -1 | 1) => void;
  completedSubjects: Set<string>;
  isPaperSelected: (key: string) => boolean;
  t: Translate;
}) {
  return (
    <>
      <div className="flex items-end justify-between gap-4 pb-4">
        <div className="grid gap-1">
          <h2 className="m-0 text-h2 font-semibold" id="papers-list-heading">
            {semester?.label || t("papers.semester")}
          </h2>
          <p className="m-0 text-body-sm text-text-muted">
            {countLabel(semester?.subjectCount || 0, "subject", t)}
          </p>
        </div>
      </div>

      {semester && semester.subjects.length ? (
        <div className="divide-y divide-border border-y border-border">
          {semester.subjects.map((subject, index) => {
            const keys = subject.papers.map((paper) => paper.key);
            const allSelected =
              keys.length > 0 && keys.every((key) => isPaperSelected(key));

            const done = completedSubjects.has(subject.subject);

            return (
              <div className="flex items-center gap-3 py-3" key={subject.key}>
                <div className="flex shrink-0 flex-col">
                  <button
                    aria-label={`${subject.subject} nach oben`}
                    className="rounded px-1 text-text-subtle transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={index === 0}
                    onClick={() => onMoveSubject(subject.semesterKey, subject.subject, -1)}
                    title="Nach oben"
                    type="button"
                  >
                    <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label={`${subject.subject} nach unten`}
                    className="rounded px-1 text-text-subtle transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={index === (semester?.subjects.length || 0) - 1}
                    onClick={() => onMoveSubject(subject.semesterKey, subject.subject, 1)}
                    title="Nach unten"
                    type="button"
                  >
                    <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  aria-label={`${subject.subject}`}
                  checked={allSelected}
                  className={checkboxClass}
                  onChange={() => onToggleSubject(subject)}
                  type="checkbox"
                />
                <button
                  className="grid min-w-0 flex-1 gap-1 text-left"
                  onClick={() => onOpenSubject(subject)}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={
                        done
                          ? "text-body font-medium text-text-muted line-through"
                          : "text-body font-medium text-text"
                      }
                    >
                      {subject.subject}
                    </span>
                    {done ? (
                      <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] px-2 py-0.5 text-label font-medium text-accent">
                        Fertig
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-muted">
                    <span>{countLabel(subject.total, "question", t)}</span>
                    <span>{countLabel(subject.papers.length, "paper", t)}</span>
                    <span>{progressLabel(subject, t)}</span>
                    <span className="flex items-center gap-1">
                      {t("papers.latestScore")} <ScoreHistory fallback={subject.latestScore} scores={subject.recentScores} />
                    </span>
                  </span>
                </button>
                <Button
                  aria-label={
                    done
                      ? `${subject.subject} als offen markieren`
                      : `${subject.subject} als fertig markieren`
                  }
                  aria-pressed={done}
                  className={done ? "px-3 text-accent" : "px-3 text-text-subtle hover:text-accent"}
                  onClick={() => onToggleSubjectCompleted(subject.subject)}
                  title={done ? "Als offen markieren" : "Als fertig markieren"}
                  variant="ghost"
                >
                  {done ? (
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Circle aria-hidden="true" className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  aria-label={subject.subject}
                  className="px-3"
                  onClick={() => onOpenSubject(subject)}
                  variant="ghost"
                >
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="m-0 border-y border-border py-4 text-body text-text-muted">
          —
        </p>
      )}
    </>
  );
}

function SubjectPapers({
  subject,
  mode,
  onBack,
  onStartPaper,
  onResetPaper,
  onTogglePaper,
  isSelected,
  t
}: {
  subject: SubjectSummary;
  mode: "study" | "exam";
  onBack: () => void;
  onStartPaper: (paper: PaperSummary, mode: "study" | "exam") => void;
  onResetPaper: (paper: PaperSummary) => void;
  onTogglePaper: (key: string) => void;
  isSelected: (key: string) => boolean;
  t: Translate;
}) {
  return (
    <>
      <button
        className="m-0 mb-3 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-body-sm text-text-muted hover:text-text"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        <span>{subject.semesterLabel}</span>
      </button>

      <div className="flex items-end justify-between gap-4 pb-4">
        <div className="grid gap-1">
          <h2 className="m-0 text-h2 font-semibold" id="papers-list-heading">
            {subject.subject}
          </h2>
          <p className="m-0 text-body-sm text-text-muted">
            {countLabel(subject.papers.length, "paper", t)} ·{" "}
            {countLabel(subject.total, "question", t)}
          </p>
        </div>
      </div>

      {subject.papers.length ? (
        <div className="divide-y divide-border border-y border-border">
          {subject.papers.map((paper) => (
            <div className="flex items-center gap-3 py-3" key={paper.key}>
              <input
                aria-label={paper.examTerm}
                checked={isSelected(paper.key)}
                className={checkboxClass}
                onChange={() => onTogglePaper(paper.key)}
                type="checkbox"
              />
              <div className="grid min-w-0 flex-1 gap-1">
                <span className="text-body font-medium text-text">
                  {paper.examTerm}
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-text-muted">
                  <span>{countLabel(paper.total, "question", t)}</span>
                  <span>{progressLabel(paper, t)}</span>
                  <span className="flex items-center gap-1">
                    {t("papers.latestScore")} <ScoreHistory fallback={paper.latestScore} scores={paper.recentScores} />
                  </span>
                </span>
              </div>
              {paper.answered > 0 || paper.recentScores.length ? (
                <HoldButton
                  holdLabel={`${paper.examTerm} zurücksetzen — gedrückt halten`}
                  label={`Fortschritt ${paper.examTerm} zurücksetzen — gedrückt halten`}
                  onConfirm={() => onResetPaper(paper)}
                >
                  <RotateCcw aria-hidden="true" className="h-4 w-4" />
                </HoldButton>
              ) : null}
              <Button
                aria-label={`${subject.subject} ${paper.examTerm}`}
                className="px-3"
                onClick={() => onStartPaper(paper, mode)}
                variant="ghost"
              >
                <Play aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="m-0 border-y border-border py-4 text-body text-text-muted">
          —
        </p>
      )}
    </>
  );
}
