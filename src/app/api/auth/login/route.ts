import { NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";
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

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT id, name, email, password_hash, role, avatar_color, active, created_at FROM users WHERE lower(email) = ?",
      args: [email],
    });
    const user = res.rows[0];

    if (!user || String(user.password_hash) !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!Number(user.active)) {
      return NextResponse.json(
        { error: "This account has been deactivated. Contact Owner/Admin." },
        { status: 403 }
      );
    }

    const token = await createSession(Number(user.id));
    const response = NextResponse.json({
      user: {
        id: Number(user.id),
        name: String(user.name),
        email: String(user.email),
        role: String(user.role),
        avatar_color: String(user.avatar_color),
        active: Number(user.active),
        created_at: String(user.created_at),
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    const message =
      err instanceof Error && err.message
        ? `Login failed: ${err.message}`
        : "Login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
