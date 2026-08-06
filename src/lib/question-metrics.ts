import rawQuestions from "../../data/questions.json";
import vorklinikQuestions from "../../data/vorklinik.json";
import type { Question, QuestionMetrics } from "./types";

// Both banks, same as src/lib/questions.ts — kept separate from that module so
// the landing page doesn't pull in the explanation files just to count.
const raw = [...(rawQuestions as Question[]), ...(vorklinikQuestions as Question[])];

export const questionMetrics: QuestionMetrics = {
  questions: raw.length,
  subjects: new Set(raw.map((question) => question.subject)).size,
  notes: raw.reduce((sum, question) => sum + (question.notes?.length || 0), 0),
  images: raw.filter((question) => question.imageUrl).length
};
