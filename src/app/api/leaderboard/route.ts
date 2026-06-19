import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicUsers, readSession } from "@/lib/server/auth";
import { readState } from "@/lib/server/store";
import { leaderboardFromProgress } from "@/lib/stats";

export async function GET() {
  const user = await readSession(await cookies());

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await readState();

  return NextResponse.json({
    leaderboard: leaderboardFromProgress(await publicUsers(), state.progress)
  });
}
