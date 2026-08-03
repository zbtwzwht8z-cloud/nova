// Marks questions that have appeared in more than one exam as Altfragen.
//
// Repeats are reworded between terms, so exact matching misses most of them —
// this compares stems *and* answer sets. Both matter: long case vignettes carry
// several different questions under one identical setup, and stem-only matching
// merges those into a single "repeat" that never happened.
//
//   node scripts/annotate-repeats.mjs "Schmerzmedizin"
//   node scripts/annotate-repeats.mjs            # every subject
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_PATH = path.join(process.cwd(), "data", "questions.json");
const STEM_THRESHOLD = 0.6;
const CHOICE_THRESHOLD = 0.45;

const STOP = new Set(
  ("welche aussage ist sind der die das ein eine einer den dem des und oder " +
    "nicht bei zu zum zur von mit für am im in an auf als es sich trifft " +
    "treffen zutreffend richtig falsch folgenden aussagen was wer wie eines " +
    "einem dass werden wird kann können sowie durch über unter nach vor")
    .split(" ")
);

function tokens(text, minLength = 4) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-zäöüß0-9 ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= minLength && !STOP.has(word))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) {
    return 0;
  }

  let shared = 0;

  for (const value of a) {
    if (b.has(value)) {
      shared += 1;
    }
  }

  return shared / (a.size + b.size - shared);
}

function choiceTokens(question) {
  return tokens((question.choices || []).map((choice) => choice.text).join(" "), 5);
}

function cluster(questions) {
  const prepared = questions.map((question) => ({
    question,
    stem: tokens(question.stem),
    choices: choiceTokens(question)
  }));
  const parent = prepared.map((_, index) => index);

  function find(index) {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }

    return index;
  }

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      if (prepared[i].stem.size < 3 || prepared[j].stem.size < 3) {
        continue;
      }

      if (jaccard(prepared[i].stem, prepared[j].stem) < STEM_THRESHOLD) {
        continue;
      }

      // Same vignette, different question — keep them apart.
      if (jaccard(prepared[i].choices, prepared[j].choices) < CHOICE_THRESHOLD) {
        continue;
      }

      const a = find(i);
      const b = find(j);

      if (a !== b) {
        parent[b] = a;
      }
    }
  }

  const groups = new Map();

  prepared.forEach((entry, index) => {
    const root = find(index);
    const group = groups.get(root) || [];
    group.push(entry.question);
    groups.set(root, group);
  });

  return [...groups.values()];
}

const subjectFilter = process.argv[2];
const questions = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
const subjects = [
  ...new Set(
    questions
      .map((question) => question.subject)
      .filter((subject) => !subjectFilter || subject === subjectFilter)
  )
];

if (!subjects.length) {
  console.error(`No subject matched "${subjectFilter}"`);
  process.exit(1);
}

let annotated = 0;
let repeated = 0;

for (const subject of subjects) {
  const subset = questions.filter((question) => question.subject === subject);
  const groups = cluster(subset);

  for (const group of groups) {
    // Distinct exam terms, not occurrences: the same paper listing a question
    // twice isn't it "coming up again".
    const terms = [...new Set(group.map((question) => question.topic).filter(Boolean))].sort();

    for (const question of group) {
      question.repeats = { count: terms.length, terms };
      annotated += 1;

      if (terms.length > 1) {
        repeated += 1;
      }
    }
  }

  const multi = groups.filter(
    (group) => new Set(group.map((question) => question.topic)).size > 1
  );

  console.log(
    `${subject}: ${subset.length} questions, ${multi.length} repeated across terms`
  );
}

await writeFile(OUTPUT_PATH, `${JSON.stringify(questions, null, 2)}\n`, "utf8");
console.log(`\nAnnotated ${annotated} questions (${repeated} are repeats).`);
