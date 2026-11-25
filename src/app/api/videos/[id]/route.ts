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

  const { id } = await context.params;
  const videoId = Number(id);
  const db = getDb();

  const existing = db
    .prepare("SELECT id, assigned_editor_id, assigned_writer_id FROM videos WHERE id = ?")
    .get(videoId) as
    | { id: number; assigned_editor_id: number | null; assigned_writer_id: number | null }
    | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const isManagerOrAbove = canManageClientsAndAssign(user.role);
  const isAssigned =
    existing.assigned_editor_id === user.id || existing.assigned_writer_id === user.id;

  if (!isManagerOrAbove && !isAssigned) {
    return NextResponse.json(
      { error: "You can only update videos assigned to you." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const updates: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];

  const allowedStringFields = isManagerOrAbove
    ? ([
        "title",
        "content_type",
        "stage",
        "priority",
        "edit_deadline",
        "posting_date",
        "raw_link",
        "final_link",
        "live_url",
        "notes",
      ] as const)
    : user.role === "editor"
    ? (["stage", "final_link", "notes"] as const)
    : (["title", "stage", "raw_link", "final_link", "notes"] as const);

  for (const field of allowedStringFields) {
    if (typeof body[field] === "string") {
      updates.push(`${field} = ?`);
      values.push(body[field].trim());
    }
  }

  if (isManagerOrAbove) {
    if (body.client_id !== undefined) {
      updates.push("client_id = ?");
      values.push(Number(body.client_id));
    }
    if (body.assigned_editor_id !== undefined) {
      updates.push("assigned_editor_id = ?");
      values.push(body.assigned_editor_id ? Number(body.assigned_editor_id) : null);
    }
    if (body.assigned_writer_id !== undefined) {
      updates.push("assigned_writer_id = ?");
      values.push(body.assigned_writer_id ? Number(body.assigned_writer_id) : null);
    }
  }

  values.push(videoId);
  db.prepare(`UPDATE videos SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const updated = db
    .prepare(
      `SELECT v.*, c.name AS client_name, c.industry AS client_industry,
        e.name AS editor_name, e.avatar_color AS editor_color, w.name AS writer_name
       FROM videos v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN users e ON e.id = v.assigned_editor_id
       LEFT JOIN users w ON w.id = v.assigned_writer_id
       WHERE v.id = ?`
    )
    .get(videoId);

  return NextResponse.json({ video: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageClientsAndAssign(user.role)) {
    return NextResponse.json(
      { error: "Only Owner, Admin, or Manager can delete videos." },
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const db = getDb();
  db.prepare("DELETE FROM videos WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
