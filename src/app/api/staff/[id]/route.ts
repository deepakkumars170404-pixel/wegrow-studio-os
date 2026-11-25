import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canManageStaff, getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageStaff(user.role)) {
    return NextResponse.json(
      { error: "Only Owner or Admin can update staff." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const targetId = Number(id);
  const db = await getDb();
  const targetRes = await db.execute({
    sql: "SELECT id, role FROM users WHERE id = ?",
    args: [targetId],
  });
  const target = targetRes.rows[0];

  if (!target) {
    return NextResponse.json({ error: "Staff not found." }, { status: 404 });
  }
  if (String(target.role) === "owner") {
    return NextResponse.json(
      { error: "Owner account cannot be modified here." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (typeof body.active === "boolean" || typeof body.active === "number") {
    updates.push("active = ?");
    values.push(body.active ? 1 : 0);
  }
  if (
    body.role &&
    ["admin", "manager", "editor", "content_writer", "ai_content_creator", "cameraman"].includes(body.role)
  ) {
    updates.push("role = ?");
    values.push(body.role);
  }
  if (body.name && String(body.name).trim()) {
    updates.push("name = ?");
    values.push(String(body.name).trim());
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  values.push(targetId);
  await db.execute({
    sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    args: values,
  });

  const updated = await db.execute({
    sql: "SELECT id, name, email, role, avatar_color, active, created_at FROM users WHERE id = ?",
    args: [targetId],
  });

  return NextResponse.json({ staff: updated.rows[0] });
}
