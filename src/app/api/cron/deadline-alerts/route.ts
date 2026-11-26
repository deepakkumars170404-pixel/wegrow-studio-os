import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  return handleDeadlineAlerts(request);
}

export async function POST(request: Request) {
  return handleDeadlineAlerts(request);
}

async function handleDeadlineAlerts(request: Request) {
  // Allow if authenticated user OR if matching CRON_SECRET header
  const user = await getSessionUser();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;
  if (!user && !isCronAuthorized && process.env.NODE_ENV === "production") {
    // In production, require either valid session or cron secret
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  // Find videos currently in progress (shoot_done, raw_uploaded, editing) with assigned editor having phone
  const res = await db.execute(`
    SELECT v.id, v.title, v.edit_deadline, v.stage, v.deadline_alert_sent,
           c.name AS client_name,
           e.id AS editor_id, e.name AS editor_name, e.phone AS editor_phone
    FROM videos v
    JOIN clients c ON c.id = v.client_id
    LEFT JOIN users e ON e.id = v.assigned_editor_id
    WHERE v.stage IN ('shoot_done', 'raw_uploaded', 'editing')
      AND v.edit_deadline != ''
      AND (v.deadline_alert_sent = 0 OR v.deadline_alert_sent IS NULL)
  `);

  const now = Date.now();
  const alerted: { videoId: number; title: string; editor: string; diffMins: number }[] = [];

  for (const row of res.rows) {
    const rawDeadline = String(row.edit_deadline || "");
    if (!rawDeadline) continue;

    const deadlineTime = new Date(rawDeadline).getTime();
    if (isNaN(deadlineTime)) continue;

    // Difference in minutes between deadline and current time
    const diffMins = Math.round((deadlineTime - now) / (1000 * 60));

    // Alert if deadline is within the next 2 hours (<= 120 mins) OR recently overdue (< 0 and within past 24 hrs)
    if (diffMins <= 120 && diffMins >= -1440) {
      const editorPhone = String(row.editor_phone || "").trim();
      const editorName = String(row.editor_name || "Editor");
      const clientName = String(row.client_name || "Client");
      const videoTitle = String(row.title || "Video");

      // Mark alert sent in DB so duplicate alerts aren't scanned
      await db.execute({
        sql: "UPDATE videos SET deadline_alert_sent = 1, updated_at = datetime('now') WHERE id = ?",
        args: [Number(row.id)],
      });

      alerted.push({
        videoId: Number(row.id),
        title: videoTitle,
        editor: editorName,
        diffMins,
      });
    }
  }

  return NextResponse.json({
    success: true,
    totalScanned: res.rows.length,
    alertedCount: alerted.length,
    alerted,
    timestamp: new Date().toISOString(),
  });
}
