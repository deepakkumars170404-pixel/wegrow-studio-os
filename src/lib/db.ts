import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "editor"
  | "content_writer"
  | "ai_content_creator";

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
  role: UserRole;
  avatar_color: string;
  active: number;
  created_at: string;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "wegrow.db");

declare global {
  var __wegrowDb: DatabaseSync | undefined;
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`wegrow_salt_${password}`).digest("hex");
}

function addDaysISO(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function initSchemaAndSeed(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'content_writer', 'ai_content_creator')),
      avatar_color TEXT NOT NULL DEFAULT '#6366f1',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT NOT NULL DEFAULT 'General',
      monthly_target INTEGER NOT NULL DEFAULT 12,
      brand_drive_url TEXT NOT NULL DEFAULT '',
      guidelines TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS videos (
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
      FOREIGN KEY (assigned_writer_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, ?, ?)"
    );
    const defaultPass = hashPassword("wegrow123");
    insertUser.run("Thavabalan", "thavabalan@wegrow.in", defaultPass, "owner", "#4f46e5");
    insertUser.run("Rajavalli", "rajavalli@wegrow.in", defaultPass, "manager", "#0891b2");
    insertUser.run("Mareeswaran", "mareeswaran@wegrow.in", defaultPass, "content_writer", "#db2777");
    insertUser.run("Rahul", "rahul@wegrow.in", defaultPass, "editor", "#d97706");
    insertUser.run("Millar", "millar@wegrow.in", defaultPass, "ai_content_creator", "#059669");
  }

  const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number };
  if (clientCount.count === 0) {
    const insertClient = db.prepare(
      "INSERT INTO clients (name, industry, monthly_target, brand_drive_url, guidelines) VALUES (?, ?, ?, ?, ?)"
    );
    insertClient.run(
      "Aura Aesthetics Clinic",
      "Healthcare & Beauty",
      12,
      "https://drive.google.com/drive/folders/aura-brand-kit",
      "Use clean white/gold typography. Subtitle font: Montserrat Bold. Keep reels under 45s."
    );
    insertClient.run(
      "Urban Spice Kitchen",
      "F&B / Restaurant",
      16,
      "https://drive.google.com/drive/folders/urbanspice-assets",
      "Fast-paced food transitions, warm color grade, trending Tamil/English audio."
    );
    insertClient.run(
      "NexaFit Gym & Wellness",
      "Fitness",
      10,
      "https://drive.google.com/drive/folders/nexafit-media",
      "High-energy bass cuts, bold captions, include trainer handle in bottom-left."
    );
    insertClient.run(
      "VogueVault Jewellery",
      "Luxury Retail",
      8,
      "https://drive.google.com/drive/folders/voguevault-kit",
      "Slow-motion macro shots, minimal luxury serif fonts, no loud sound effects."
    );
  }

  const videoCount = db.prepare("SELECT COUNT(*) as count FROM videos").get() as { count: number };
  if (videoCount.count === 0) {
    const insertVideo = db.prepare(`
      INSERT INTO videos (
        client_id, title, content_type, stage, priority,
        assigned_editor_id, assigned_writer_id,
        edit_deadline, posting_date, raw_link, final_link, live_url, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 1: Thavabalan (Owner), 2: Rajavalli (Manager), 3: Mareeswaran (Content Creator), 4: Rahul (Editor), 5: Millar (AI Content Creator)
    insertVideo.run(
      1,
      "HydraFacial Before & After Transformation",
      "Reel",
      "editing",
      "urgent",
      4,
      3,
      addDaysISO(-1),
      addDaysISO(1),
      "https://drive.google.com/file/d/raw-hydrafacial",
      "",
      "",
      "Client wants skin glow emphasized in first 3 seconds.",
      2
    );
    insertVideo.run(
      2,
      "Weekend Biryani Making BTS",
      "Reel",
      "internal_review",
      "high",
      4,
      3,
      addDaysISO(0),
      addDaysISO(2),
      "https://drive.google.com/file/d/raw-biryani",
      "https://drive.google.com/file/d/edit-biryani-v1",
      "",
      "Check audio sync at 0:14.",
      2
    );
    insertVideo.run(
      3,
      "30-Day Fat Loss Myth Buster",
      "YouTube",
      "raw_uploaded",
      "normal",
      4,
      5,
      addDaysISO(2),
      addDaysISO(5),
      "https://drive.google.com/file/d/raw-fatloss",
      "",
      "",
      "Add B-roll from gym floor folder.",
      2
    );
    insertVideo.run(
      4,
      "Bridal Diamond Choker Showcase",
      "Reel",
      "scheduled",
      "normal",
      4,
      3,
      addDaysISO(-2),
      addDaysISO(1),
      "https://drive.google.com/file/d/raw-choker",
      "https://drive.google.com/file/d/final-choker",
      "",
      "Approved by client. Ready for 6 PM slot.",
      1
    );
    insertVideo.run(
      1,
      "Dermatologist Q&A: Sunscreen Myths",
      "Reel",
      "script",
      "normal",
      null,
      3,
      addDaysISO(4),
      addDaysISO(7),
      "",
      "",
      "",
      "Hook: Stop applying sunscreen like this!",
      3
    );
    insertVideo.run(
      2,
      "AI Food Commercial: Paneer Tikka Sizzler",
      "Ad Creative",
      "editing",
      "urgent",
      5,
      5,
      addDaysISO(0),
      addDaysISO(1),
      "https://drive.google.com/file/d/raw-sizzler",
      "",
      "",
      "AI motion shots + price tag end card.",
      2
    );
    insertVideo.run(
      3,
      "Morning Mobility Routine for Beginners",
      "Shorts",
      "posted",
      "normal",
      4,
      3,
      addDaysISO(-5),
      addDaysISO(-3),
      "https://drive.google.com/file/d/raw-mobility",
      "https://drive.google.com/file/d/final-mobility",
      "https://instagram.com/reel/example-mobility",
      "Posted on IG & YT Shorts.",
      2
    );
    insertVideo.run(
      4,
      "Akshaya Tritiya Gold Offer Teaser",
      "Ad Creative",
      "client_approval",
      "high",
      5,
      5,
      addDaysISO(1),
      addDaysISO(3),
      "https://drive.google.com/file/d/raw-gold",
      "https://drive.google.com/file/d/edit-gold-v2",
      "",
      "Sent to client for final sign-off.",
      2
    );
    insertVideo.run(
      2,
      "Customer Reaction Compilation",
      "Reel",
      "shoot_done",
      "normal",
      4,
      3,
      addDaysISO(3),
      addDaysISO(6),
      "",
      "",
      "",
      "Camera SD card dump pending upload.",
      2
    );
  }
}

export function getDb(): DatabaseSync {
  if (!globalThis.__wegrowDb) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const db = new DatabaseSync(DB_PATH);
    initSchemaAndSeed(db);
    globalThis.__wegrowDb = db;
  }
  return globalThis.__wegrowDb;
}
