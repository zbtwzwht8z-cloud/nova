"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  BookMarked,
  BookOpenCheck,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileWarning,
  Gauge,
  History,
  Import,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  Play,
  RotateCcw,
  Search,
  Shield,
  Timer,
  Trash2,
  Upload,
  UserPlus,
  Wifi,
  WifiOff,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import StoaLanding from "@/components/StoaLanding";
import {
  compareTopicBySemester,
  questionSemesterKey,
  semesterOptionsForQuestions
} from "@/lib/semesters";
import type {
  BookmarkFolder,
  LeaderboardEntry,
  Question,
  QuestionMetrics,
  QuestionReport,
  StoredAnswer,
  StoredProgress,
  StudySessionLog,
  TrainerUser
} from "@/lib/types";
import { progressStats, subjectStats } from "@/lib/stats";

type TrainerAppProps = {
  questionMetrics: QuestionMetrics;
};

type View =
  | "dashboard"
  | "subjects"
  | "trainer"
  | "sessions"
  | "search"
  | "mistakes"
  | "bookmarks"
  | "admin";
type SessionMode = "study" | "exam" | "review";
type Pool = "all" | "unanswered" | "wrong" | "bookmarked";
type SessionOrder = "latest" | "oldest" | "subject" | "random";
type ReportType = QuestionReport["type"];

const STORAGE_KEY = "private-mcq-trainer-progress-v2";
const LEGACY_STORAGE_KEY = "private-mcq-trainer-progress";
const LOCAL_SW_CLEANUP_KEY = "stoa-local-service-worker-cleaned";
const DEFAULT_COUNT = 40;

const navItems: Array<{
  view: View;
  label: string;
  icon: typeof LayoutDashboard;
  admin?: boolean;
}> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "subjects", label: "Subjects", icon: BookOpenCheck },
  { view: "trainer", label: "Trainer", icon: Play },
  { view: "sessions", label: "Sessions", icon: History },
  { view: "search", label: "Search", icon: Search },
  { view: "mistakes", label: "Mistakes", icon: NotebookPen },
  { view: "bookmarks", label: "Bookmarks", icon: BookMarked },
  { view: "admin", label: "Admin", icon: Shield, admin: true }
];

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function clean(value: string) {
  return value.toLowerCase().trim();
}

function sortUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function formatPercent(value: number) {
  return `${Math.round(Number.isFinite(value) ? value : 0)}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function shuffleItems<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function orderQuestions(items: Question[], order: SessionOrder) {
  if (order === "random") {
    return shuffleItems(items);
  }

  return [...items].sort((left, right) => {
    const leftSemester = questionSemesterKey(left);
    const rightSemester = questionSemesterKey(right);

    if (order === "subject") {
      const subject = left.subject.localeCompare(right.subject);

      if (subject) {
        return subject;
      }

      return compareTopicBySemester(left.topic, right.topic);
    }

    const semester = compareTopicBySemester(left.topic, right.topic);

    if (semester) {
      return order === "oldest" ? -semester : semester;
    }

    return order === "oldest"
      ? leftSemester.localeCompare(rightSemester)
      : rightSemester.localeCompare(leftSemester);
  });
}

function defaultFolder(): BookmarkFolder {
  return {
    id: "default",
    name: "Saved",
    color: "#216e62",
    questionIds: [],
    createdAt: now()
  };
}

function emptyProgress(): StoredProgress {
  return {
    answers: {},
    bookmarks: [],
    bookmarkFolders: [defaultFolder()],
    activeFolderId: "default",
    sessionLog: []
  };
}

function normalizeProgress(progress?: StoredProgress | null): StoredProgress {
  const base = progress || emptyProgress();
  const folders =
    base.bookmarkFolders && base.bookmarkFolders.length
      ? base.bookmarkFolders
      : [defaultFolder()];
  const legacyBookmarks = Array.isArray(base.bookmarks) ? base.bookmarks : [];
  const firstFolder = folders[0] || defaultFolder();
  const folderIds = new Set(firstFolder.questionIds || []);

  for (const questionId of legacyBookmarks) {
    folderIds.add(questionId);
  }

  return {
    answers: base.answers || {},
    bookmarks: Array.from(
      new Set([
        ...legacyBookmarks,
        ...folders.flatMap((folder) => folder.questionIds || [])
      ])
    ),
    bookmarkFolders: [
      {
        ...firstFolder,
        questionIds: Array.from(folderIds)
      },
      ...folders.slice(1).map((folder) => ({
        ...folder,
        questionIds: Array.from(new Set(folder.questionIds || []))
      }))
    ],
    activeFolderId: base.activeFolderId || folders[0]?.id || "default",
    sessionLog: Array.isArray(base.sessionLog) ? base.sessionLog : [],
    updatedAt: base.updatedAt
  };
}

function loadLocalProgress() {
  if (typeof window === "undefined") {
    return emptyProgress();
  }

  const raw =
    window.localStorage.getItem(STORAGE_KEY) ||
    window.localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    return emptyProgress();
  }

  try {
    return normalizeProgress(JSON.parse(raw) as StoredProgress);
  } catch {
    return emptyProgress();
  }
}

function questionText(question: Question) {
  return clean(
    [
      question.stem,
      question.subject,
      question.topic,
      question.source,
      ...(question.tags || []),
      ...(question.notes || []),
      ...question.choices.map((choice) => choice.text)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function proxiedImage(src?: string) {
  return src ? `/api/image?src=${encodeURIComponent(src)}` : undefined;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Request failed" }));

    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default function TrainerApp({ questionMetrics }: TrainerAppProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [user, setUser] = useState<TrainerUser | null>(null);
  const [users, setUsers] = useState<TrainerUser[]>([]);
  const [devLogin, setDevLogin] = useState<null | { username: string; password: string }>(
    null
  );
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [progress, setProgress] = useState<StoredProgress>(() => loadLocalProgress());
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "offline">(
    "local"
  );
  const [online, setOnline] = useState(true);
  const [offlineReady, setOfflineReady] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [adminState, setAdminState] = useState<null | {
    progressUsers: number;
    openReports: number;
    storage: string;
  }>(null);

  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("Allgemeinmedizin");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState<Pool>("all");
  const [mode, setMode] = useState<SessionMode>("study");
  const [sessionOrder, setSessionOrder] = useState<SessionOrder>("latest");
  const [sessionCount, setSessionCount] = useState(DEFAULT_COUNT);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [activeSessionLogId, setActiveSessionLogId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examFinished, setExamFinished] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(now());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedMistakeIds, setSelectedMistakeIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [reportType, setReportType] = useState<ReportType>("wrong-answer");
  const [reportText, setReportText] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<TrainerUser["role"]>("member");
  const [editingPasswords, setEditingPasswords] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );
  const semesters = useMemo(() => semesterOptionsForQuestions(questions), [questions]);
  const selectedSemesterLabel =
    selectedSemester === "all"
      ? "All semesters"
      : semesters.find((semester) => semester.key === selectedSemester)?.label ||
        "Selected semester";
  const semesterQuestions = useMemo(
    () =>
      selectedSemester === "all"
        ? questions
        : questions.filter((question) => questionSemesterKey(question) === selectedSemester),
    [questions, selectedSemester]
  );
  const subjects = useMemo(
    () => sortUnique(semesterQuestions.map((question) => question.subject)),
    [semesterQuestions]
  );
  const topics = useMemo(
    () =>
      sortUnique(
        semesterQuestions
          .filter(
            (question) =>
              selectedSubject === "all" || question.subject === selectedSubject
          )
          .map((question) => question.topic)
      ).sort(compareTopicBySemester),
    [semesterQuestions, selectedSubject]
  );
  const stats = useMemo(() => progressStats(progress, questions), [progress, questions]);
  const subjectsSummary = useMemo(
    () => subjectStats(progress, semesterQuestions),
    [progress, semesterQuestions]
  );
  const folders = progress.bookmarkFolders || [defaultFolder()];
  const activeFolder =
    folders.find((folder) => folder.id === progress.activeFolderId) || folders[0];
  const bookmarkedIds = useMemo(
    () => new Set(folders.flatMap((folder) => folder.questionIds || [])),
    [folders]
  );

  const filteredPool = useMemo(() => {
    const normalizedQuery = clean(query);

    return semesterQuestions.filter((question) => {
      const answer = progress.answers[question.id];

      if (selectedSubject !== "all" && question.subject !== selectedSubject) {
        return false;
      }

      if (selectedTopic !== "all" && question.topic !== selectedTopic) {
        return false;
      }

      if (normalizedQuery && !questionText(question).includes(normalizedQuery)) {
        return false;
      }

      if (pool === "unanswered" && answer) {
        return false;
      }

      if (pool === "wrong" && (!answer || answer.correct)) {
        return false;
      }

      if (pool === "bookmarked" && !bookmarkedIds.has(question.id)) {
        return false;
      }

      return true;
    });
  }, [
    bookmarkedIds,
    pool,
    progress.answers,
    query,
    semesterQuestions,
    selectedSubject,
    selectedTopic
  ]);

  const sessionQuestions = useMemo(() => {
    const ids = sessionIds.length
      ? sessionIds
      : filteredPool.slice(0, DEFAULT_COUNT).map((question) => question.id);

    return ids
      .map((questionId) => questionById.get(questionId))
      .filter((question): question is Question => Boolean(question));
  }, [filteredPool, questionById, sessionIds]);

  const activeQuestion = sessionQuestions[activeIndex] || sessionQuestions[0];
  const activeStoredAnswer = activeQuestion
    ? progress.answers[activeQuestion.id]
    : undefined;
  const activeExamAnswer = activeQuestion ? examAnswers[activeQuestion.id] : undefined;
  const selectedAnswer =
    mode === "exam" && !examFinished ? activeExamAnswer : activeStoredAnswer?.selected;
  const shouldReveal = mode !== "exam" || examFinished;

  const searchResults = useMemo(() => {
    const normalized = clean(searchQuery);

    if (normalized.length < 2) {
      return [];
    }

    return questions
      .filter((question) => questionText(question).includes(normalized))
      .slice(0, 80);
  }, [questions, searchQuery]);

  const missedQuestions = useMemo(
    () =>
      Object.entries(progress.answers)
        .filter(([, answer]) => !answer.correct)
        .map(([questionId, answer]) => ({
          question: questionById.get(questionId),
          answer
        }))
        .filter(
          (item): item is { question: Question; answer: StoredAnswer } =>
            Boolean(item.question)
        )
        .sort(
          (left, right) =>
            new Date(right.answer.answeredAt).getTime() -
            new Date(left.answer.answeredAt).getTime()
        ),
    [progress.answers, questionById]
  );
  const sessionLogs = useMemo(() => progress.sessionLog || [], [progress.sessionLog]);
  const selectedSession =
    sessionLogs.find((session) => session.id === selectedSessionId) ||
    sessionLogs[0] ||
    null;

  useEffect(() => {
    if (selectedSubject !== "all" && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0] || "all");
    }
  }, [selectedSubject, subjects]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);

    setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    if ("serviceWorker" in navigator) {
      const isLocalhost = ["localhost", "127.0.0.1"].includes(
        window.location.hostname
      );

      if (isLocalhost) {
        const clearLocalWorker = async () => {
          const registrations = await navigator.serviceWorker.getRegistrations();

          await Promise.all(
            registrations.map((registration) => registration.unregister())
          );

          if ("caches" in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
          }

          setOfflineReady(false);

          if (
            navigator.serviceWorker.controller &&
            !window.sessionStorage.getItem(LOCAL_SW_CLEANUP_KEY)
          ) {
            window.sessionStorage.setItem(LOCAL_SW_CLEANUP_KEY, "true");
            window.location.reload();
          }
        };

        clearLocalWorker().catch(() => setOfflineReady(false));
      } else {
        window.sessionStorage.removeItem(LOCAL_SW_CLEANUP_KEY);
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => setOfflineReady(true))
          .catch(() => setOfflineReady(false));
      }
    }

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    jsonFetch<{
      user: TrainerUser | null;
      users: TrainerUser[];
      devLogin: null | { username: string; password: string };
    }>("/api/auth/me")
      .then((data) => {
        setUser(data.user);
        setUsers(data.users);
        setDevLogin(data.devLogin);

        if (!data.user) {
          setReady(true);
          return;
        }

        return loadProgressFromServer();
      })
      .catch(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) {
      setQuestions([]);
      setQuestionsReady(false);
      setQuestionsError("");
      return;
    }

    void loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }

    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }

    syncTimer.current = setTimeout(() => {
      setSyncStatus("syncing");
      jsonFetch<{ progress: StoredProgress }>("/api/progress", {
        method: "POST",
        body: JSON.stringify({ progress })
      })
        .then(() => {
          setSyncStatus("synced");
          refreshLeaderboard();
        })
        .catch(() => setSyncStatus("offline"));
    }, 650);

    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, ready, user?.id]);

  useEffect(() => {
    if (!user) {
      return;
    }

    refreshReports();
    refreshLeaderboard();

    if (user.role === "admin") {
      refreshAdmin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (user?.role === "admin" && view === "admin") {
      refreshAdmin();
      refreshReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, user?.role]);

  async function loadProgressFromServer() {
    try {
      const data = await jsonFetch<{ progress: StoredProgress }>("/api/progress");
      setProgress(normalizeProgress(data.progress));
      setSyncStatus("synced");
    } catch {
      setProgress(loadLocalProgress());
      setSyncStatus("offline");
    } finally {
      setReady(true);
    }
  }

  async function loadQuestions() {
    setQuestionsReady(false);
    setQuestionsError("");

    try {
      const data = await jsonFetch<{ questions: Question[] }>("/api/questions");
      setQuestions(data.questions);
    } catch (error) {
      setQuestionsError(
        error instanceof Error ? error.message : "Could not load questions"
      );
    } finally {
      setQuestionsReady(true);
    }
  }

  function refreshLeaderboard() {
    jsonFetch<{ leaderboard: LeaderboardEntry[] }>("/api/leaderboard")
      .then((data) => setLeaderboard(data.leaderboard))
      .catch(() => undefined);
  }

  function refreshReports() {
    jsonFetch<{ reports: QuestionReport[] }>("/api/reports")
      .then((data) => setReports(data.reports))
      .catch(() => undefined);
  }

  function refreshAdmin() {
    jsonFetch<{
      progressUsers: number;
      openReports: number;
      storage: string;
    }>("/api/admin/state")
      .then(setAdminState)
      .catch(() => undefined);
  }

  function patchProgress(updater: (current: StoredProgress) => StoredProgress) {
    setProgress((current) => normalizeProgress(updater(normalizeProgress(current))));
  }

  function sessionLabel(nextMode = mode, nextPool = pool) {
    const parts = [
      selectedSemesterLabel,
      selectedSubject === "all" ? "All subjects" : selectedSubject,
      selectedTopic === "all" ? null : selectedTopic,
      nextPool === "all" ? null : nextPool
    ].filter(Boolean);

    return `${nextMode} · ${parts.join(" / ")}`;
  }

  function startSessionFromIds(
    ids: string[],
    nextMode: SessionMode,
    label: string,
    source?: StudySessionLog["source"]
  ) {
    const sessionId = id("session");
    const startedAt = now();

    setMode(nextMode);
    setSessionIds(ids);
    setActiveIndex(0);
    setExamAnswers({});
    setExamFinished(false);
    setSessionStartedAt(startedAt);
    setActiveSessionLogId(sessionId);
    setView("trainer");

    patchProgress((current) => ({
      ...current,
      sessionLog: [
        {
          id: sessionId,
          mode: nextMode,
          label,
          questionIds: ids,
          answered: 0,
          correct: 0,
          mistakeQuestionIds: [],
          startedAt,
          finishedAt: startedAt,
          source
        },
        ...(current.sessionLog || [])
      ].slice(0, 80)
    }));
  }

  function startSession(nextMode = mode, nextPool = pool) {
    const base = filteredPool.filter((question) => {
      if (nextPool === "all") {
        return true;
      }

      const answer = progress.answers[question.id];

      if (nextPool === "unanswered") {
        return !answer;
      }

      if (nextPool === "wrong") {
        return answer && !answer.correct;
      }

      return bookmarkedIds.has(question.id);
    });
    const ordered = orderQuestions(base, sessionOrder);
    const picked = ordered
      .slice(0, Math.min(sessionCount || DEFAULT_COUNT, ordered.length))
      .map((question) => question.id);

    setPool(nextPool);
    startSessionFromIds(picked, nextMode, sessionLabel(nextMode, nextPool), {
      semester: selectedSemesterLabel,
      subject: selectedSubject === "all" ? "All subjects" : selectedSubject,
      topic: selectedTopic === "all" ? "All topics" : selectedTopic,
      pool: nextPool,
      order: sessionOrder
    });
  }

  function recordAnswer(question: Question, selected: string, answerMode = mode) {
    patchProgress((current) => {
      const previous = current.answers[question.id];
      const answer: StoredAnswer = {
        selected,
        correct: selected === question.answer,
        attempts: (previous?.attempts || 0) + 1,
        answeredAt: now(),
        mode: answerMode === "exam" ? "exam" : "study",
        confidence: previous?.confidence
      };

      const nextProgress = {
        ...current,
        answers: {
          ...current.answers,
          [question.id]: answer
        }
      };

      if (!activeSessionLogId) {
        return nextProgress;
      }

      return updateSessionLog(nextProgress, activeSessionLogId);
    });
  }

  function updateSessionLog(progressState: StoredProgress, sessionId: string) {
    const sessionLog = progressState.sessionLog || [];
    const target = sessionLog.find((session) => session.id === sessionId);

    if (!target) {
      return progressState;
    }

    const answeredIds = target.questionIds.filter(
      (questionId) => progressState.answers[questionId]
    );
    const mistakeQuestionIds = answeredIds.filter(
      (questionId) => !progressState.answers[questionId]?.correct
    );
    const correct = answeredIds.length - mistakeQuestionIds.length;

    return {
      ...progressState,
      sessionLog: sessionLog.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              answered: answeredIds.length,
              correct,
              mistakeQuestionIds,
              finishedAt: now()
            }
          : session
      )
    };
  }

  function answerQuestion(question: Question, selected: string) {
    if (mode === "exam" && !examFinished) {
      setExamAnswers((current) => ({
        ...current,
        [question.id]: selected
      }));
      return;
    }

    recordAnswer(question, selected);
  }

  function finishExam() {
    const answeredIds = Object.keys(examAnswers);
    const correct = answeredIds.filter(
      (questionId) => examAnswers[questionId] === questionById.get(questionId)?.answer
    ).length;
    const mistakeQuestionIds = answeredIds.filter(
      (questionId) => examAnswers[questionId] !== questionById.get(questionId)?.answer
    );

    patchProgress((current) => {
      const answers = { ...current.answers };

      for (const questionId of answeredIds) {
        const question = questionById.get(questionId);

        if (!question) {
          continue;
        }

        const previous = answers[questionId];
        answers[questionId] = {
          selected: examAnswers[questionId],
          correct: examAnswers[questionId] === question.answer,
          attempts: (previous?.attempts || 0) + 1,
          answeredAt: now(),
          mode: "exam",
          confidence: previous?.confidence
        };
      }

      const sessionLog = current.sessionLog || [];
      const nextProgress = {
        ...current,
        answers
      };

      if (!activeSessionLogId) {
        const log: StudySessionLog = {
          id: id("session"),
          mode: "exam",
          label: sessionLabel("exam", pool),
          questionIds: sessionQuestions.map((question) => question.id),
          answered: answeredIds.length,
          correct,
          mistakeQuestionIds,
          startedAt: sessionStartedAt,
          finishedAt: now()
        };

        return {
          ...nextProgress,
          sessionLog: [log, ...sessionLog].slice(0, 80)
        };
      }

      return {
        ...nextProgress,
        sessionLog: sessionLog.map((session) =>
          session.id === activeSessionLogId
            ? {
                ...session,
                answered: answeredIds.length,
                correct,
                mistakeQuestionIds,
                finishedAt: now()
              }
            : session
        )
      };
    });

    setExamFinished(true);
  }

  function setConfidence(questionId: string, confidence: StoredAnswer["confidence"]) {
    patchProgress((current) => {
      const answer = current.answers[questionId];

      if (!answer) {
        return current;
      }

      return {
        ...current,
        answers: {
          ...current.answers,
          [questionId]: {
            ...answer,
            confidence
          }
        }
      };
    });
  }

  function toggleBookmark(questionId: string) {
    patchProgress((current) => {
      const folders = current.bookmarkFolders?.length
        ? [...current.bookmarkFolders]
        : [defaultFolder()];
      const folderIndex = Math.max(
        folders.findIndex((folder) => folder.id === current.activeFolderId),
        0
      );
      const folder = folders[folderIndex];
      const ids = new Set(folder.questionIds || []);

      if (ids.has(questionId)) {
        ids.delete(questionId);
      } else {
        ids.add(questionId);
      }

      folders[folderIndex] = {
        ...folder,
        questionIds: Array.from(ids)
      };

      return {
        ...current,
        bookmarkFolders: folders,
        bookmarks: Array.from(new Set(folders.flatMap((item) => item.questionIds)))
      };
    });
  }

  function createFolder() {
    if (!newFolderName.trim()) {
      return;
    }

    const folder: BookmarkFolder = {
      id: id("folder"),
      name: newFolderName.trim(),
      color: ["#216e62", "#315d9f", "#8f4d38", "#6f5b9d"][
        folders.length % 4
      ],
      questionIds: [],
      createdAt: now()
    };

    patchProgress((current) => ({
      ...current,
      bookmarkFolders: [...(current.bookmarkFolders || []), folder],
      activeFolderId: folder.id
    }));
    setNewFolderName("");
  }

  function clearCurrentAnswer() {
    if (!activeQuestion) {
      return;
    }

    patchProgress((current) => {
      const { [activeQuestion.id]: _removed, ...answers } = current.answers;

      return {
        ...current,
        answers
      };
    });
  }

  async function submitReport(questionId: string) {
    if (!reportText.trim()) {
      return;
    }

    await jsonFetch<{ report: QuestionReport }>("/api/reports", {
      method: "POST",
      body: JSON.stringify({
        questionId,
        type: reportType,
        text: reportText
      })
    });
    setReportText("");
    setReportType("wrong-answer");
    setNotice("Report sent");
    refreshReports();
    if (user?.role === "admin") {
      refreshAdmin();
    }
  }

  async function resolveReport(reportId: string) {
    await jsonFetch<{ report: QuestionReport }>("/api/reports", {
      method: "PATCH",
      body: JSON.stringify({
        id: reportId,
        status: "resolved",
        resolution: "Reviewed"
      })
    });
    refreshReports();
    refreshAdmin();
  }

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setAuthError("");

    try {
      const data = await jsonFetch<{ user: TrainerUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: loginName,
          password: loginPassword
        })
      });

      setUser(data.user);
      await loadProgressFromServer();
      refreshLeaderboard();
      refreshReports();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setView("dashboard");
  }

  async function exportState() {
    const response = await fetch("/api/state/export");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "mcq-trainer-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importState(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as { progress?: StoredProgress } & StoredProgress;
    const importedProgress = parsed.progress || parsed;
    const data = await jsonFetch<{ progress: StoredProgress }>("/api/state/import", {
      method: "POST",
      body: JSON.stringify({ progress: importedProgress })
    });

    setProgress(normalizeProgress(data.progress));
    setNotice("Progress imported");
  }

  function jumpToQuestion(questionId: string) {
    setSessionIds([questionId]);
    setActiveIndex(0);
    setMode("study");
    setExamFinished(false);
    setView("trainer");
  }

  if (user && questionsError) {
    return (
      <main className="loading-screen">
        <div className="pulse-mark">
          <AlertTriangle size={28} aria-hidden="true" />
        </div>
        <p>{questionsError}</p>
        <button type="button" className="retry-button" onClick={loadQuestions}>
          Try again
        </button>
      </main>
    );
  }

  if (user && (!ready || !questionsReady)) {
    return (
      <main className="loading-screen">
        <div className="pulse-mark">
          <Gauge size={28} aria-hidden="true" />
        </div>
        <p>{ready ? "Loading question bank" : "Loading trainer"}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <StoaLanding
        questionMetrics={questionMetrics}
        loginName={loginName}
        loginPassword={loginPassword}
        authError={authError}
        devLogin={devLogin}
        onLoginNameChange={setLoginName}
        onLoginPasswordChange={setLoginPassword}
        onLogin={login}
      />
    );
  }

  return (
    <main className={`command-shell ${navOpen ? "nav-open" : ""}`}>
      <aside className="app-rail">
        <div className="rail-brand">
          <div className="brand-glyph">
            S
          </div>
          <div>
            <span>Private study hall</span>
            <strong>Stoa</strong>
          </div>
        </div>

        <nav className="rail-nav" aria-label="Main navigation">
          {navItems
            .filter((item) => !item.admin || user.role === "admin")
            .map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.view}
                  type="button"
                  className={view === item.view ? "active" : ""}
                  onClick={() => {
                    setView(item.view);
                    setNavOpen(false);
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        <div className="rail-user">
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
          <button type="button" aria-label="Log out" onClick={logout}>
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <section className="main-stage">
        <header className="stage-topbar">
          <button
            type="button"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setNavOpen((current) => !current)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div>
            <span className="eyebrow">{view}</span>
            <h1>{titleForView(view)}</h1>
          </div>
          <div className="status-cluster">
            <span className={online ? "status-pill online" : "status-pill offline"}>
              {online ? <Wifi size={15} /> : <WifiOff size={15} />}
              {online ? syncStatus : "offline"}
            </span>
            <span className="status-pill">
              <ArrowDownToLine size={15} />
              {offlineReady ? "cache ready" : "cache pending"}
            </span>
          </div>
        </header>

        {notice ? (
          <div className="toast" role="status">
            {notice}
            <button type="button" aria-label="Dismiss" onClick={() => setNotice("")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {view === "dashboard" ? renderDashboard() : null}
        {view === "subjects" ? renderSubjects() : null}
        {view === "trainer" ? renderTrainer() : null}
        {view === "sessions" ? renderSessions() : null}
        {view === "search" ? renderSearch() : null}
        {view === "mistakes" ? renderMistakes() : null}
        {view === "bookmarks" ? renderBookmarks() : null}
        {view === "admin" ? renderAdmin() : null}
      </section>
    </main>
  );

  function renderDashboard() {
    const weakSubjects = subjectsSummary
      .filter((subject) => subject.answered >= 5)
      .sort((left, right) => left.accuracy - right.accuracy)
      .slice(0, 5);
    const latestMistakeSession = sessionLogs.find(
      (session) => session.mistakeQuestionIds?.length
    );

    return (
      <div className="page-grid dashboard-grid">
        <section className="metric-band">
          <Metric label="Answered" value={`${formatNumber(stats.answered)}`} />
          <Metric label="Accuracy" value={formatPercent(stats.accuracy)} />
          <Metric label="Mistakes" value={`${formatNumber(stats.missed)}`} />
          <Metric label="Questions" value={formatNumber(questions.length)} />
        </section>

        <section className="builder-panel dashboard-focus">
          <div className="section-heading">
            <span className="eyebrow">Today</span>
            <h2>Choose one clean path.</h2>
          </div>
          <div className="quick-actions">
            <button type="button" className="primary-action" onClick={() => setView("trainer")}>
              <Play size={18} aria-hidden="true" />
              Build custom session
            </button>
            <button
              type="button"
              onClick={() =>
                latestMistakeSession
                  ? reviewSessionMistakes(latestMistakeSession)
                  : startSession("review", "wrong")
              }
            >
              <ListChecks size={18} aria-hidden="true" />
              Review latest mistakes
            </button>
          </div>
        </section>

        <section className="insight-panel">
          <div className="section-heading">
            <span className="eyebrow">Weak spots</span>
            <h2>Hit these first</h2>
          </div>
          <div className="compact-list">
            {weakSubjects.length ? (
              weakSubjects.map((subject) => (
                <button
                  key={subject.subject}
                  type="button"
                  onClick={() => {
                    setSelectedSubject(subject.subject);
                    setPool("wrong");
                    startSession("review", "wrong");
                  }}
                >
                  <span>{subject.subject}</span>
                  <strong>{subject.accuracy}%</strong>
                </button>
              ))
            ) : (
              <p className="empty-copy">Answer a few questions to build weak spots.</p>
            )}
          </div>
        </section>

        <section className="leaderboard-panel">
          <div className="section-heading">
            <span className="eyebrow">Group</span>
            <h2>Weekly leaderboard</h2>
          </div>
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div key={entry.userId} className="leaderboard-row">
                <span>{index + 1}</span>
                <strong>{entry.name}</strong>
                <em>{entry.weeklyAnswered} this week</em>
                <small>{entry.accuracy}%</small>
              </div>
            ))}
          </div>
        </section>

        <section className="history-panel">
          <div className="section-heading">
            <span className="eyebrow">Sessions</span>
            <h2>{sessionLogs.length} saved</h2>
          </div>
          <button type="button" className="primary-action" onClick={() => setView("sessions")}>
            <History size={18} aria-hidden="true" />
            Open history
          </button>
        </section>
      </div>
    );
  }

  function renderSubjects() {
    const subjectQuestions = semesterQuestions.filter(
      (question) => selectedSubject === "all" || question.subject === selectedSubject
    );
    const detailStats = progressStats(progress, subjectQuestions);
    const topicRows = sortUnique(subjectQuestions.map((question) => question.topic))
      .sort(compareTopicBySemester)
      .map((topicName) => {
        const topicQuestions = subjectQuestions.filter(
          (question) => question.topic === topicName
        );
        const topicProgress = progressStats(progress, topicQuestions);

        return {
          topicName,
          total: topicQuestions.length,
          ...topicProgress
        };
      });

    return (
      <div className="subjects-layout">
        <section className="subject-list">
          <div className="section-heading">
            <span className="eyebrow">Subject atlas</span>
            <h2>
              {subjects.length} {selectedSemester === "all" ? "subjects" : "subjects here"}
            </h2>
          </div>
          <div className="semester-strip" aria-label="Semester filter">
            <button
              type="button"
              className={selectedSemester === "all" ? "active" : ""}
              onClick={() => {
                setSelectedSemester("all");
                setSelectedTopic("all");
              }}
            >
              All
            </button>
            {semesters.map((semester) => (
              <button
                key={semester.key}
                type="button"
                className={selectedSemester === semester.key ? "active" : ""}
                onClick={() => {
                  setSelectedSemester(semester.key);
                  setSelectedTopic("all");
                }}
              >
                {semester.label}
              </button>
            ))}
          </div>
          <div className="subject-buttons">
            {subjectsSummary.map((subject) => (
              <button
                key={subject.subject}
                type="button"
                className={selectedSubject === subject.subject ? "active" : ""}
                onClick={() => {
                  setSelectedSubject(subject.subject);
                  setSelectedTopic("all");
                }}
              >
                <span>{subject.subject}</span>
                <strong>{subject.completion}%</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="subject-detail">
          <div className="detail-header">
            <div>
              <span className="eyebrow">{selectedSemesterLabel}</span>
              <h2>{selectedSubject}</h2>
            </div>
            <div className="detail-actions">
              <button
                type="button"
                onClick={() => {
                  setPool("all");
                  startSession("study", "all");
                }}
              >
                <Play size={17} aria-hidden="true" />
                Study
              </button>
              <button
                type="button"
                onClick={() => {
                  setPool("wrong");
                  startSession("review", "wrong");
                }}
              >
                <ListChecks size={17} aria-hidden="true" />
                Review
              </button>
            </div>
          </div>

          <section className="metric-band compact">
            <Metric
              label="Done"
              value={`${detailStats.answered}/${subjectQuestions.length}`}
            />
            <Metric
              label="Accuracy"
              value={formatPercent(detailStats.accuracy)}
            />
            <Metric label="Missed" value={`${detailStats.missed}`} />
          </section>

          <div className="topic-table">
            {topicRows.map((topic) => (
              <button
                key={topic.topicName}
                type="button"
                onClick={() => {
                  setSelectedTopic(topic.topicName);
                  setView("trainer");
                }}
              >
                <span>{topic.topicName}</span>
                <strong>
                  {topic.answered}/{topic.total}
                </strong>
                <em>{topic.accuracy}%</em>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderTrainer() {
    return (
      <div className="trainer-layout">
        <section className="trainer-controls">
          <div className="section-heading">
            <span className="eyebrow">Controls</span>
            <h2>Build session</h2>
          </div>
          {renderSessionBuilder()}
          <div className="folder-switcher">
            <label>
              <span>Bookmark folder</span>
              <select
                value={progress.activeFolderId || activeFolder?.id}
                onChange={(event) =>
                  patchProgress((current) => ({
                    ...current,
                    activeFolderId: event.target.value
                  }))
                }
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="question-workbench">
          <div className="workbench-top">
            <div>
              <span className="eyebrow">
                {mode} · {sessionQuestions.length} questions
              </span>
              <h2>
                {activeQuestion ? `${activeIndex + 1}. ${activeQuestion.topic}` : "No question"}
              </h2>
            </div>
            <div className="nav-controls">
              <button
                type="button"
                aria-label="Previous question"
                disabled={activeIndex === 0}
                onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <span>
                {sessionQuestions.length ? activeIndex + 1 : 0}/{sessionQuestions.length}
              </span>
              <button
                type="button"
                aria-label="Next question"
                disabled={activeIndex >= sessionQuestions.length - 1}
                onClick={() =>
                  setActiveIndex((current) =>
                    Math.min(sessionQuestions.length - 1, current + 1)
                  )
                }
              >
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </div>
          </div>

          {activeQuestion ? renderQuestion(activeQuestion) : renderEmptyQuestion()}
        </section>

        <aside className="queue-panel">
          <div className="queue-header">
            <span>Queue</span>
            {mode === "exam" && !examFinished ? (
              <button type="button" onClick={finishExam}>
                <Timer size={16} aria-hidden="true" />
                Finish
              </button>
            ) : null}
          </div>
          <div className="queue-list">
            {sessionQuestions.slice(0, 120).map((question, index) => {
              const answer =
                mode === "exam" && !examFinished
                  ? examAnswers[question.id]
                  : progress.answers[question.id];
              const missed =
                mode === "exam" && !examFinished
                  ? false
                  : progress.answers[question.id] &&
                    !progress.answers[question.id].correct;

              return (
                <button
                  key={question.id}
                  type="button"
                  className={[
                    index === activeIndex ? "active" : "",
                    answer ? "answered" : "",
                    missed ? "missed" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveIndex(index)}
                >
                  <span>{index + 1}</span>
                  <strong>{question.topic}</strong>
                </button>
              );
            })}
            {sessionQuestions.length > 120 ? (
              <p className="queue-more">{sessionQuestions.length - 120} more in session</p>
            ) : null}
          </div>
        </aside>
      </div>
    );
  }

  function renderQuestion(question: Question) {
    const storedAnswer = progress.answers[question.id];
    const currentSelected =
      mode === "exam" && !examFinished ? examAnswers[question.id] : storedAnswer?.selected;
    const revealed = mode !== "exam" || examFinished;
    const image = proxiedImage(question.imageUrl);
    const isBookmarked = bookmarkedIds.has(question.id);

    return (
      <article className="question-card">
        <div className="question-meta">
          <div>
            <span>{question.subject}</span>
            <strong>{question.topic}</strong>
          </div>
          <div className="question-tools">
            <button type="button" onClick={() => toggleBookmark(question.id)}>
              {isBookmarked ? (
                <BookmarkCheck size={18} aria-hidden="true" />
              ) : (
                <Bookmark size={18} aria-hidden="true" />
              )}
              {isBookmarked ? "Saved" : "Save"}
            </button>
            <button type="button" onClick={() => submitReport(question.id)}>
              <FileWarning size={18} aria-hidden="true" />
              Report
            </button>
          </div>
        </div>

        <div className="question-stem">
          <p>{question.stem}</p>
          {image ? <img src={image} alt="" loading="lazy" /> : null}
        </div>

        <div className="answer-grid">
          {question.choices.map((choice) => {
            const selected = currentSelected === choice.id;
            const correct = question.answer === choice.id;
            const className = [
              "answer-option",
              selected ? "selected" : "",
              revealed && correct ? "correct" : "",
              revealed && selected && !correct ? "incorrect" : ""
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={choice.id}
                type="button"
                className={className}
                onClick={() => answerQuestion(question, choice.id)}
              >
                <span>{choice.id}</span>
                <strong>{choice.text}</strong>
                {revealed && correct ? <Check size={18} aria-hidden="true" /> : null}
                {revealed && selected && !correct ? (
                  <X size={18} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>

        {currentSelected && revealed ? (
          <section
            className={
              currentSelected === question.answer
                ? "answer-feedback correct"
                : "answer-feedback missed"
            }
          >
            <div className="feedback-title">
              {currentSelected === question.answer ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <AlertTriangle size={18} aria-hidden="true" />
              )}
              <strong>
                {currentSelected === question.answer ? "Correct" : "Marked for review"}
              </strong>
            </div>

            {question.explanation ? <p>{question.explanation}</p> : null}

            {question.notes?.length ? (
              <div className="question-notes">
                <strong>Comments and corrections</strong>
                {question.notes.map((note, index) => (
                  <p key={`${question.id}-note-${index}`}>{note}</p>
                ))}
              </div>
            ) : null}

            {storedAnswer ? (
              <div className="confidence-row" aria-label="Confidence">
                {[
                  ["low", "Guessed"],
                  ["medium", "Unsure"],
                  ["high", "Knew it"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={storedAnswer.confidence === value ? "active" : ""}
                    onClick={() =>
                      setConfidence(question.id, value as StoredAnswer["confidence"])
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {mode === "exam" && !examFinished && currentSelected ? (
          <section className="answer-feedback sealed">
            <div className="feedback-title">
              <Timer size={18} aria-hidden="true" />
              <strong>Answer saved</strong>
            </div>
            <p>Exam mode keeps feedback hidden until you finish the session.</p>
          </section>
        ) : null}

        <section className="report-box">
          <div className="report-controls">
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              <option value="wrong-answer">Wrong answer</option>
              <option value="typo">Typo</option>
              <option value="unclear">Unclear</option>
              <option value="other">Other</option>
            </select>
            <input
              value={reportText}
              placeholder="Correction, typo, or note for admins"
              onChange={(event) => setReportText(event.target.value)}
            />
            <button type="button" onClick={() => submitReport(question.id)}>
              <Upload size={17} aria-hidden="true" />
              Send
            </button>
          </div>
        </section>

        <footer className="question-footer">
          <div className="tag-row">
            <span>{question.source || question.subject}</span>
            {(question.tags || []).slice(0, 4).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <button type="button" onClick={clearCurrentAnswer} disabled={!storedAnswer}>
            <RotateCcw size={17} aria-hidden="true" />
            Clear answer
          </button>
        </footer>
      </article>
    );
  }

  function reviewSessionMistakes(session: StudySessionLog, ids = session.mistakeQuestionIds || []) {
    const uniqueIds = Array.from(new Set(ids)).filter((questionId) =>
      questionById.has(questionId)
    );

    if (!uniqueIds.length) {
      setNotice("No mistakes saved for that session");
      return;
    }

    startSessionFromIds(uniqueIds, "review", `Mistakes · ${session.label}`, {
      ...session.source,
      pool: "session mistakes"
    });
  }

  function replaySession(session: StudySessionLog) {
    const ids = session.questionIds.filter((questionId) => questionById.has(questionId));

    if (!ids.length) {
      setNotice("That session has no available questions");
      return;
    }

    startSessionFromIds(ids, session.mode, `Replay · ${session.label}`, session.source);
  }

  function renderSessions() {
    const activeSession = selectedSession;
    const mistakeIds = activeSession?.mistakeQuestionIds || [];
    const selectedIds = selectedMistakeIds.length ? selectedMistakeIds : mistakeIds;

    return (
      <div className="sessions-layout">
        <section className="session-history-panel">
          <div className="section-heading">
            <span className="eyebrow">Past sessions</span>
            <h2>{sessionLogs.length} saved sessions</h2>
          </div>
          <div className="session-log-list">
            {sessionLogs.length ? (
              sessionLogs.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={activeSession?.id === session.id ? "active" : ""}
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setSelectedMistakeIds(session.mistakeQuestionIds || []);
                  }}
                >
                  <span>{new Date(session.finishedAt).toLocaleDateString()}</span>
                  <strong>{session.label}</strong>
                  <em>
                    {session.correct}/{session.answered} correct ·{" "}
                    {session.mistakeQuestionIds?.length || 0} mistakes
                  </em>
                </button>
              ))
            ) : (
              <p className="empty-copy">Start a session and it will appear here.</p>
            )}
          </div>
        </section>

        <section className="session-detail-panel">
          {activeSession ? (
            <>
              <div className="detail-header">
                <div>
                  <span className="eyebrow">{activeSession.mode}</span>
                  <h2>{activeSession.label}</h2>
                </div>
                <div className="detail-actions">
                  <button type="button" onClick={() => replaySession(activeSession)}>
                    <Play size={17} aria-hidden="true" />
                    Replay all
                  </button>
                  <button
                    type="button"
                    disabled={!mistakeIds.length}
                    onClick={() => reviewSessionMistakes(activeSession, selectedIds)}
                  >
                    <ListChecks size={17} aria-hidden="true" />
                    Solve selected mistakes
                  </button>
                </div>
              </div>

              <section className="metric-band compact">
                <Metric label="Questions" value={`${activeSession.questionIds.length}`} />
                <Metric label="Answered" value={`${activeSession.answered}`} />
                <Metric
                  label="Mistakes"
                  value={`${activeSession.mistakeQuestionIds?.length || 0}`}
                />
              </section>

              <div className="session-mistake-list">
                {mistakeIds.length ? (
                  mistakeIds.map((questionId) => {
                    const question = questionById.get(questionId);

                    if (!question) {
                      return null;
                    }

                    const checked = selectedIds.includes(questionId);

                    return (
                      <label key={questionId}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedMistakeIds((current) => {
                              const base = current.length ? current : mistakeIds;

                              return event.target.checked
                                ? Array.from(new Set([...base, questionId]))
                                : base.filter((id) => id !== questionId);
                            });
                          }}
                        />
                        <span>{question.subject} · {question.topic}</span>
                        <strong>{question.stem}</strong>
                      </label>
                    );
                  })
                ) : (
                  <div className="empty-state compact">
                    <Check size={28} aria-hidden="true" />
                    <h2>No mistakes in this session</h2>
                    <p>Replay the session or pick another one.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <History size={30} aria-hidden="true" />
              <h2>No sessions yet</h2>
              <p>Build a custom session and answer a few questions.</p>
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderSearch() {
    return (
      <div className="search-layout">
        <section className="search-panel">
          <div className="section-heading">
            <span className="eyebrow">Global search</span>
            <h2>Questions, answers, comments</h2>
          </div>
          <label className="search-input">
            <Search size={18} aria-hidden="true" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Type at least 2 letters"
            />
          </label>
        </section>
        <section className="result-list">
          {searchResults.map((question) => (
            <button
              key={question.id}
              type="button"
              onClick={() => jumpToQuestion(question.id)}
            >
              <span>{question.subject}</span>
              <strong>{question.topic}</strong>
              <p>{question.stem}</p>
            </button>
          ))}
        </section>
      </div>
    );
  }

  function renderMistakes() {
    return (
      <div className="notebook-layout">
        <section className="section-heading">
          <span className="eyebrow">Mistake notebook</span>
          <h2>{missedQuestions.length} questions to fix</h2>
        </section>
        <div className="mistake-list">
          {missedQuestions.slice(0, 200).map(({ question, answer }) => (
            <button
              key={question.id}
              type="button"
              onClick={() => jumpToQuestion(question.id)}
            >
              <span>{question.subject} · {question.topic}</span>
              <strong>{question.stem}</strong>
              <em>
                Picked {answer.selected}, correct {question.answer}
              </em>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderBookmarks() {
    const folderQuestions = (activeFolder?.questionIds || [])
      .map((questionId) => questionById.get(questionId))
      .filter((question): question is Question => Boolean(question));

    return (
      <div className="bookmarks-layout">
        <section className="folder-panel">
          <div className="section-heading">
            <span className="eyebrow">Bookmark folders</span>
            <h2>{folders.length} folders</h2>
          </div>
          <div className="folder-list">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={folder.id === activeFolder?.id ? "active" : ""}
                onClick={() =>
                  patchProgress((current) => ({
                    ...current,
                    activeFolderId: folder.id
                  }))
                }
              >
                <span style={{ background: folder.color }} />
                <strong>{folder.name}</strong>
                <em>{folder.questionIds.length}</em>
              </button>
            ))}
          </div>
          <div className="new-folder">
            <input
              value={newFolderName}
              placeholder="New folder"
              onChange={(event) => setNewFolderName(event.target.value)}
            />
            <button type="button" onClick={createFolder}>
              Add
            </button>
          </div>
        </section>
        <section className="result-list">
          {folderQuestions.map((question) => (
            <button
              key={question.id}
              type="button"
              onClick={() => jumpToQuestion(question.id)}
            >
              <span>{question.subject}</span>
              <strong>{question.topic}</strong>
              <p>{question.stem}</p>
            </button>
          ))}
        </section>
      </div>
    );
  }

  function renderAdmin() {
    if (!user || user.role !== "admin") {
      return null;
    }

    return (
      <div className="admin-layout">
        <section className="metric-band compact">
          <Metric label="Users" value={`${users.length}`} />
          <Metric label="Synced users" value={`${adminState?.progressUsers || 0}`} />
          <Metric label="Open reports" value={`${adminState?.openReports || 0}`} />
          <Metric label="Storage" value={adminState?.storage || "loading"} />
        </section>

        <section className="admin-tools">
          <button type="button" onClick={exportState}>
            <Download size={18} aria-hidden="true" />
            Export state
          </button>
          <label className="file-button">
            <Import size={18} aria-hidden="true" />
            Import my progress
            <input
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  importState(file).catch((error) =>
                    setNotice(error instanceof Error ? error.message : "Import failed")
                  );
                }
              }}
            />
          </label>
        </section>

        <section className="reports-table">
          <div className="section-heading">
            <span className="eyebrow">Reports</span>
            <h2>{reports.filter((report) => report.status === "open").length} open</h2>
          </div>
          {reports.map((report) => {
            const question = questionById.get(report.questionId);

            return (
              <div key={report.id} className="report-row">
                <div>
                  <span>
                    {report.type} · {report.status} · {report.userId}
                  </span>
                  <strong>{question?.topic || report.questionId}</strong>
                  <p>{report.text}</p>
                </div>
                <button
                  type="button"
                  disabled={report.status === "resolved"}
                  onClick={() => resolveReport(report.id)}
                >
                  Resolve
                </button>
              </div>
            );
          })}
        </section>
      </div>
    );
  }

  function renderSessionBuilder() {
    return (
      <div className="session-builder">
        <label>
          <span>Semester</span>
          <select
            value={selectedSemester}
            onChange={(event) => {
              setSelectedSemester(event.target.value);
              setSelectedTopic("all");
            }}
          >
            <option value="all">All semesters</option>
            {semesters.map((semester) => (
              <option key={semester.key} value={semester.key}>
                {semester.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Subject</span>
          <select
            value={selectedSubject}
            onChange={(event) => {
              setSelectedSubject(event.target.value);
              setSelectedTopic("all");
            }}
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Topic / exam</span>
          <select
            value={selectedTopic}
            onChange={(event) => setSelectedTopic(event.target.value)}
          >
            <option value="all">All topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Search inside session</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Optional filter"
          />
        </label>
        <div className="segmented">
          {[
            ["study", "Study"],
            ["exam", "Exam"],
            ["review", "Review"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={mode === value ? "active" : ""}
              onClick={() => setMode(value as SessionMode)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="segmented">
          {[
            ["all", "All"],
            ["unanswered", "New"],
            ["wrong", "Wrong"],
            ["bookmarked", "Saved"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={pool === value ? "active" : ""}
              onClick={() => setPool(value as Pool)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="builder-row">
          <label>
            <span>Count</span>
            <input
              type="number"
              min={1}
              max={500}
              value={sessionCount}
              onChange={(event) => setSessionCount(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Order</span>
            <select
              value={sessionOrder}
              onChange={(event) => setSessionOrder(event.target.value as SessionOrder)}
            >
              <option value="latest">Newest semester</option>
              <option value="oldest">Oldest semester</option>
              <option value="subject">By subject</option>
              <option value="random">Shuffle</option>
            </select>
          </label>
        </div>
        <button type="button" className="primary-action" onClick={() => startSession()}>
          <Play size={18} aria-hidden="true" />
          Start {filteredPool.length ? Math.min(sessionCount, filteredPool.length) : 0}
        </button>
      </div>
    );
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function titleForView(view: View) {
  const titles: Record<View, string> = {
    dashboard: "Command Center",
    subjects: "Subject Atlas",
    trainer: "Study Room",
    search: "Search Bank",
    sessions: "Session History",
    mistakes: "Mistake Notebook",
    bookmarks: "Bookmark Folders",
    admin: "Admin Console"
  };

  return titles[view];
}

function renderEmptyQuestion() {
  return (
    <div className="empty-state">
      <ClipboardList size={30} aria-hidden="true" />
      <h2>No matching questions</h2>
      <p>Adjust filters or start a broader session.</p>
    </div>
  );
}
