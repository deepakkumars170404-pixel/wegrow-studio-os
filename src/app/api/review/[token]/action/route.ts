import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const cleanToken = token?.trim();

  if (!cleanToken) {
    return NextResponse.json({ error: "Invalid review token." }, { status: 400 });
  }

  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT v.*, c.name AS client_name,
            w.name AS writer_name, w.phone AS writer_phone, w.email AS writer_email,
            e.name AS editor_name, e.phone AS editor_phone
          FROM videos v
          JOIN clients c ON c.id = v.client_id
          LEFT JOIN users w ON w.id = v.assigned_writer_id
          LEFT JOIN users e ON e.id = v.assigned_editor_id
          WHERE v.review_token = ?`,
    args: [cleanToken],
  });

  const video = res.rows[0];
  if (!video) {
    return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action; // 'approve' | 'request_revision'
  const currentNotes = String(video.notes || "");
  const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  if (action === "approve") {
    const comment = body.comment ? ` - "${String(body.comment).trim()}"` : "";
    const updatedNotes = `${currentNotes}\n✅ [Client Approved on ${nowStr}]${comment}`.trim();

    await db.execute({
      sql: `UPDATE videos 
            SET stage = 'scheduled', notes = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [updatedNotes, Number(video.id)],
    });

    return NextResponse.json({
      success: true,
      message: "Video approved successfully! Scheduled for publishing.",
      stage: "scheduled",
    });
  }

  if (action === "request_revision") {
    const feedback = String(body.feedback || "").trim();
    if (!feedback) {
      return NextResponse.json(
        { error: "Please enter your revision feedback details." },
        { status: 400 }
      );
    }

    const updatedNotes = `⚠️ [Client Revision Request on ${nowStr}]: ${feedback}\n${currentNotes}`.trim();

    await db.execute({
      sql: `UPDATE videos 
            SET stage = 'editing', deadline_alert_sent = 0, notes = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [updatedNotes, Number(video.id)],
    });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted! Our video editing team will make the revisions.",
      stage: "editing",
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
