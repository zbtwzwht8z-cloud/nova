export type Choice = {
  id: string;
  text: string;
};

export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  subject: string;
  topic: string;
  source?: string;
  stem: string;
  imageUrl?: string;
  choices: Choice[];
  answer: string;
  explanation?: string;
  notes?: string[];
  tags?: string[];
  difficulty?: Difficulty;
};

export type QuestionMetrics = {
  questions: number;
  subjects: number;
  notes: number;
  images: number;
};

export type StoredAnswer = {
  selected: string;
  correct: boolean;
  attempts: number;
  answeredAt: string;
  mode?: "study" | "exam";
  confidence?: "low" | "medium" | "high";
};

export type BookmarkFolder = {
  id: string;
  name: string;
  color: string;
  questionIds: string[];
  createdAt: string;
};

export type StoredProgress = {
  answers: Record<string, StoredAnswer>;
  bookmarks: string[];
  bookmarkFolders?: BookmarkFolder[];
  activeFolderId?: string;
  sessionLog?: StudySessionLog[];
  updatedAt?: string;
};

export type SessionSource = {
  semester?: string;
  subject?: string;
  topic?: string;
  pool?: string;
  order?: string;
};

export type StudySessionLog = {
  id: string;
  mode: "study" | "exam" | "review";
  label: string;
  questionIds: string[];
  answered: number;
  correct: number;
  mistakeQuestionIds?: string[];
  startedAt: string;
  finishedAt: string;
  source?: SessionSource;
};

export type TrainerUser = {
  id: string;
  name: string;
  role: "admin" | "member";
  disabled?: boolean;
  managed?: boolean;
};

export type ManagedTrainerUser = TrainerUser & {
  password: string;
  createdAt?: string;
};

export type QuestionReport = {
  id: string;
  questionId: string;
  userId: string;
  type: "wrong-answer" | "typo" | "unclear" | "other";
  text: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  answered: number;
  correct: number;
  accuracy: number;
  weeklyAnswered: number;
};
