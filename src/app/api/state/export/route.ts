import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicUsers, readSession } from "@/lib/server/auth";
import { readState } from "@/lib/server/store";

export async function GET() {
  const user = await readSession(await cookies());

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await readState();
  const payload =
    user.role === "admin"
      ? { exportedAt: new Date().toISOString(), ...state, users: await publicUsers() }
      : {
          exportedAt: new Date().toISOString(),
          progress: state.progress[user.id] || null,
          reports: state.reports.filter((report) => report.userId === user.id)
        };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": 'attachment; filename="mcq-trainer-export.json"'
    }
  });
}
