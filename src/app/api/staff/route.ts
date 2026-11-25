import { NextResponse } from "next/server";
import { getDb, hashPassword, UserRole } from "@/lib/db";
import { canManageStaff, getSessionUser } from "@/lib/auth";

const AVATAR_COLORS = ["#4f46e5", "#0891b2", "#d97706", "#059669", "#db2777", "#7c3aed", "#0284c7"];

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const staff = db
    .prepare(
      `SELECT id, name, email, role, avatar_color, active, created_at
       FROM users
       ORDER BY CASE role
         WHEN 'owner' THEN 1
         WHEN 'admin' THEN 2
         WHEN 'manager' THEN 3
         WHEN 'editor' THEN 4
         ELSE 5
       END, id ASC`
    )
    .all();

  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageStaff(user.role)) {
    return NextResponse.json(
      { error: "Only Owner or Admin can add new staff." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const role = String(body.role || "editor") as UserRole;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = [
      "admin",
      "manager",
      "editor",
      "content_writer",
      "ai_content_creator",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role selected." },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(email);
    if (existing) {
      return NextResponse.json(
        { error: "A staff member with this email already exists." },
        { status: 409 }
      );
    }

    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const result = db
      .prepare(
        "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)"
      )
      .run(name, email, hashPassword(password), role, color);

    const created = db
      .prepare("SELECT id, name, email, role, avatar_color, active, created_at FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json({ staff: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add staff." }, { status: 500 });
  }
}
