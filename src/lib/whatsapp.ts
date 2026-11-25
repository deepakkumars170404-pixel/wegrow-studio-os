export interface WhatsAppSendParams {
  phone: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
}

export function formatIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export function getDirectWhatsAppUrl(phone: string, message: string): string {
  const clean = formatIndianPhone(phone);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppApi({
  phone,
  message,
  templateName,
  templateParams,
}: WhatsAppSendParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const cleanPhone = formatIndianPhone(phone);
  if (!cleanPhone) {
    return { success: false, error: "Invalid phone number" };
  }

  const license = process.env.WHATSAPP_LICENSE || "90093749600";
  const apiKey = process.env.WHATSAPP_API_KEY || "kPHm6t2y5cW78qhKGvZYefQ3E";
  const baseUrl = "https://wa.mydreamstechnology.in";

  try {
    let url: string;

    if (templateName && templateParams && templateParams.length > 0) {
      const paramsJoined = templateParams.join(",");
      url = `${baseUrl}/api/sendtemplate.php?LicenseNumber=${encodeURIComponent(
        license
      )}&APIKey=${encodeURIComponent(apiKey)}&Contact=${encodeURIComponent(
        cleanPhone
      )}&Template=${encodeURIComponent(templateName)}&Param=${encodeURIComponent(
        paramsJoined
      )}`;
    } else {
      // Direct message fallback endpoint for gateway
      url = `${baseUrl}/api/sendmsg.php?LicenseNumber=${encodeURIComponent(
        license
      )}&APIKey=${encodeURIComponent(apiKey)}&Contact=${encodeURIComponent(
        cleanPhone
      )}&Message=${encodeURIComponent(message)}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain, */*" },
      signal: AbortSignal.timeout(6000),
    });

    const text = await res.text();
    return { success: res.ok, data: text };
  } catch (err) {
    console.warn("WhatsApp API warning:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "WhatsApp Gateway Error",
    };
  }
}

export function createShootDoneAlertMessage({
  clientName,
  videoTitle,
  editorName,
  editDeadline,
  rawLink,
}: {
  clientName: string;
  videoTitle: string;
  editorName: string;
  editDeadline: string;
  rawLink?: string;
}): string {
  return `🎬 *WEGROW STUDIO OS ALERT*\n\nHi ${editorName}!\nCameraman has completed shoot for:\n📌 *Client:* ${clientName}\n🎥 *Video:* ${videoTitle}\n⏰ *Edit Deadline:* ${editDeadline}\n${
    rawLink ? `📁 *Raw Footage:* ${rawLink}\n` : ""
  }\nPlease start editing now! 🚀`;
}

export function createDeadlineAlertMessage({
  clientName,
  videoTitle,
  editorName,
  editDeadline,
}: {
  clientName: string;
  videoTitle: string;
  editorName: string;
  editDeadline: string;
}): string {
  return `⚠️ *WEGROW DEADLINE REMINDER*\n\nHi ${editorName}!\nFriendly reminder that edit deadline is approaching:\n📌 *Client:* ${clientName}\n🎥 *Video:* ${videoTitle}\n⏰ *Deadline:* ${editDeadline}\n\nPlease submit your final cut link soon!`;
}
