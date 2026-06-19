import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ManagedTrainerUser, TrainerUser } from "@/lib/types";
import { getRuntimeUsers, readSession } from "@/lib/server/auth";
import { updateState } from "@/lib/server/store";

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicUser(user: ManagedTrainerUser): TrainerUser {
  const { password: _password, ...safeUser } = user;

  return safeUser;
}

async function requireAdmin() {
  const user = await readSession(await cookies());

  return user?.role === "admin" ? user : null;
}

export async function GET() {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = (await getRuntimeUsers()).map(publicUser);

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    password?: string;
    role?: TrainerUser["role"];
  };
  const name = body.name?.trim() || "";
  const password = body.password || "";
  const userId = slug(body.id || name);

  if (!name || !userId || password.length < 4) {
    return NextResponse.json(
      { error: "Name and a password with at least 4 characters are required" },
      { status: 400 }
    );
  }

  const existing = await getRuntimeUsers();

  if (existing.some((item) => item.id === userId)) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const newUser: ManagedTrainerUser = {
    id: userId,
    name,
    password,
    role: body.role === "admin" ? "admin" : "member",
    disabled: false,
    managed: true,
    createdAt: new Date().toISOString()
  };

  await updateState((state) => {
    state.users.push(newUser);
  });

  return NextResponse.json({ user: publicUser(newUser) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    password?: string;
    role?: TrainerUser["role"];
    disabled?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  let updated: ManagedTrainerUser | null = null;

  await updateState((state) => {
    const target = state.users.find((item) => item.id === body.id);

    if (!target) {
      return;
    }

    if (body.name?.trim()) {
      target.name = body.name.trim();
    }

    if (body.password) {
      target.password = body.password;
    }

    if (body.role === "admin" || body.role === "member") {
      target.role = body.role;
    }

    if (typeof body.disabled === "boolean") {
      target.disabled = body.id === user.id ? false : body.disabled;
    }

    updated = target;
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Only managed users can be edited here" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user: publicUser(updated) });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
  }

  let removed = false;

  await updateState((state) => {
    const before = state.users.length;
    state.users = state.users.filter((item) => item.id !== id);
    removed = state.users.length !== before;
  });

  if (!removed) {
    return NextResponse.json(
      { error: "Only managed users can be removed here" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
