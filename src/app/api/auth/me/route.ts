import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicUsers, readSession } from "@/lib/server/auth";

export async function GET() {
  const cookieStore = await cookies();
  const user = await readSession(cookieStore);

  return NextResponse.json({
    user,
    users: await publicUsers(),
    devLogin:
      !process.env.TRAINER_USERS &&
      !process.env.TRAINER_USER &&
      !process.env.TRAINER_PASSWORD
        ? { username: "admin", password: "admin123" }
        : null
  });
}
