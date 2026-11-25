import { NextResponse } from "next/server";
import { getDb, hashPassword, UserRecord } from "@/lib/db";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db
      .prepare(
        "SELECT id, name, email, password_hash, role, avatar_color, active, created_at FROM users WHERE lower(email) = ?"
      )
      .get(email) as (UserRecord & { password_hash: string }) | undefined;

    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact Owner/Admin." },
        { status: 403 }
      );
    }

    const token = createSession(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_color: user.avatar_color,
        active: user.active,
        created_at: user.created_at,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
