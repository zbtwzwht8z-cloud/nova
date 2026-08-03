import rawQuestions from "../../data/questions.json";
import humangenetik from "../../data/explanations/humangenetik.json";
import schmerzmedizin from "../../data/explanations/schmerzmedizin.json";
import type { Question, QuestionIndex } from "./types";

type ExplanationFile = {
  _model?: string;
  questions: Record<string, NonNullable<Question["distractors"]>>;
};

// Merged in at load rather than stored on the question, since questions.json is
// rewritten wholesale by the export script and would drop anything added here.
// Each file names the model that wrote its texts; per-entry overrides win.
function collect(...files: ExplanationFile[]) {
  const merged: Record<string, NonNullable<Question["distractors"]>> = {};

  for (const file of files) {
    for (const [id, entry] of Object.entries(file.questions || {})) {
      merged[id] = { ...entry, model: entry.model || file._model };
    }
  }

  return merged;
}

const EXPLANATIONS = collect(
  schmerzmedizin as ExplanationFile,
  humangenetik as ExplanationFile
);

function assertQuestion(question: Question, index: number) {
  const prefix = `Question ${index + 1}`;

  if (!question.id) {
    throw new Error(`${prefix} is missing id`);
  }

  if (!question.stem) {
    throw new Error(`${prefix} is missing stem`);
  }

  if (question.kind === "freeText") {
    if (!question.modelAnswer) {
      throw new Error(`${prefix} is missing modelAnswer`);
    }

    return;
  }

  if (!Array.isArray(question.choices) || question.choices.length < 2) {
    throw new Error(`${prefix} must have at least two choices`);
  }

  if (!question.choices.some((choice) => choice.id === question.answer)) {
    throw new Error(`${prefix} answer must match a choice id`);
  }
}

export const questions = (rawQuestions as Question[]).map((question, index) => {
  assertQuestion(question, index);

  return {
    ...question,
    subject: question.subject || "General",
    topic: question.topic || "Unsorted",
    tags: question.tags || [],
    distractors: EXPLANATIONS[question.id]
  };
});

// Lightweight index: enough for Papers/Dashboard (semester grouping, paper keys,
// question counts) without the 18 MB of stems/choices/explanations/notes.
export const questionIndex: QuestionIndex[] = questions.map((question) => ({
  id: question.id,
  subject: question.subject,
  topic: question.topic,
  source: question.source,
  kind: question.kind
}));
