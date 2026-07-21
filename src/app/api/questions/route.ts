import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { questionIndex, questions } from "@/lib/questions";
import { readSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// Tie the cache to the deployment. The browser revalidates on every load
// (no-cache), but an unchanged deploy answers 304 (tiny) so the ~45MB bank
// isn't re-downloaded — while a new deploy busts it immediately, so fixes to
// question text/images/stats show up right away instead of being served stale.
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

function conditional(request: Request, etag: string, body: unknown) {
  const headers = {
    ETag: etag,
    "Cache-Control": "private, no-cache"
  };

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  return NextResponse.json(body, { headers });
}

export async function GET(request: Request) {
  const user = await readSession(await cookies());

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wantsIndex = new URL(request.url).searchParams.get("index") === "true";

  if (wantsIndex) {
    return conditional(request, `"idx-${VERSION}"`, { index: questionIndex });
  }

  return conditional(request, `"full-${VERSION}"`, { questions });
}
