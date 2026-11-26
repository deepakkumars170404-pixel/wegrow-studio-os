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
}: WhatsAppSendParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
  // WhatsApp external dispatch disabled per user request for maximum speed & responsiveness
  return { success: true };
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

export function createClientApprovedAlertMessage({
  clientName,
  videoTitle,
  staffName,
  teamName,
  clientComment,
  finalLink,
}: {
  clientName: string;
  videoTitle: string;
  staffName: string;
  teamName: string;
  clientComment?: string;
  finalLink?: string;
}): string {
  return `🎉 *CLIENT APPROVAL ALERT - WEGROW OS*\n\nHi ${staffName}!\nClient *${clientName}* has officially APPROVED the video!\n\n📌 *Team / Brand:* ${teamName}\n🎥 *Video:* ${videoTitle}\n${
    clientComment ? `💬 *Client Feedback:* "${clientComment}"\n` : ""
  }${
    finalLink ? `🔗 *Final Cut:* ${finalLink}\n` : ""
  }\n🚀 *Next Action:* Scheduled for live posting on Instagram / YouTube by Mareeswaran & Millar!`;
}

export function createClientRevisionAlertMessage({
  clientName,
  videoTitle,
  editorName,
  teamName,
  revisionFeedback,
}: {
  clientName: string;
  videoTitle: string;
  editorName: string;
  teamName: string;
  revisionFeedback: string;
}): string {
  return `⚠️ *CLIENT REVISION REQUEST - WEGROW OS*\n\nHi ${editorName}!\nClient *${clientName}* has requested revision changes for:\n\n📌 *Team / Brand:* ${teamName}\n🎥 *Video:* ${videoTitle}\n💬 *Changes Required:*\n${revisionFeedback}\n\nPlease update the edit and submit the revised cut!`;
}
