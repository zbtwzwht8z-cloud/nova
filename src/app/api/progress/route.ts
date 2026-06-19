import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { StoredProgress } from "@/lib/types";
import { readSession } from "@/lib/server/auth";
import { emptyProgress, readState, updateState } from "@/lib/server/store";

export async function GET() {
  const user = await readSession(await cookies());

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await readState();

  return NextResponse.json({
    progress: state.progress[user.id] || emptyProgress()
  });
}

export async function POST(request: Request) {
  const user = await readSession(await cookies());

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { progress?: StoredProgress };
  const progress = body.progress || emptyProgress();

  progress.updatedAt = new Date().toISOString();

  await updateState((state) => {
    state.progress[user.id] = progress;
  });

  return NextResponse.json({ progress });
}
