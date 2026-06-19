import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ManagedTrainerUser, QuestionReport, StoredProgress } from "@/lib/types";

type TrainerState = {
  progress: Record<string, StoredProgress>;
  reports: QuestionReport[];
  users: ManagedTrainerUser[];
};

const STATE_KEY = "private-mcq-trainer-state-v1";
const LOCAL_STATE_PATH = path.join(process.cwd(), ".local-data", "trainer-state.json");

const emptyState: TrainerState = {
  progress: {},
  reports: [],
  users: []
};

function cloneState(state: TrainerState): TrainerState {
  return {
    progress: state.progress || {},
    reports: Array.isArray(state.reports) ? state.reports : [],
    users: Array.isArray(state.users) ? state.users : []
  };
}

async function kvRequest(pathname: string, init?: RequestInit) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  const response = await fetch(`${url.replace(/\/$/, "")}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  return response.json() as Promise<{ result: unknown }>;
}

async function readFromKv() {
  const response = await kvRequest(`/get/${STATE_KEY}`);

  if (!response?.result) {
    return null;
  }

  return typeof response.result === "string"
    ? (JSON.parse(response.result) as TrainerState)
    : (response.result as TrainerState);
}

async function writeToKv(state: TrainerState) {
  const response = await kvRequest(`/set/${STATE_KEY}`, {
    method: "POST",
    body: JSON.stringify(state)
  });

  return Boolean(response);
}

async function readFromFile() {
  try {
    const raw = await readFile(LOCAL_STATE_PATH, "utf8");

    return JSON.parse(raw) as TrainerState;
  } catch {
    return null;
  }
}

async function writeToFile(state: TrainerState) {
  await mkdir(path.dirname(LOCAL_STATE_PATH), { recursive: true });
  await writeFile(LOCAL_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readState() {
  return cloneState((await readFromKv()) || (await readFromFile()) || emptyState);
}

export async function writeState(state: TrainerState) {
  const cleanState = cloneState(state);

  if (!(await writeToKv(cleanState))) {
    await writeToFile(cleanState);
  }
}

export async function updateState<T>(mutator: (state: TrainerState) => T | Promise<T>) {
  const state = await readState();
  const result = await mutator(state);

  await writeState(state);

  return result;
}

export function emptyProgress(): StoredProgress {
  return {
    answers: {},
    bookmarks: [],
    bookmarkFolders: [
      {
        id: "default",
        name: "Saved",
        color: "#1f7a5f",
        questionIds: [],
        createdAt: new Date().toISOString()
      }
    ],
    activeFolderId: "default",
    sessionLog: []
  };
}
