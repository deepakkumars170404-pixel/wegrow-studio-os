import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { canManageClientsAndAssign, getSessionUser } from "@/lib/auth";
import { formatDeadline } from "@/lib/constants";
import { createShootDoneAlertMessage, sendWhatsAppApi } from "@/lib/whatsapp";

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
  const db = await getDb();

  const existingRes = await db.execute({
    sql: "SELECT id, assigned_editor_id, assigned_writer_id, assigned_cameraman_id FROM videos WHERE id = ?",
    args: [videoId],
  });
  const existing = existingRes.rows[0];

  if (!existing) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const isManagerOrAbove = canManageClientsAndAssign(user.role);
  const isAssigned =
    Number(existing.assigned_editor_id) === user.id ||
    Number(existing.assigned_writer_id) === user.id ||
    Number(existing.assigned_cameraman_id) === user.id;

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
    : user.role === "cameraman"
    ? (["stage", "raw_link", "notes"] as const)
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
    if (body.assigned_cameraman_id !== undefined) {
      updates.push("assigned_cameraman_id = ?");
      values.push(body.assigned_cameraman_id ? Number(body.assigned_cameraman_id) : null);
    }
  }

  values.push(videoId);
  await db.execute({
    sql: `UPDATE videos SET ${updates.join(", ")} WHERE id = ?`,
    args: values,
  });

  const updated = await db.execute({
    sql: `SELECT v.*, c.name AS client_name, c.industry AS client_industry,
      e.name AS editor_name, e.avatar_color AS editor_color, e.phone AS editor_phone,
      w.name AS writer_name, cam.name AS cameraman_name
     FROM videos v
     JOIN clients c ON c.id = v.client_id
     LEFT JOIN users e ON e.id = v.assigned_editor_id
     LEFT JOIN users w ON w.id = v.assigned_writer_id
     LEFT JOIN users cam ON cam.id = v.assigned_cameraman_id
     WHERE v.id = ?`,
    args: [videoId],
  });

  const updatedRow = updated.rows[0];

  // Automated WhatsApp trigger when shoot is marked done
  if (body.stage === "shoot_done" && updatedRow?.editor_phone) {
    try {
      const msg = createShootDoneAlertMessage({
        clientName: String(updatedRow.client_name || ""),
        videoTitle: String(updatedRow.title || ""),
        editorName: String(updatedRow.editor_name || "Editor"),
        editDeadline: formatDeadline(String(updatedRow.edit_deadline || "")),
        rawLink: String(updatedRow.raw_link || ""),
      });
      sendWhatsAppApi({
        phone: String(updatedRow.editor_phone),
        message: msg,
      }).catch((e) => console.warn("WhatsApp background dispatch failed:", e));
    } catch (e) {
      console.warn("WhatsApp trigger error:", e);
    }
  }

  return NextResponse.json({ video: updatedRow });
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
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM videos WHERE id = ?",
    args: [Number(id)],
  });
  return NextResponse.json({ ok: true });
}
