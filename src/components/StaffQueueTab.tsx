"use client";

import React, { useState, useEffect } from "react";
import {
  Video,
  Film,
  Camera,
  FileText,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  Upload,
  Plus,
  Send,
  RefreshCw,
  Globe,
  Share2,
  Copy,
  MessageSquare,
  X,
  Check,
} from "lucide-react";
import {
  formatDeadline,
  isDeadlineOverdue,
  STAGE_MAP,
  WEGROW_TEAMS,
  TEAM_META,
  type WegrowTeam,
} from "@/lib/constants";
import type { VideoItem, StaffMember } from "@/types/portal";
import type { VideoStage } from "@/lib/db";

interface StaffQueueTabProps {
  user: StaffMember;
  videos: VideoItem[];
  onOpenVideo: (video: VideoItem) => void;
  onStageChange: (videoId: number, newStage: VideoStage) => void;
  onRefresh: () => void;
  onNewVideo: () => void;
}

export default function StaffQueueTab({
  user,
  videos,
  onOpenVideo,
  onStageChange,
  onRefresh,
  onNewVideo,
}: StaffQueueTabProps) {
  const [selectedTeam, setSelectedTeam] = useState<"all" | WegrowTeam>("all");
  const [filter, setFilter] = useState<"active" | "all" | "completed">("active");
  const [promptVideo, setPromptVideo] = useState<{
    id: number;
    action: "submit_cut" | "submit_raw" | "submit_live" | "request_revision";
    title: string;
    isRevision?: boolean;
    existingNotes?: string;
  } | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Revision popup alert state for Rahul (editor)
  const [activeRevisionAlert, setActiveRevisionAlert] = useState<VideoItem | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<number[]>([]);
  // Shoot & Raw Done alert state for Rahul (editor)
  const [activeShootAlert, setActiveShootAlert] = useState<VideoItem | null>(null);
  const [dismissedShootIds, setDismissedShootIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState("");

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  }

  const isEditor = user.role === "editor";
  const isCameraman = user.role === "cameraman";
  const isWriter = user.role === "content_writer";
  const isAiCreator = user.role === "ai_content_creator";
  const isPublisher =
    user.email.toLowerCase().includes("mareeswaran") ||
    user.email.toLowerCase().includes("millar");
  const isSkillCampusLead = user.email.toLowerCase().includes("rajkumar");
  const isJobzLead = user.email.toLowerCase().includes("gopinath");
  const isLeadOrManager =
    user.role === "manager" ||
    user.role === "admin" ||
    user.role === "owner" ||
    isWriter ||
    isAiCreator ||
    isSkillCampusLead ||
    isJobzLead;

  // Filter videos for the current staff member
  const roleFilteredVideos = videos.filter((v) => {
    if (isEditor) {
      // Editor sees assigned videos (or unassigned editing tasks) that are past script stage OR have raw footage ready
      const isAssignedToMeOrOpen = v.assigned_editor_id === user.id || !v.assigned_editor_id;
      const isReadyForEditing = v.stage !== "script" || Boolean(v.raw_link && v.raw_link.trim());
      return isAssignedToMeOrOpen && isReadyForEditing;
    }
    if (isCameraman) {
      return v.assigned_cameraman_id === user.id;
    }
    if (isPublisher) {
      // Publishers see approved videos ready for publishing OR assigned tasks
      return (
        ["scheduled", "client_approval", "internal_review", "posted"].includes(v.stage) ||
        v.assigned_writer_id === user.id ||
        v.assigned_editor_id === user.id
      );
    }
    if (isSkillCampusLead) {
      return (v.team || "BSchool") === "SkillCampus" || v.assigned_writer_id === user.id;
    }
    if (isJobzLead) {
      return (v.team || "BSchool") === "Jobz" || v.assigned_writer_id === user.id;
    }
    if (isWriter || isAiCreator) {
      return v.assigned_writer_id === user.id || v.assigned_editor_id === user.id;
    }
    return true;
  });

  // Apply 3-team filter
  const teamFilteredVideos =
    selectedTeam === "all"
      ? roleFilteredVideos
      : roleFilteredVideos.filter((v) => (v.team || "BSchool") === selectedTeam);

  const activeTasks = teamFilteredVideos.filter((v) => v.stage !== "posted");
  const completedTasks = teamFilteredVideos.filter((v) => v.stage === "posted");
  const clientApprovedVideos = teamFilteredVideos.filter(
    (v) => v.stage === "scheduled" && v.notes && v.notes.includes("[Client Approved")
  );

  // Videos assigned to Rahul that have changes requested (Internal or Client)
  const revisionVideos = teamFilteredVideos.filter(
    (v) =>
      v.stage === "editing" &&
      v.notes &&
      (v.notes.includes("[Internal Revision") || v.notes.includes("[Client Revision"))
  );

  // Trigger popup alert for Rahul when he opens his workspace and has revision requests
  useEffect(() => {
    if (isEditor && revisionVideos.length > 0) {
      const nextAlert = revisionVideos.find((v) => !dismissedAlertIds.includes(v.id));
      if (nextAlert && (!activeRevisionAlert || activeRevisionAlert.id !== nextAlert.id)) {
        setActiveRevisionAlert(nextAlert);
      }
    }
  }, [isEditor, revisionVideos, dismissedAlertIds, activeRevisionAlert]);

  // Videos assigned to Rahul where Pandeeswaran marked Shoot & Raw Done OR raw footage is ready (SSD/SD Card/Drive)
  const shootDoneAlertVideos = teamFilteredVideos.filter(
    (v) =>
      v.stage === "editing" &&
      ((v.notes && v.notes.includes("Shoot & Raw Footage Completed")) ||
        (v.raw_link && !v.raw_link.startsWith("http")))
  );

  // Trigger popup alert for Rahul when new raw footage arrives from Pandeeswaran
  useEffect(() => {
    if (isEditor && shootDoneAlertVideos.length > 0) {
      const nextShoot = shootDoneAlertVideos.find((v) => !dismissedShootIds.includes(v.id));
      if (nextShoot && (!activeShootAlert || activeShootAlert.id !== nextShoot.id)) {
        setActiveShootAlert(nextShoot);
      }
    }
  }, [isEditor, shootDoneAlertVideos, dismissedShootIds, activeShootAlert]);

  function handleShootAndRawDone(video: VideoItem) {
    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const rawAlertMsg = `🎬 [Pandeeswaran on ${nowStr}]: Shoot & Raw Footage Completed! Handed over to Rahul for editing.`;
    const updatedNotes = video.notes ? `${rawAlertMsg}\n${video.notes}` : rawAlertMsg;
    const defaultRaw = video.raw_link || "Raw Footage Ready (Handed over directly / SSD)";

    // 0ms instant optimistic update
    onStageChange(video.id, "editing");
    showToast(`✓ Shoot & Raw Done for "${video.title}"! Task sent directly to Rahul.`);

    // Background DB sync
    fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "editing",
        raw_link: defaultRaw,
        notes: updatedNotes,
      }),
    }).catch((err) => console.error("Shoot & raw done update error:", err));
  }

  const displayedVideos = teamFilteredVideos.filter((v) => {
    if (filter === "active") return v.stage !== "posted";
    if (filter === "completed") return v.stage === "posted";
    return true;
  });

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptVideo) return;
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      if (promptVideo.action === "submit_cut") {
        payload.final_link = linkInput.trim();
        payload.stage = "internal_review";
        if (promptVideo.isRevision) {
          const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
          const existing = promptVideo.existingNotes || "";
          payload.notes = `🎬 [Revised Cut Submitted by Rahul on ${nowStr}]\n${existing}`.trim();
        }
      } else if (promptVideo.action === "submit_raw") {
        const val = linkInput.trim() || "Raw Footage Ready (Handed over directly / SSD)";
        const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        payload.raw_link = val;
        payload.stage = "editing";
        payload.notes = `🎬 [Pandeeswaran on ${nowStr}]: Shoot & Raw Footage Completed! Handed over to Rahul for editing.\n${promptVideo.existingNotes || ""}`.trim();
        onStageChange(promptVideo.id, "editing");
        showToast(`✓ Shoot & Raw Done! Task sent directly to Rahul.`);
      } else if (promptVideo.action === "submit_live") {
        payload.live_url = linkInput.trim();
        payload.stage = "posted";
      } else if (promptVideo.action === "request_revision") {
        const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const existing = promptVideo.existingNotes || "";
        payload.notes = `⚠️ [Internal Revision by ${user.name} on ${nowStr}]: ${linkInput.trim()}\n${existing}`.trim();
        payload.stage = "editing";
      }

      await fetch(`/api/videos/${promptVideo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setPromptVideo(null);
      setLinkInput("");
      onRefresh();
    } finally {
      setSubmitting(false);
    }
  }

  const headerTitle = isPublisher
    ? "🚀 Publishing & Social Media Operations"
    : isSkillCampusLead
    ? "💻 SkillCampus Content & Production Lead"
    : isJobzLead
    ? "💼 Jobz Content & Production Lead"
    : isEditor
    ? "🎬 Video Editing Workspace"
    : isCameraman
    ? "🎥 Cameraman Shoot Operations"
    : isAiCreator
    ? "🤖 AI Content Queue"
    : "📝 Content & Scripts Queue";

  const headerSubtitle = isPublisher
    ? "Approved videos ready to publish across BSchool, SkillCampus, and Jobz. Post live and record URLs."
    : isSkillCampusLead
    ? "Manage scripts, review Rahul's edits, approve final cuts, and send to Mareeswaran / Millar for publishing."
    : isJobzLead
    ? "Manage scripts, review Rahul's edits, approve final cuts, and send to Mareeswaran / Millar for publishing."
    : isEditor
    ? "Videos ready to edit after camera shoot across all 3 teams. Keep edit deadlines on track!"
    : isCameraman
    ? "Shooting schedule across BSchool, SkillCampus, and Jobz. Mark shoot done when recording finishes."
    : "Create scripts, hooks, and track video production progress.";

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Role Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: user.avatar_color }}
          >
            {isPublisher ? (
              <Globe className="w-6 h-6" />
            ) : isEditor ? (
              <Film className="w-6 h-6" />
            ) : isCameraman ? (
              <Camera className="w-6 h-6" />
            ) : isAiCreator ? (
              <Video className="w-6 h-6" />
            ) : (
              <FileText className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">{headerTitle}</h1>
            <p className="text-xs text-slate-500">{headerSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLeadOrManager && (
            <button
              onClick={onNewVideo}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Video / Script
            </button>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === "active"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active ({activeTasks.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === "completed"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Completed ({completedTasks.length})
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({teamFilteredVideos.length})
            </button>
          </div>
        </div>
      </div>

      {/* 3-Team Brand Filter Tabs in Staff Queue */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setSelectedTeam("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            selectedTeam === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
          }`}
        >
          <span>🌐 All Teams</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedTeam === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {roleFilteredVideos.length}
          </span>
        </button>

        {WEGROW_TEAMS.map((t) => {
          const isSelected = selectedTeam === t;
          const count = roleFilteredVideos.filter((v) => (v.team || "BSchool") === t).length;
          const meta = TEAM_META[t];
          return (
            <button
              key={t}
              onClick={() => setSelectedTeam(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs ring-2 ring-indigo-500/20"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              <span>{meta.iconLabel}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Client Approval Live Notification Banner */}
      {clientApprovedVideos.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>{clientApprovedVideos.length} Video{clientApprovedVideos.length > 1 ? "s" : ""} Approved by Client!</span>
                <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  Ready to Post Live
                </span>
              </h4>
              <p className="text-xs text-emerald-100 mt-0.5">
                Client approved the final cut! Scheduled for Mareeswaran & Millar to publish on Instagram / YouTube.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white text-emerald-900 px-3 py-1 rounded-xl shadow-2xs">
            {clientApprovedVideos.map((v) => v.client_name).slice(0, 3).join(", ")}
          </span>
        </div>
      )}

      {/* Editor Alert: New Shoot & Raw Ready from Pandeeswaran */}
      {isEditor && shootDoneAlertVideos.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎬</span>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>{shootDoneAlertVideos.length} New Raw Footage Ready from Pandeeswaran!</span>
                <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  Ready for Editing
                </span>
              </h4>
              <p className="text-xs text-blue-100 mt-0.5">
                Pandeeswaran completed shoot & raw handover. You can start cutting the video now!
              </p>
            </div>
          </div>
          <span className="text-xs font-bold bg-white text-indigo-900 px-3 py-1.5 rounded-xl shadow-2xs">
            {shootDoneAlertVideos.map((v) => v.title).slice(0, 2).join(", ")}
          </span>
        </div>
      )}

      {/* Task Cards List */}
      <div className="space-y-3">
        {displayedVideos.map((video) => {
          const stageMeta = STAGE_MAP[video.stage];
          const isOverdue = isDeadlineOverdue(video.edit_deadline, video.stage);

          return (
            <div
              key={video.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 transition space-y-4"
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {video.client_name}
                    </span>
                    {video.team && TEAM_META[video.team as WegrowTeam] && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${
                          TEAM_META[video.team as WegrowTeam].badgeClass
                        }`}
                      >
                        {TEAM_META[video.team as WegrowTeam].iconLabel}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {video.content_type}
                    </span>
                    {video.priority === "urgent" && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    )}
                  </div>
                  <h3
                    onClick={() => onOpenVideo(video)}
                    className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition cursor-pointer leading-snug"
                  >
                    {video.title}
                  </h3>
                </div>

                {/* Stage Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl border ${stageMeta.badgeClass}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${stageMeta.dotClass}`} />
                    {stageMeta.label}
                  </span>
                </div>
              </div>

              {/* Deadline & Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Edit Deadline (Date & Time):
                  </span>
                  <span
                    className={`font-bold flex items-center gap-1.5 mt-0.5 ${
                      isOverdue ? "text-rose-600" : "text-slate-800"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {formatDeadline(video.edit_deadline)}
                    {isOverdue && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-semibold">
                        Overdue
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Posting Date:
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {video.posting_date || "Not scheduled yet"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Assigned Crew:
                  </span>
                  <span className="text-slate-700 font-medium block mt-0.5 truncate">
                    {video.cameraman_name ? `Cam: ${video.cameraman_name}` : "Cam: Pandeeswaran"}
                    {" • "}
                    {video.editor_name ? `Ed: ${video.editor_name}` : "Ed: Rahul"}
                  </span>
                </div>
              </div>

              {/* Prominent Client Approval Message Box */}
              {video.notes && video.notes.includes("[Client Approved") && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
                  <span className="text-base shrink-0">🎉</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                        Client Approved!
                      </span>
                      <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-md">
                        {video.team} • Ready for Mareeswaran / Millar to Post
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-1 font-medium leading-relaxed">
                      {video.notes.split("\n").find((line) => line.includes("[Client Approved"))}
                    </p>
                  </div>
                </div>
              )}

              {/* Prominent Client Revision Request Box */}
              {video.notes && video.notes.includes("[Client Revision Request") && video.stage === "editing" && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wide block">
                      Client Requested Revision Changes:
                    </span>
                    <p className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">
                      {video.notes.split("\n").find((line) => line.includes("[Client Revision Request"))}
                    </p>
                  </div>
                </div>
              )}

              {/* General Notes */}
              {video.notes &&
                !video.notes.includes("[Client Approved") &&
                !video.notes.includes("[Client Revision Request") && (
                <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                  <strong className="not-italic text-amber-900 font-semibold mr-1">
                    Notes / Hook:
                  </strong>
                  {video.notes}
                </p>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                {/* Links */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {video.raw_link ? (
                    video.raw_link.startsWith("http") ? (
                      <a
                        href={video.raw_link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Raw Footage
                      </a>
                    ) : (
                      <span className="font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs shadow-2xs">
                        <span>📁 Footage Location:</span>
                        <span className="text-amber-950 font-black">{video.raw_link}</span>
                      </span>
                    )
                  ) : (
                    <span className="text-slate-400">No raw link</span>
                  )}

                  {video.final_link && (
                    <a
                      href={video.final_link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Final Cut
                    </a>
                  )}

                  {video.review_token && (
                    <div className="flex items-center gap-1 bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-0.5">
                      <a
                        href={`/review/${video.review_token}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Client Approval Portal"
                        className="px-2 py-0.5 text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 text-[11px] hover:underline"
                      >
                        <Share2 className="w-3 h-3" />
                        Client Portal
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/review/${video.review_token}`;
                          navigator.clipboard.writeText(url);
                          alert(`Client Review Link Copied!\n\n${url}`);
                        }}
                        title="Copy Client Review Link"
                        className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {video.live_url && (
                    <a
                      href={video.live_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Live Post URL
                    </a>
                  )}
                </div>

                {/* Role Specific Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* CAMERAMAN ACTIONS */}
                  {isCameraman && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleShootAndRawDone(video)}
                        className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                        title="Mark shoot complete and notify Rahul with raw footage handover"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        Shoot & Raw Done
                      </button>
                      <button
                        onClick={() => {
                          setPromptVideo({
                            id: video.id,
                            action: "submit_raw",
                            title: video.title,
                            existingNotes: video.notes || "",
                          });
                          setLinkInput(video.raw_link || "");
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        {video.raw_link ? "Update Raw Link / Storage" : "Attach Drive Link (Optional)"}
                      </button>
                    </div>
                  )}

                  {/* EDITOR ACTIONS */}
                  {isEditor && (
                    <>
                      {(video.stage === "shoot_done" ||
                        video.stage === "raw_uploaded" ||
                        (video.stage === "script" && video.raw_link)) && (
                        <button
                          onClick={() => onStageChange(video.id, "editing")}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start Editing
                        </button>
                      )}

                      {video.stage === "editing" && (
                        <button
                          onClick={() => {
                            const isRev = Boolean(
                              video.notes &&
                                (video.notes.includes("[Internal Revision") ||
                                  video.notes.includes("[Client Revision"))
                            );
                            setPromptVideo({
                              id: video.id,
                              action: "submit_cut",
                              title: video.title,
                              isRevision: isRev,
                              existingNotes: video.notes || "",
                            });
                            setLinkInput(video.final_link || "");
                          }}
                          className={`px-3.5 py-1.5 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer ${
                            video.notes &&
                            (video.notes.includes("[Internal Revision") ||
                              video.notes.includes("[Client Revision"))
                              ? "bg-rose-600 hover:bg-rose-700 animate-pulse"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {video.notes &&
                          (video.notes.includes("[Internal Revision") ||
                            video.notes.includes("[Client Revision"))
                            ? "Submit Revised Cut"
                            : "Submit Final Cut"}
                        </button>
                      )}

                      {video.stage === "internal_review" && (
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted for Lead Review
                        </span>
                      )}
                    </>
                  )}

                  {/* CONTENT WRITER / TEAM LEAD / MANAGER APPROVAL ACTIONS */}
                  {isLeadOrManager && (
                    <>
                      {video.stage === "script" && (
                        <button
                          onClick={() => onStageChange(video.id, "shoot_done")}
                          className="px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-200 cursor-pointer"
                        >
                          Script Ready for Shoot
                        </button>
                      )}

                      {video.stage === "internal_review" && (
                        <>
                          <button
                            onClick={() => onStageChange(video.id, "client_approval")}
                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                            title="Approve cut and advance to Client Approval"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Internal Approve ➔ Client Review
                          </button>
                          <button
                            onClick={() => onStageChange(video.id, "scheduled")}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 flex items-center gap-1 cursor-pointer transition"
                            title="Directly approve and mark ready to post"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Direct Approve ➔ Post
                          </button>
                          <button
                            onClick={() => {
                              setPromptVideo({
                                id: video.id,
                                action: "request_revision",
                                title: video.title,
                                existingNotes: video.notes || "",
                              });
                              setLinkInput("");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1 cursor-pointer transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Request Revision
                          </button>
                        </>
                      )}

                      {video.stage === "client_approval" && (
                        <>
                          <button
                            onClick={() => onStageChange(video.id, "scheduled")}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Client Approved ➔ Post
                          </button>
                          <button
                            onClick={() => {
                              setPromptVideo({
                                id: video.id,
                                action: "request_revision",
                                title: video.title,
                                existingNotes: video.notes || "",
                              });
                              setLinkInput("");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Client Changes
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {/* PUBLISHER ACTIONS (Mareeswaran / Millar) */}
                  {isPublisher && (
                    <>
                      {["scheduled", "client_approval", "internal_review"].includes(video.stage) && (
                        <button
                          onClick={() => {
                            setPromptVideo({
                              id: video.id,
                              action: "submit_live",
                              title: video.title,
                            });
                            setLinkInput(video.live_url || "");
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          Mark as Live / Submit URL
                        </button>
                      )}
                    </>
                  )}

                  <button
                    onClick={() => onOpenVideo(video)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {displayedVideos.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No videos in this queue</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isPublisher
                ? "No approved videos waiting to be published right now. Once team leads approve final cuts, they will appear here for live posting!"
                : isEditor
                ? "You don't have any pending videos ready for editing. When Pandeeswaran marks a shoot done, it will appear here automatically."
                : isCameraman
                ? "No pending shoots assigned to you right now. Team leads will assign upcoming client shoots here."
                : "No videos found in this queue."}
            </p>
          </div>
        )}
      </div>

      {/* Dynamic Link & Action Modal */}
      {promptVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {promptVideo.action === "submit_cut"
                  ? "Submit Final Cut Link"
                  : promptVideo.action === "submit_raw"
                  ? "Upload Raw Footage Link"
                  : promptVideo.action === "submit_live"
                  ? "Mark Video as Live & Save URL"
                  : "Request Revision from Rahul"}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {promptVideo.title}
              </p>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {promptVideo.action === "submit_cut"
                    ? "Google Drive Final Cut Link *"
                    : promptVideo.action === "submit_raw"
                    ? "Raw Footage Drive Link or Storage Location (Optional)"
                    : promptVideo.action === "submit_live"
                    ? "Live Post URL (Instagram Reel / YouTube Short) *"
                    : "Revision Feedback & Changes Required *"}
                </label>
                {promptVideo.action === "request_revision" ? (
                  <textarea
                    required
                    rows={3}
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="Specify exact changes needed: e.g., trim intro hook, fix typography, adjust music volume..."
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : promptVideo.action === "submit_raw" ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="Paste Drive link, or select handover location below..."
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Quick presets:</span>
                      <button
                        type="button"
                        onClick={() => setLinkInput("💾 Hard Disk / SSD Handover")}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      >
                        💾 Hard Disk / SSD
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkInput("💳 SD Card Handover")}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      >
                        💳 SD Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkInput("💻 Studio Local PC")}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      >
                        💻 Studio Local PC
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type="url"
                    required
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder={
                      promptVideo.action === "submit_live"
                        ? "https://www.instagram.com/reel/..."
                        : "https://drive.google.com/..."
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPromptVideo(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {submitting
                    ? "Saving..."
                    : promptVideo.action === "submit_live"
                    ? "Publish & Mark Live"
                    : promptVideo.action === "request_revision"
                    ? "Send Revision Feedback"
                    : "Save & Update Stage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rahul Revision Alert Popup Modal */}
      {isEditor && activeRevisionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border-2 border-rose-300 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 text-xl shadow-xs">
                  🚨
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Revision Requested
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {activeRevisionAlert.team}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Attention Rahul: Changes Needed!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDismissedAlertIds((prev) => [...prev, activeRevisionAlert.id]);
                  setActiveRevisionAlert(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Video Details:
              </p>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {activeRevisionAlert.title}
              </p>
              <p className="text-xs text-indigo-700 font-semibold">
                Client: {activeRevisionAlert.client_name} • Format: {activeRevisionAlert.content_type}
              </p>
            </div>

            {/* Changes Required Box */}
            <div className="bg-rose-50/90 border-2 border-rose-200 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-900 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {activeRevisionAlert.notes?.includes("[Client Revision")
                    ? "Client Requested Changes:"
                    : "Team Lead Requested Changes:"}
                </span>
              </div>
              <p className="text-xs text-rose-950 font-medium whitespace-pre-wrap leading-relaxed bg-white/80 p-3 rounded-xl border border-rose-100">
                {activeRevisionAlert.notes
                  ?.split("\n")
                  .find(
                    (line) =>
                      line.includes("[Internal Revision") || line.includes("[Client Revision")
                  ) || activeRevisionAlert.notes}
              </p>
            </div>

            {activeRevisionAlert.final_link && (
              <div className="text-xs flex items-center justify-between p-2.5 bg-slate-100 rounded-xl">
                <span className="text-slate-500 font-medium">Previous Cut:</span>
                <a
                  href={activeRevisionAlert.final_link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Previous Google Drive Cut
                </a>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDismissedAlertIds((prev) => [...prev, activeRevisionAlert.id]);
                  setActiveRevisionAlert(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Acknowledge & Start Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetVideo = activeRevisionAlert;
                  setDismissedAlertIds((prev) => [...prev, targetVideo.id]);
                  setActiveRevisionAlert(null);
                  setPromptVideo({
                    id: targetVideo.id,
                    action: "submit_cut",
                    title: targetVideo.title,
                    isRevision: true,
                    existingNotes: targetVideo.notes || "",
                  });
                  setLinkInput(targetVideo.final_link || "");
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Submit Revised Cut Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rahul New Shoot & Raw Ready Alert Popup Modal */}
      {isEditor && activeShootAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border-2 border-emerald-300 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 text-2xl shadow-xs">
                  🎬
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Shoot & Raw Ready
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {activeShootAlert.team}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    New Footage from Pandeeswaran!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDismissedShootIds((prev) => [...prev, activeShootAlert.id]);
                  setActiveShootAlert(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Video Details:
              </p>
              <p className="text-sm font-bold text-slate-900 leading-snug">
                {activeShootAlert.title}
              </p>
              <p className="text-xs text-indigo-700 font-semibold">
                Client: {activeShootAlert.client_name} • Format: {activeShootAlert.content_type}
              </p>
            </div>

            {/* Shoot Handover Details Box */}
            <div className="bg-emerald-50/90 border-2 border-emerald-200 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cameraman Handover Status:</span>
              </div>
              <p className="text-xs text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-100">
                {activeShootAlert.notes
                  ?.split("\n")
                  .find((line) => line.includes("Shoot & Raw Footage Completed")) ||
                  "Shoot & Raw footage completed by Pandeeswaran and handed over for editing."}
              </p>
            </div>

            {activeShootAlert.raw_link && (
              <div className="text-xs flex items-center justify-between p-2.5 bg-slate-100 rounded-xl">
                <span className="text-slate-500 font-medium">Raw Footage / Storage:</span>
                {activeShootAlert.raw_link.startsWith("http") ? (
                  <a
                    href={activeShootAlert.raw_link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Google Drive Raw Footage
                  </a>
                ) : (
                  <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                    💾 {activeShootAlert.raw_link}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDismissedShootIds((prev) => [...prev, activeShootAlert.id]);
                  setActiveShootAlert(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetVideo = activeShootAlert;
                  setDismissedShootIds((prev) => [...prev, targetVideo.id]);
                  setActiveShootAlert(null);
                  onStageChange(targetVideo.id, "editing");
                  showToast(`Started editing on "${targetVideo.title}"!`);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-white" />
                Got it, Start Editing Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
