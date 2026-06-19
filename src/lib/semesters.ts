import type { Question } from "./types";

export type SemesterInfo = {
  key: string;
  label: string;
  sort: number;
};

function fullYear(value: string) {
  const parsed = Number(value);

  if (value.length === 4) {
    return parsed;
  }

  return parsed >= 80 ? 1900 + parsed : 2000 + parsed;
}

function shortYear(value: number) {
  return String(value).slice(-2);
}

export function semesterInfoFromText(value?: string): SemesterInfo | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const match = normalized.match(/\b(WiSe|WS|SS)\s*([0-9]{2,4})(?:\s*\/\s*([0-9]{2,4}))?/i);

  if (!match) {
    return null;
  }

  const term = match[1].toLowerCase() === "ss" ? "SS" : "WS";
  const startYear = fullYear(match[2]);
  const endYear = match[3] ? fullYear(match[3]) : startYear + (term === "WS" ? 1 : 0);
  const label =
    term === "SS"
      ? `SS ${shortYear(startYear)}`
      : `WS ${shortYear(startYear)}/${shortYear(endYear)}`;

  return {
    key: `${term}-${startYear}-${endYear}`,
    label,
    sort: startYear * 2 + (term === "WS" ? 1 : 0)
  };
}

export function semesterInfoForQuestion(question: Question) {
  return (
    semesterInfoFromText(question.topic) ||
    semesterInfoFromText(question.source) ||
    (question.tags || [])
      .map((tag) => semesterInfoFromText(tag))
      .find((semester): semester is SemesterInfo => Boolean(semester)) ||
    null
  );
}

export function questionSemesterKey(question: Question) {
  return semesterInfoForQuestion(question)?.key || "unsorted";
}

export function semesterOptionsForQuestions(questions: Question[]) {
  const semesters = new Map<string, SemesterInfo>();

  for (const question of questions) {
    const semester = semesterInfoForQuestion(question);

    if (semester) {
      semesters.set(semester.key, semester);
    }
  }

  return Array.from(semesters.values()).sort((left, right) => {
    if (left.sort !== right.sort) {
      return right.sort - left.sort;
    }

    return left.label.localeCompare(right.label);
  });
}

export function compareTopicBySemester(left: string, right: string) {
  const leftSemester = semesterInfoFromText(left);
  const rightSemester = semesterInfoFromText(right);

  if (leftSemester && rightSemester && leftSemester.sort !== rightSemester.sort) {
    return rightSemester.sort - leftSemester.sort;
  }

  if (leftSemester && !rightSemester) {
    return -1;
  }

  if (!leftSemester && rightSemester) {
    return 1;
  }

  return left.localeCompare(right);
}
