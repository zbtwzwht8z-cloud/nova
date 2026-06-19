import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicUsers, readSession } from "@/lib/server/auth";
import { readState } from "@/lib/server/store";

export async function GET() {
  const user = await readSession(await cookies());

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await readState();

  return NextResponse.json({
    users: await publicUsers(),
    reports: state.reports,
    progressUsers: Object.keys(state.progress).length,
    openReports: state.reports.filter((report) => report.status === "open").length,
    storage: process.env.KV_REST_API_URL ? "Vercel KV / Upstash REST" : "Local file"
  });
}
