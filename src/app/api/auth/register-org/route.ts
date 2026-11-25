import { NextResponse } from "next/server";
import { getDb, hashPassword } from "@/lib/db";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orgName = String(body.orgName || "").trim();
    const ownerName = String(body.ownerName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const phone = String(body.phone || "").trim();

    if (!orgName || !ownerName || !email || !password) {
      return NextResponse.json(
        { error: "Agency name, owner name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if user email already exists
    const existingUser = await db.execute({
      sql: "SELECT id FROM users WHERE lower(email) = ?",
      args: [email],
    });
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate unique slug for organization
    let baseSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = "agency";

    let uniqueSlug = baseSlug;
    const existingSlug = await db.execute({
      sql: "SELECT id FROM organizations WHERE slug = ?",
      args: [uniqueSlug],
    });
    if (existingSlug.rows.length > 0) {
      uniqueSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Insert Organization
    const orgRes = await db.execute({
      sql: "INSERT INTO organizations (name, slug, owner_email, plan) VALUES (?, ?, ?, ?)",
      args: [orgName, uniqueSlug, email, "starter"],
    });
    const orgId = Number(orgRes.lastInsertRowid);

    // Insert Owner User under this new org_id
    const userRes = await db.execute({
      sql: `INSERT INTO users (name, email, phone, password_hash, role, avatar_color, org_id)
            VALUES (?, ?, ?, ?, 'owner', '#4f46e5', ?)`,
      args: [ownerName, email, phone, hashPassword(password), orgId],
    });
    const userId = Number(userRes.lastInsertRowid);

    // Seed starter client for the agency
    await db.execute({
      sql: `INSERT INTO clients (name, industry, monthly_target, guidelines, org_id)
            VALUES ('Demo Client', 'E-Commerce & Brands', 8, 'Welcome to your new agency workspace! Add scripts and shoot schedules here.', ?)`,
      args: [orgId],
    });

    // Create session cookie
    const token = await createSession(userId);
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: ownerName,
        email,
        phone,
        role: "owner",
        avatar_color: "#4f46e5",
        active: 1,
        org_id: orgId,
        org_name: orgName,
        created_at: new Date().toISOString(),
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
    console.error("Register organization error:", err);
    return NextResponse.json(
      { error: "Failed to create agency workspace. Please try again." },
      { status: 500 }
    );
  }
}
