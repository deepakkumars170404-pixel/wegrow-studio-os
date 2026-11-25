import type { UserRole, VideoPriority, VideoStage } from "./db";

export const VIDEO_STAGES: {
  key: VideoStage;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    key: "script",
    label: "Script & Idea",
    shortLabel: "Script",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  {
    key: "shoot_done",
    label: "Shoot Done",
    shortLabel: "Shot",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  {
    key: "raw_uploaded",
    label: "Raw Uploaded",
    shortLabel: "Raw Ready",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  {
    key: "editing",
    label: "Editing In-Progress",
    shortLabel: "Editing",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    key: "internal_review",
    label: "Internal Review",
    shortLabel: "Review",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotClass: "bg-indigo-500",
  },
  {
    key: "client_approval",
    label: "Client Approval",
    shortLabel: "Approval",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    dotClass: "bg-purple-500",
  },
  {
    key: "scheduled",
    label: "Approved & Scheduled",
    shortLabel: "Scheduled",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    dotClass: "bg-teal-500",
  },
  {
    key: "posted",
    label: "Posted Live",
    shortLabel: "Posted",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
];

export const STAGE_MAP = Object.fromEntries(
  VIDEO_STAGES.map((s) => [s.key, s])
) as Record<VideoStage, (typeof VIDEO_STAGES)[number]>;

export const PRIORITY_META: Record<
  VideoPriority,
  { label: string; badgeClass: string }
> = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
  },
  high: {
    label: "High",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
  },
  normal: {
    label: "Normal",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export const ROLE_META: Record<
  UserRole,
  { label: string; badgeClass: string; description: string }
> = {
  owner: {
    label: "Owner",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    description: "Full organization control, staff management, clients & analytics",
  },
  admin: {
    label: "Admin",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Manage staff, clients, video assignments & operations",
  },
  manager: {
    label: "Manager",
    badgeClass: "bg-cyan-100 text-cyan-800 border-cyan-200",
    description: "Assign videos, set deadlines, review edits & manage clients",
  },
  editor: {
    label: "Video Editor",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Edit assigned videos, update stage & submit final cut links",
  },
  content_writer: {
    label: "Content Creator",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200",
    description: "Create video scripts, hooks & track shoot status",
  },
  ai_content_creator: {
    label: "AI Content Creator",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Generate AI videos, creatives & manage AI production pipeline",
  },
  cameraman: {
    label: "Cameraman",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
    description: "Handle video shoots, mark Shoot Done & upload raw footage",
  },
};

export const CONTENT_TYPES = ["Reel", "YouTube", "Ad Creative", "Shorts", "Story"] as const;

export const WEGROW_TEAMS = ["BSchool", "SkillCampus", "Jobz"] as const;
export type WegrowTeam = (typeof WEGROW_TEAMS)[number];

export const TEAM_META: Record<
  WegrowTeam,
  { label: string; badgeClass: string; iconLabel: string; leadName: string; leadRole: string }
> = {
  BSchool: {
    label: "BSchool",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    iconLabel: "🎓 BSchool",
    leadName: "Rajavalli",
    leadRole: "Content Creator",
  },
  SkillCampus: {
    label: "SkillCampus",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    iconLabel: "💻 SkillCampus",
    leadName: "Rajkumar",
    leadRole: "Content Creator",
  },
  Jobz: {
    label: "Jobz",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconLabel: "💼 Jobz",
    leadName: "Gopinath",
    leadRole: "Content Writer",
  },
};

export function formatDeadline(value: string): string {
  if (!value) return "No deadline";
  if (value.includes("T")) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }
  const dt = new Date(`${value}T00:00:00`);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  return value;
}

export function isDeadlineOverdue(value: string, stage: string): boolean {
  if (!value || stage === "posted") return false;
  const target = value.includes("T") ? new Date(value) : new Date(`${value}T23:59:59`);
  return target.getTime() < Date.now();
}

export function isDeadlineDueTodayOrOverdue(value: string, stage: string): boolean {
  if (!value || stage === "posted") return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  const datePart = value.slice(0, 10);
  return datePart <= todayStr;
}
