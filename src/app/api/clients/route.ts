import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canManageClientsAndAssign, getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const orgId = user.org_id || 1;

  const res = await db.execute({
    sql: `SELECT c.*,
      COUNT(v.id) AS total_videos,
      SUM(CASE WHEN v.stage = 'posted' THEN 1 ELSE 0 END) AS posted_count,
      SUM(CASE WHEN v.stage IN ('scheduled', 'client_approval') THEN 1 ELSE 0 END) AS ready_count,
      SUM(CASE WHEN v.stage != 'posted' THEN 1 ELSE 0 END) AS pending_count
     FROM clients c
     LEFT JOIN videos v ON v.client_id = c.id
     WHERE c.org_id = ?
     GROUP BY c.id
     ORDER BY c.status ASC, c.name ASC`,
    args: [orgId],
  });

  return NextResponse.json({ clients: res.rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canAddClient =
    canManageClientsAndAssign(user.role) ||
    user.role === "content_writer" ||
    user.role === "ai_content_creator";
  if (!canAddClient) {
    return NextResponse.json(
      { error: "Only Owner, Admin, Manager or Creator can add clients." },
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

    const db = await getDb();
    const orgId = user.org_id || 1;
    const res = await db.execute({
      sql: "INSERT INTO clients (name, industry, monthly_target, brand_drive_url, guidelines, org_id) VALUES (?, ?, ?, ?, ?, ?)",
      args: [name, industry, monthly_target, brand_drive_url, guidelines, orgId],
    });

    const created = await db.execute({
      sql: "SELECT * FROM clients WHERE id = ?",
      args: [Number(res.lastInsertRowid)],
    });
    return NextResponse.json({ client: created.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create client." }, { status: 500 });
  }
}
