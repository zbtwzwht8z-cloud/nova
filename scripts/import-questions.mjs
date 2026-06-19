#!/usr/bin/env node

import { parse } from "csv-parse/sync";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [, , inputPath, outputPath = "data/questions.json"] = process.argv;

if (!inputPath) {
  console.error("Usage: npm run import:questions -- input.csv [data/questions.json]");
  process.exit(1);
}

const absoluteInput = path.resolve(inputPath);
const absoluteOutput = path.resolve(outputPath);
const input = await readFile(absoluteInput, "utf8");
const extension = path.extname(absoluteInput).toLowerCase();

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return String(value)
    .split(/[;,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeChoices(row) {
  if (Array.isArray(row.choices)) {
    return row.choices.map((choice, index) => {
      if (typeof choice === "string") {
        return { id: String.fromCharCode(65 + index), text: choice };
      }

      return {
        id: String(choice.id || String.fromCharCode(65 + index)).trim(),
        text: String(choice.text || choice.label || "").trim()
      };
    });
  }

  if (Array.isArray(row.options)) {
    return row.options.map((choice, index) => ({
      id: String(choice.id || String.fromCharCode(65 + index)).trim(),
      text: String(choice.text || choice.label || choice).trim()
    }));
  }

  return ["a", "b", "c", "d", "e", "f"]
    .map((letter) => {
      const value =
        row[`choice_${letter}`] ||
        row[`option_${letter}`] ||
        row[`choice${letter.toUpperCase()}`] ||
        row[`option${letter.toUpperCase()}`];

      return value
        ? { id: letter.toUpperCase(), text: String(value).trim() }
        : null;
    })
    .filter(Boolean);
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeQuestion(row, index) {
  const choices = normalizeChoices(row).filter((choice) => choice.text);
  const answer = normalizeAnswer(row.answer || row.correct || row.correct_answer);
  const id = String(row.id || row.slug || `q-${String(index + 1).padStart(5, "0")}`);

  return {
    id,
    subject: String(row.subject || row.system || "General").trim(),
    topic: String(row.topic || row.category || "Unsorted").trim(),
    source: row.source ? String(row.source).trim() : undefined,
    stem: String(row.stem || row.question || row.prompt || "").trim(),
    choices,
    answer,
    explanation: row.explanation
      ? String(row.explanation).trim()
      : row.rationale
        ? String(row.rationale).trim()
        : undefined,
    tags: normalizeTags(row.tags),
    difficulty: row.difficulty ? String(row.difficulty).toLowerCase().trim() : undefined
  };
}

function validate(question, index) {
  const label = question.id || `row ${index + 1}`;

  if (!question.stem) {
    throw new Error(`${label}: missing stem/question`);
  }

  if (question.choices.length < 2) {
    throw new Error(`${label}: expected at least two choices`);
  }

  if (!question.answer) {
    throw new Error(`${label}: missing answer`);
  }

  if (!question.choices.some((choice) => choice.id === question.answer)) {
    throw new Error(`${label}: answer "${question.answer}" does not match a choice id`);
  }
}

let rows;

if (extension === ".json") {
  const parsed = JSON.parse(input);
  rows = Array.isArray(parsed) ? parsed : parsed.questions;
} else if (extension === ".csv") {
  rows = parse(input, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
} else {
  throw new Error("Supported input formats: .csv, .json");
}

if (!Array.isArray(rows)) {
  throw new Error("Input must be an array or an object with a questions array");
}

const normalized = rows.map(normalizeQuestion);
normalized.forEach(validate);

await writeFile(absoluteOutput, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
console.log(`Imported ${normalized.length} questions into ${outputPath}`);
