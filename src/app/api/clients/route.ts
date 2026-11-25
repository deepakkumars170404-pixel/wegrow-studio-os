import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canManageClientsAndAssign, getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const clients = db
    .prepare(
      `SELECT c.*,
        COUNT(v.id) AS total_videos,
        SUM(CASE WHEN v.stage = 'posted' THEN 1 ELSE 0 END) AS posted_count,
        SUM(CASE WHEN v.stage IN ('scheduled', 'client_approval') THEN 1 ELSE 0 END) AS ready_count,
        SUM(CASE WHEN v.stage != 'posted' THEN 1 ELSE 0 END) AS pending_count
       FROM clients c
       LEFT JOIN videos v ON v.client_id = c.id
       GROUP BY c.id
       ORDER BY c.status ASC, c.name ASC`
    )
    .all();

  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageClientsAndAssign(user.role)) {
    return NextResponse.json(
      { error: "Only Owner, Admin, or Manager can add clients." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const industry = String(body.industry || "General").trim();
    const monthly_target = Math.max(1, Number(body.monthly_target) || 12);
    const brand_drive_url = String(body.brand_drive_url || "").trim();
    const guidelines = String(body.guidelines || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }

    const db = getDb();
    const res = db
      .prepare(
        "INSERT INTO clients (name, industry, monthly_target, brand_drive_url, guidelines) VALUES (?, ?, ?, ?, ?)"
      )
      .run(name, industry, monthly_target, brand_drive_url, guidelines);

    const created = db.prepare("SELECT * FROM clients WHERE id = ?").get(res.lastInsertRowid);
    return NextResponse.json({ client: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}
