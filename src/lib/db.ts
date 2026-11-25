import { createClient, type Client, type InArgs } from "@libsql/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "editor"
  | "content_writer"
  | "ai_content_creator"
  | "cameraman";

export type VideoStage =
  | "script"
  | "shoot_done"
  | "raw_uploaded"
  | "editing"
  | "internal_review"
  | "client_approval"
  | "scheduled"
  | "posted";

export type VideoPriority = "urgent" | "high" | "normal";

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_color: string;
  active: number;
  org_id: number;
  created_at: string;
}

declare global {
  var __wegrowLibsql: Client | undefined;
  var __wegrowInitPromise: Promise<void> | undefined;
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`wegrow_salt_${password}`).digest("hex");
}

function addDaysISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function createLibsqlClient(): Client {
  const rawUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (rawUrl && tursoToken) {
    // Use stateless HTTPS transport instead of WebSocket (libsql://) for reliable Vercel serverless execution
    const tursoUrl = rawUrl.replace(/^libsql:\/\//i, "https://");
    return createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in Vercel Environment Variables."
    );
  }

  // Fallback to local SQLite file via libsql when running locally without Turso token
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return createClient({
    url: `file:${path.join(dbDir, "wegrow.db").replace(/\\/g, "/")}`,
  });
}

async function initSchemaAndSeed(db: Client): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'content_writer', 'ai_content_creator', 'cameraman')),
        avatar_color TEXT NOT NULL DEFAULT '#6366f1',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        industry TEXT NOT NULL DEFAULT 'General',
        monthly_target INTEGER NOT NULL DEFAULT 12,
        brand_drive_url TEXT NOT NULL DEFAULT '',
        guidelines TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'Reel',
        stage TEXT NOT NULL DEFAULT 'script' CHECK (
          stage IN (
            'script',
            'shoot_done',
            'raw_uploaded',
            'editing',
            'internal_review',
            'client_approval',
            'scheduled',
            'posted'
          )
        ),
        priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal')),
        assigned_editor_id INTEGER,
        assigned_writer_id INTEGER,
        assigned_cameraman_id INTEGER,
        edit_deadline TEXT NOT NULL DEFAULT '',
        posting_date TEXT NOT NULL DEFAULT '',
        raw_link TEXT NOT NULL DEFAULT '',
        final_link TEXT NOT NULL DEFAULT '',
        live_url TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_editor_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_writer_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_cameraman_id) REFERENCES users(id) ON DELETE SET NULL
      )`,
    ],
    "write"
  );

  // Migrate existing users table CHECK constraint if cameraman role is missing
  const usersSchemaRes = await db.execute(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
  );
  const usersSql = String(usersSchemaRes.rows[0]?.sql || "");
  if (usersSql && !usersSql.includes("'cameraman'")) {
    await db.batch(
      [
        `CREATE TABLE users_migrated (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'content_writer', 'ai_content_creator', 'cameraman')),
          avatar_color TEXT NOT NULL DEFAULT '#6366f1',
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `INSERT INTO users_migrated (id, name, email, password_hash, role, avatar_color, active, created_at)
         SELECT id, name, email, password_hash, role, avatar_color, active, created_at FROM users`,
        `DROP TABLE users`,
        `ALTER TABLE users_migrated RENAME TO users`,
      ],
      "write"
    );
  }

  // Migrate existing videos table to add assigned_cameraman_id & org_id if missing
  const videoColsRes = await db.execute("PRAGMA table_info(videos)");
  const hasCameramanCol = videoColsRes.rows.some(
    (col) => String(col.name) === "assigned_cameraman_id"
  );
  if (!hasCameramanCol) {
    await db.execute(
      "ALTER TABLE videos ADD COLUMN assigned_cameraman_id INTEGER REFERENCES users(id) ON DELETE SET NULL"
    );
  }
  const hasVideoOrgId = videoColsRes.rows.some(
    (col) => String(col.name) === "org_id"
  );
  if (!hasVideoOrgId) {
    await db.execute("ALTER TABLE videos ADD COLUMN org_id INTEGER NOT NULL DEFAULT 1");
  }

  const hasReviewToken = videoColsRes.rows.some(
    (col) => String(col.name) === "review_token"
  );
  if (!hasReviewToken) {
    await db.execute("ALTER TABLE videos ADD COLUMN review_token TEXT NOT NULL DEFAULT ''");
  }

  const hasDeadlineAlertSent = videoColsRes.rows.some(
    (col) => String(col.name) === "deadline_alert_sent"
  );
  if (!hasDeadlineAlertSent) {
    await db.execute("ALTER TABLE videos ADD COLUMN deadline_alert_sent INTEGER NOT NULL DEFAULT 0");
  }

  const hasTeamCol = videoColsRes.rows.some(
    (col) => String(col.name) === "team"
  );
  if (!hasTeamCol) {
    await db.execute("ALTER TABLE videos ADD COLUMN team TEXT NOT NULL DEFAULT 'BSchool'");
  }

  // Populate any missing review tokens with random 16-char hex strings
  await db.execute(
    "UPDATE videos SET review_token = lower(hex(randomblob(8))) WHERE review_token = '' OR review_token IS NULL"
  );

  // Migrate users table to add phone & org_id if missing
  const userColsRes = await db.execute("PRAGMA table_info(users)");
  const hasPhoneCol = userColsRes.rows.some(
    (col) => String(col.name) === "phone"
  );
  if (!hasPhoneCol) {
    await db.execute("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  }
  const hasUserOrgId = userColsRes.rows.some(
    (col) => String(col.name) === "org_id"
  );
  if (!hasUserOrgId) {
    await db.execute("ALTER TABLE users ADD COLUMN org_id INTEGER NOT NULL DEFAULT 1");
  }

  // Migrate clients table to add org_id if missing
  const clientColsRes = await db.execute("PRAGMA table_info(clients)");
  const hasClientOrgId = clientColsRes.rows.some(
    (col) => String(col.name) === "org_id"
  );
  if (!hasClientOrgId) {
    await db.execute("ALTER TABLE clients ADD COLUMN org_id INTEGER NOT NULL DEFAULT 1");
  }

  // Ensure organizations table exists for multi-tenant B2B SaaS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_email TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'starter',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  await db.execute({
    sql: "INSERT OR IGNORE INTO organizations (id, name, slug, owner_email) VALUES (?, ?, ?, ?)",
    args: [1, "WEGROW Studio", "wegrow", "thavabalan@wegrow.in"],
  });

  // Ensure settings table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Seed default settings if missing
  const settingsRows = await db.execute("SELECT COUNT(*) as c FROM settings");
  if (Number(settingsRows.rows[0]?.c ?? 0) === 0) {
    await db.batch(
      [
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
          args: ["social_auto_posting", "0"],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
          args: ["whatsapp_enabled", "1"],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
          args: ["whatsapp_license", "90093749600"],
        },
        {
          sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
          args: ["whatsapp_api_key", "kPHm6t2y5cW78qhKGvZYefQ3E"],
        },
      ],
      "write"
    );
  }

  // Ensure Pandeeswaran (Cameraman) exists in staff list
  const pandeeswaranRes = await db.execute({
    sql: "SELECT id FROM users WHERE lower(email) = ?",
    args: ["pandeeswaran@wegrow.in"],
  });
  if (pandeeswaranRes.rows.length === 0) {
    const userCountCheck = await db.execute("SELECT COUNT(*) as count FROM users");
    if (Number(userCountCheck.rows[0]?.count ?? 0) > 0) {
      await db.execute({
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Pandeeswaran", "pandeeswaran@wegrow.in", hashPassword("wegrow123"), "cameraman", "#0284c7"],
      });
    }
  }

  // Ensure Rajkumar (SkillCampus Content Lead) exists
  const rajkumarRes = await db.execute({
    sql: "SELECT id FROM users WHERE lower(email) = ?",
    args: ["rajkumar@wegrow.in"],
  });
  if (rajkumarRes.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO users (name, email, password_hash, role, avatar_color, org_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["Rajkumar", "rajkumar@wegrow.in", hashPassword("wegrow123"), "content_writer", "#8b5cf6", 1],
    });
  }

  // Ensure Gopinath (Jobz Content Lead) exists
  const gopinathRes = await db.execute({
    sql: "SELECT id FROM users WHERE lower(email) = ?",
    args: ["gopinath@wegrow.in"],
  });
  if (gopinathRes.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO users (name, email, password_hash, role, avatar_color, org_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["Gopinath", "gopinath@wegrow.in", hashPassword("wegrow123"), "content_writer", "#06b6d4", 1],
    });
  }

  const userCountRes = await db.execute("SELECT COUNT(*) as count FROM users");
  const userCount = Number(userCountRes.rows[0]?.count ?? 0);
  if (userCount === 0) {
    const defaultPass = hashPassword("wegrow123");
    const seedUsers: { sql: string; args: InArgs }[] = [
      {
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Thavabalan", "thavabalan@wegrow.in", defaultPass, "owner", "#4f46e5"],
      },
      {
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Rajavalli", "rajavalli@wegrow.in", defaultPass, "manager", "#0891b2"],
      },
      {
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Mareeswaran", "mareeswaran@wegrow.in", defaultPass, "content_writer", "#db2777"],
      },
      {
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Rahul", "rahul@wegrow.in", defaultPass, "editor", "#d97706"],
      },
      {
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Millar", "millar@wegrow.in", defaultPass, "ai_content_creator", "#059669"],
      },
      {
        sql: "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)",
        args: ["Pandeeswaran", "pandeeswaran@wegrow.in", defaultPass, "cameraman", "#0284c7"],
      },
    ];
    await db.batch(seedUsers, "write");
  }


}

export async function getDb(): Promise<Client> {
  if (!globalThis.__wegrowLibsql) {
    globalThis.__wegrowLibsql = createLibsqlClient();
  }
  if (!globalThis.__wegrowInitPromise) {
    globalThis.__wegrowInitPromise = initSchemaAndSeed(globalThis.__wegrowLibsql).catch(
      (err) => {
        globalThis.__wegrowInitPromise = undefined;
        throw err;
      }
    );
  }
  await globalThis.__wegrowInitPromise;
  return globalThis.__wegrowLibsql;
}
