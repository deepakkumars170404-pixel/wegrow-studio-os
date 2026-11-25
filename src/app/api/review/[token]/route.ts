import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const cleanToken = token?.trim();

  if (!cleanToken) {
    return NextResponse.json({ error: "Invalid review token." }, { status: 400 });
  }

  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT v.id, v.title, v.content_type, v.stage, v.posting_date, v.final_link, v.notes,
                 c.name AS client_name, c.industry AS client_industry
          FROM videos v
          JOIN clients c ON c.id = v.client_id
          WHERE v.review_token = ?`,
    args: [cleanToken],
  });

  const video = res.rows[0];
  if (!video) {
    return NextResponse.json(
      { error: "Review link not found or expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    video: {
      id: Number(video.id),
      title: String(video.title),
      contentType: String(video.content_type || "Reel"),
      stage: String(video.stage),
      postingDate: String(video.posting_date || ""),
      finalLink: String(video.final_link || ""),
      notes: String(video.notes || ""),
      clientName: String(video.client_name),
      clientIndustry: String(video.client_industry),
    },
  });
}
