import rawQuestions from "../../data/questions.json";
import type { Question, QuestionMetrics } from "./types";

const raw = rawQuestions as Question[];

export const questionMetrics: QuestionMetrics = {
  questions: raw.length,
  subjects: new Set(raw.map((question) => question.subject)).size,
  notes: raw.reduce((sum, question) => sum + (question.notes?.length || 0), 0),
  images: raw.filter((question) => question.imageUrl).length
};
