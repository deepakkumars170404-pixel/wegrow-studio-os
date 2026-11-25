import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const orgId = user.org_id || 1;

  // Fetch all videos, clients, and staff for this organization
  const [videosRes, clientsRes, staffRes] = await Promise.all([
    db.execute({
      sql: `SELECT v.*,
        c.name as client_name, c.monthly_target,
        e.name as editor_name, e.avatar_color as editor_color,
        cam.name as cameraman_name
      FROM videos v
      JOIN clients c ON c.id = v.client_id
      LEFT JOIN users e ON e.id = v.assigned_editor_id
      LEFT JOIN users cam ON cam.id = v.assigned_cameraman_id
      WHERE v.org_id = ?`,
      args: [orgId],
    }),
    db.execute({
      sql: "SELECT * FROM clients WHERE status = 'active' AND org_id = ?",
      args: [orgId],
    }),
    db.execute({
      sql: "SELECT * FROM users WHERE active = 1 AND org_id = ?",
      args: [orgId],
    }),
  ]);

  const videos = videosRes.rows;
  const clients = clientsRes.rows;
  const staff = staffRes.rows;

  // 1. Overall Delivery Rate
  const totalTarget = clients.reduce((acc, c) => acc + Number(c.monthly_target || 0), 0);
  const totalPosted = videos.filter((v) => v.stage === "posted").length;
  const totalInPipe = videos.filter((v) => v.stage !== "posted").length;
  const deliveryPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalPosted / totalTarget) * 100)) : 0;

  // 2. Editor Leaderboard
  const editors = staff.filter((s) => s.role === "editor" || s.role === "ai_content_creator");
  const leaderboard = editors.map((ed) => {
    const assignedVideos = videos.filter((v) => Number(v.assigned_editor_id) === Number(ed.id));
    const completed = assignedVideos.filter((v) => v.stage === "posted");
    const active = assignedVideos.filter((v) => v.stage !== "posted");
    const inEditing = assignedVideos.filter((v) => ["shoot_done", "raw_uploaded", "editing"].includes(String(v.stage)));
    const inReview = assignedVideos.filter((v) => ["internal_review", "client_approval", "scheduled"].includes(String(v.stage)));

    // On-time calculation: videos where edit_deadline >= created_at or not overdue
    const overdueCount = active.filter((v) => v.edit_deadline && String(v.edit_deadline).slice(0, 10) < today).length;
    const onTimePercentage = assignedVideos.length > 0 ? Math.max(0, Math.round(((assignedVideos.length - overdueCount) / assignedVideos.length) * 100)) : 100;

    return {
      id: Number(ed.id),
      name: String(ed.name),
      role: String(ed.role),
      avatar_color: String(ed.avatar_color),
      total_assigned: assignedVideos.length,
      completed_count: completed.length,
      active_count: active.length,
      in_editing_count: inEditing.length,
      in_review_count: inReview.length,
      overdue_count: overdueCount,
      on_time_rate: onTimePercentage,
    };
  });

  // 3. Client Health Meter
  const clientHealth = clients.map((c) => {
    const cVideos = videos.filter((v) => Number(v.client_id) === Number(c.id));
    const posted = cVideos.filter((v) => v.stage === "posted").length;
    const target = Math.max(1, Number(c.monthly_target || 12));
    const pending = cVideos.filter((v) => v.stage !== "posted").length;
    const overdue = cVideos.filter(
      (v) => v.stage !== "posted" && v.edit_deadline && String(v.edit_deadline).slice(0, 10) < today
    ).length;

    const rate = Math.min(100, Math.round((posted / target) * 100));

    let status: "healthy" | "attention" | "critical" = "healthy";
    if (overdue >= 2 || (target >= 8 && rate < 25 && pending < 3)) {
      status = "critical";
    } else if (overdue === 1 || rate < 50) {
      status = "attention";
    }

    return {
      id: Number(c.id),
      name: String(c.name),
      industry: String(c.industry),
      monthly_target: target,
      posted_count: posted,
      pending_count: pending,
      overdue_count: overdue,
      completion_rate: rate,
      health_status: status,
    };
  });

  // 4. Funnel Counts
  const funnel = {
    script: videos.filter((v) => v.stage === "script").length,
    shoot_done: videos.filter((v) => v.stage === "shoot_done" || v.stage === "raw_uploaded").length,
    editing: videos.filter((v) => v.stage === "editing").length,
    review: videos.filter((v) => v.stage === "internal_review" || v.stage === "client_approval").length,
    scheduled: videos.filter((v) => v.stage === "scheduled").length,
    posted: videos.filter((v) => v.stage === "posted").length,
  };

  return NextResponse.json({
    analytics: {
      total_target: totalTarget,
      total_posted: totalPosted,
      total_in_pipe: totalInPipe,
      delivery_percentage: deliveryPercentage,
      leaderboard,
      client_health: clientHealth,
      funnel,
    },
  });
}
