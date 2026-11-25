import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, UserRecord } from "./db";

export const SESSION_COOKIE_NAME = "wegrow_session";

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresAt
  );
  return token;
}

export async function getSessionUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_color, u.active, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND u.active = 1`
    )
    .get(token) as (UserRecord & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar_color: row.avatar_color,
    active: row.active,
    created_at: row.created_at,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
}

export function canManageStaff(role: UserRecord["role"]): boolean {
  return role === "owner" || role === "admin";
}

export function canManageClientsAndAssign(role: UserRecord["role"]): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}
