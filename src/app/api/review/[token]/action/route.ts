import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  createClientApprovedAlertMessage,
  createClientRevisionAlertMessage,
  sendWhatsAppApi,
} from "@/lib/whatsapp";

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

    // Automated WhatsApp alert dispatch to Team Lead and Publishers
    try {
      const clientName = String(video.client_name || "Client");
      const videoTitle = String(video.title || "Video");
      const teamName = String(video.team || "BSchool");
      const finalLink = String(video.final_link || "");
      const clientComment = body.comment ? String(body.comment).trim() : undefined;

      // 1. Alert Team Lead (Rajavalli / Rajkumar / Gopinath)
      if (video.writer_phone) {
        const leadMsg = createClientApprovedAlertMessage({
          clientName,
          videoTitle,
          staffName: String(video.writer_name || "Lead"),
          teamName,
          clientComment,
          finalLink,
        });
        sendWhatsAppApi({
          phone: String(video.writer_phone),
          message: leadMsg,
        }).catch((e) => console.warn("WhatsApp alert to lead failed:", e));
      }

      // 2. Alert Publishers (Mareeswaran / Millar) so they know to post live
      const pubRes = await db.execute({
        sql: "SELECT name, phone FROM users WHERE (lower(email) LIKE '%mareeswaran%' OR lower(email) LIKE '%millar%') AND phone != ''",
      });
      for (const pub of pubRes.rows) {
        if (pub.phone) {
          const pubMsg = createClientApprovedAlertMessage({
            clientName,
            videoTitle,
            staffName: String(pub.name || "Publisher"),
            teamName,
            clientComment,
            finalLink,
          });
          sendWhatsAppApi({
            phone: String(pub.phone),
            message: pubMsg,
          }).catch((e) => console.warn("WhatsApp alert to publisher failed:", e));
        }
      }
    } catch (e) {
      console.warn("Client approval alert dispatch error:", e);
    }

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

    // Alert Editor (Rahul) and Team Lead of changes needed
    try {
      const clientName = String(video.client_name || "Client");
      const videoTitle = String(video.title || "Video");
      const teamName = String(video.team || "BSchool");

      if (video.editor_phone) {
        const edMsg = createClientRevisionAlertMessage({
          clientName,
          videoTitle,
          editorName: String(video.editor_name || "Editor"),
          teamName,
          revisionFeedback: feedback,
        });
        sendWhatsAppApi({
          phone: String(video.editor_phone),
          message: edMsg,
        }).catch((e) => console.warn("WhatsApp alert to editor failed:", e));
      }
    } catch (e) {
      console.warn("Client revision alert dispatch error:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Feedback submitted! Our video editing team has been notified.",
      stage: "editing",
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
