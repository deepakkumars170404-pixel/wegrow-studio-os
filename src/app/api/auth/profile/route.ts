import { NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const res = await db.execute({
    sql: "SELECT id, name, email, phone, role, avatar_color, created_at FROM users WHERE id = ?",
    args: [user.id],
  });

  return NextResponse.json({ profile: res.rows[0] });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const db = await getDb();

    // Check current user record
    const userRes = await db.execute({
      sql: "SELECT id, password_hash FROM users WHERE id = ?",
      args: [user.id],
    });
    const currentRecord = userRes.rows[0];
    if (!currentRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name && String(body.name).trim()) {
      updates.push("name = ?");
      values.push(String(body.name).trim());
    }

    if (body.phone !== undefined) {
      updates.push("phone = ?");
      values.push(String(body.phone || "").trim());
    }

    if (body.avatar_color && String(body.avatar_color).trim()) {
      updates.push("avatar_color = ?");
      values.push(String(body.avatar_color).trim());
    }

    // Password change verification
    if (body.new_password) {
      const currentPassword = String(body.current_password || "");
      if (hashPassword(currentPassword) !== String(currentRecord.password_hash)) {
        return NextResponse.json(
          { error: "Incorrect current password. Password not changed." },
          { status: 400 }
        );
      }
      if (String(body.new_password).length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      updates.push("password_hash = ?");
      values.push(hashPassword(String(body.new_password)));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(user.id);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      args: values,
    });

    const updated = await db.execute({
      sql: "SELECT id, name, email, phone, role, avatar_color, created_at FROM users WHERE id = ?",
      args: [user.id],
    });

    return NextResponse.json({ profile: updated.rows[0], success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Profile update failed" },
      { status: 500 }
    );
  }
}
