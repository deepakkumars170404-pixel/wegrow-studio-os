import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const isCreatorOrEditor =
    user.role === "editor" ||
    user.role === "content_writer" ||
    user.role === "ai_content_creator";

  const baseQuery = `
    SELECT v.*,
      c.name AS client_name,
      c.industry AS client_industry,
      e.name AS editor_name,
      e.avatar_color AS editor_color,
      w.name AS writer_name
    FROM videos v
    JOIN clients c ON c.id = v.client_id
    LEFT JOIN users e ON e.id = v.assigned_editor_id
    LEFT JOIN users w ON w.id = v.assigned_writer_id
    ${isCreatorOrEditor ? "WHERE v.assigned_editor_id = ? OR v.assigned_writer_id = ?" : ""}
    ORDER BY
      CASE WHEN v.stage = 'posted' THEN 1 ELSE 0 END ASC,
      CASE v.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END ASC,
      v.edit_deadline ASC,
      v.id DESC
  `;

  const videos = isCreatorOrEditor
    ? db.prepare(baseQuery).all(user.id, user.id)
    : db.prepare(baseQuery).all();

  return NextResponse.json({ videos });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "editor") {
    return NextResponse.json(
      { error: "Video Editors cannot create new tasks. Contact Manager." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const client_id = Number(body.client_id);
    const title = String(body.title || "").trim();
    const content_type = String(body.content_type || "Reel").trim();
    const stage = String(body.stage || "script");
    const priority = String(body.priority || "normal");
    const assigned_editor_id = body.assigned_editor_id ? Number(body.assigned_editor_id) : null;
    const assigned_writer_id =
      body.assigned_writer_id
        ? Number(body.assigned_writer_id)
        : user.role === "content_writer" || user.role === "ai_content_creator"
        ? user.id
        : null;
    const edit_deadline = String(body.edit_deadline || "");
    const posting_date = String(body.posting_date || "");
    const raw_link = String(body.raw_link || "").trim();
    const final_link = String(body.final_link || "").trim();
    const live_url = String(body.live_url || "").trim();
    const notes = String(body.notes || "").trim();

    if (!client_id || !title) {
      return NextResponse.json(
        { error: "Client and video title are required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const res = db
      .prepare(
        `INSERT INTO videos (
          client_id, title, content_type, stage, priority,
          assigned_editor_id, assigned_writer_id,
          edit_deadline, posting_date, raw_link, final_link, live_url, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        client_id,
        title,
        content_type,
        stage,
        priority,
        assigned_editor_id,
        assigned_writer_id,
        edit_deadline,
        posting_date,
        raw_link,
        final_link,
        live_url,
        notes,
        user.id
      );

    const created = db
      .prepare(
        `SELECT v.*, c.name AS client_name, c.industry AS client_industry,
          e.name AS editor_name, e.avatar_color AS editor_color, w.name AS writer_name
         FROM videos v
         JOIN clients c ON c.id = v.client_id
         LEFT JOIN users e ON e.id = v.assigned_editor_id
         LEFT JOIN users w ON w.id = v.assigned_writer_id
         WHERE v.id = ?`
      )
      .get(res.lastInsertRowid);

    return NextResponse.json({ video: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create video." }, { status: 500 });
  }
}
