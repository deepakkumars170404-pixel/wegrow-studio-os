import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser, canManageStaff } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const res = await db.execute("SELECT key, value FROM settings");
  const settings: Record<string, string> = {};
  for (const row of res.rows) {
    settings[String(row.key)] = String(row.value);
  }

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageStaff(user.role)) {
    return NextResponse.json(
      { error: "Only Owner or Admin can update organization settings." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const db = await getDb();

    for (const [key, val] of Object.entries(body)) {
      await db.execute({
        sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [key, String(val)],
      });
    }

    const res = await db.execute("SELECT key, value FROM settings");
    const settings: Record<string, string> = {};
    for (const row of res.rows) {
      settings[String(row.key)] = String(row.value);
    }

    return NextResponse.json({ settings, success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
