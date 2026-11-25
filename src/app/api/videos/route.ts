import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  let whereClause = "";
  let args: (string | number)[] = [];

  if (user.role === "editor") {
    // Video editor only sees videos assigned to them AFTER shoot is completed (not 'script')
    whereClause = "WHERE v.assigned_editor_id = ? AND v.stage != 'script'";
    args = [user.id];
  } else if (user.role === "cameraman") {
    whereClause = "WHERE v.assigned_cameraman_id = ?";
    args = [user.id];
  } else if (user.role === "content_writer" || user.role === "ai_content_creator") {
    whereClause = "WHERE v.assigned_editor_id = ? OR v.assigned_writer_id = ?";
    args = [user.id, user.id];
  }

  const baseQuery = `
    SELECT v.*,
      c.name AS client_name,
      c.industry AS client_industry,
      e.name AS editor_name,
      e.avatar_color AS editor_color,
      w.name AS writer_name,
      cam.name AS cameraman_name
    FROM videos v
    JOIN clients c ON c.id = v.client_id
    LEFT JOIN users e ON e.id = v.assigned_editor_id
    LEFT JOIN users w ON w.id = v.assigned_writer_id
    LEFT JOIN users cam ON cam.id = v.assigned_cameraman_id
    ${whereClause}
    ORDER BY
      CASE WHEN v.stage = 'posted' THEN 1 ELSE 0 END ASC,
      CASE v.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END ASC,
      v.edit_deadline ASC,
      v.id DESC
  `;

  const res = args.length > 0
    ? await db.execute({ sql: baseQuery, args })
    : await db.execute(baseQuery);

  return NextResponse.json({ videos: res.rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "editor" || user.role === "cameraman") {
    return NextResponse.json(
      { error: "Only Manager, Owner, Admin, or Content Creator can create new tasks." },
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
    const assigned_writer_id = body.assigned_writer_id
      ? Number(body.assigned_writer_id)
      : user.role === "content_writer" || user.role === "ai_content_creator"
      ? user.id
      : null;
    const assigned_cameraman_id = body.assigned_cameraman_id
      ? Number(body.assigned_cameraman_id)
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

    const db = await getDb();
    const res = await db.execute({
      sql: `INSERT INTO videos (
        client_id, title, content_type, stage, priority,
        assigned_editor_id, assigned_writer_id, assigned_cameraman_id,
        edit_deadline, posting_date, raw_link, final_link, live_url, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        client_id,
        title,
        content_type,
        stage,
        priority,
        assigned_editor_id,
        assigned_writer_id,
        assigned_cameraman_id,
        edit_deadline,
        posting_date,
        raw_link,
        final_link,
        live_url,
        notes,
        user.id,
      ],
    });

    const created = await db.execute({
      sql: `SELECT v.*, c.name AS client_name, c.industry AS client_industry,
        e.name AS editor_name, e.avatar_color AS editor_color,
        w.name AS writer_name, cam.name AS cameraman_name
       FROM videos v
       JOIN clients c ON c.id = v.client_id
       LEFT JOIN users e ON e.id = v.assigned_editor_id
       LEFT JOIN users w ON w.id = v.assigned_writer_id
       LEFT JOIN users cam ON cam.id = v.assigned_cameraman_id
       WHERE v.id = ?`,
      args: [Number(res.lastInsertRowid)],
    });

    return NextResponse.json({ video: created.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create video." }, { status: 500 });
  }
}
