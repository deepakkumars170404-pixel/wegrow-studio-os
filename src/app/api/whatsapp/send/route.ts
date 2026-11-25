import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendWhatsAppApi, getDirectWhatsAppUrl } from "@/lib/whatsapp";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const phone = String(body.phone || "").trim();
    const message = String(body.message || "").trim();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required" },
        { status: 400 }
      );
    }

    const apiResult = await sendWhatsAppApi({
      phone,
      message,
      templateName: body.templateName,
      templateParams: body.templateParams,
    });

    const directUrl = getDirectWhatsAppUrl(phone, message);

    return NextResponse.json({
      success: apiResult.success,
      api_result: apiResult,
      direct_url: directUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "WhatsApp dispatch error" },
      { status: 500 }
    );
  }
}
