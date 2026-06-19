import { NextResponse } from "next/server";
import { authCookie, createSession, verifyUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };
  const user = await verifyUser(body.username || "", body.password || "");

  if (!user) {
    return NextResponse.json({ error: "Invalid login" }, { status: 401 });
  }

  const response = NextResponse.json({ user });

  response.cookies.set(authCookie.name, createSession(user.id), authCookie.options);

  return response;
}
