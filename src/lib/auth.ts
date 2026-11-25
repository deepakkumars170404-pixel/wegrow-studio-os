import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, UserRecord, UserRole } from "./db";

export const SESSION_COOKIE_NAME = "wegrow_session";

export async function createSession(userId: number): Promise<string> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.execute({
    sql: "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
    args: [token, userId, expiresAt],
  });
  return token;
}

export async function getSessionUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT u.id, u.name, u.email, u.role, u.avatar_color, u.active, u.created_at, s.expires_at
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND u.active = 1`,
    args: [token],
  });

  const row = res.rows[0];
  if (!row) return null;

  if (new Date(String(row.expires_at)).getTime() < Date.now()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
    return null;
  }

  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as UserRole,
    avatar_color: String(row.avatar_color),
    active: Number(row.active),
    created_at: String(row.created_at),
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
  }
}

export function canManageStaff(role: UserRecord["role"]): boolean {
  return role === "owner" || role === "admin";
}

export function canManageClientsAndAssign(role: UserRecord["role"]): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}
