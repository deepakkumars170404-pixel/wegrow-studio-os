import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canManageClientsAndAssign, getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageClientsAndAssign(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const clientId = Number(id);
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
  if (!existing) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.name && String(body.name).trim()) {
    updates.push("name = ?");
    values.push(String(body.name).trim());
  }
  if (typeof body.industry === "string") {
    updates.push("industry = ?");
    values.push(body.industry.trim());
  }
  if (body.monthly_target !== undefined) {
    updates.push("monthly_target = ?");
    values.push(Math.max(1, Number(body.monthly_target) || 12));
  }
  if (typeof body.brand_drive_url === "string") {
    updates.push("brand_drive_url = ?");
    values.push(body.brand_drive_url.trim());
  }
  if (typeof body.guidelines === "string") {
    updates.push("guidelines = ?");
    values.push(body.guidelines.trim());
  }
  if (body.status === "active" || body.status === "paused") {
    updates.push("status = ?");
    values.push(body.status);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid fields." }, { status: 400 });
  }

  values.push(clientId);
  db.prepare(`UPDATE clients SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);
  return NextResponse.json({ client: updated });
}
