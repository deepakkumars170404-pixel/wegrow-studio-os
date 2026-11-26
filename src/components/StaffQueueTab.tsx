"use client";

import React, { useState } from "react";
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
  } | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditor = user.role === "editor";
  const isCameraman = user.role === "cameraman";
  const isWriter = user.role === "content_writer";
  const isAiCreator = user.role === "ai_content_creator";
  const isPublisher =
    user.email.toLowerCase().includes("mareeswaran") ||
    user.email.toLowerCase().includes("millar");
  const isSkillCampusLead = user.email.toLowerCase().includes("rajkumar");
  const isJobzLead = user.email.toLowerCase().includes("gopinath");

  // Filter videos for the current staff member
  const roleFilteredVideos = videos.filter((v) => {
    if (isEditor) {
      // Editor must only see assigned videos that are past the script stage
      return v.assigned_editor_id === user.id && v.stage !== "script";
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
      } else if (promptVideo.action === "submit_raw") {
        payload.raw_link = linkInput.trim();
        payload.stage = "raw_uploaded";
      } else if (promptVideo.action === "submit_live") {
        payload.live_url = linkInput.trim();
        payload.stage = "posted";
      } else if (promptVideo.action === "request_revision") {
        payload.notes = linkInput.trim();
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
          {(isWriter || isAiCreator) && (
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

              {/* Notes if available */}
              {video.notes && (
                <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                  <strong className="not-italic text-amber-900 font-semibold mr-1">
                    Notes / Revisions:
                  </strong>
                  {video.notes}
                </p>
              )}

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                {/* Links */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {video.raw_link ? (
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
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `🎬 *Video Ready for Review - WEGROW Studio*\n\nHi *${video.client_name}* Team!\nYour new *${video.content_type}* video cut: *"${video.title}"* is ready for your review.\n\n👉 Please click here to watch and approve in 1-click:\n${window.location.origin}/review/${video.review_token}\n\nThank you!\n- WEGROW Digital Team`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Share on WhatsApp to Client"
                        className="p-1 hover:bg-emerald-100 text-emerald-700 rounded cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
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
                    <>
                      {video.stage === "script" ? (
                        <button
                          onClick={() => onStageChange(video.id, "shoot_done")}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark Shoot Done
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setPromptVideo({
                              id: video.id,
                              action: "submit_raw",
                              title: video.title,
                            });
                            setLinkInput(video.raw_link || "");
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl flex items-center gap-1.5 border border-sky-200 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {video.raw_link ? "Update Raw Link" : "Add Raw Link"}
                        </button>
                      )}
                    </>
                  )}

                  {/* EDITOR ACTIONS */}
                  {isEditor && (
                    <>
                      {(video.stage === "shoot_done" || video.stage === "raw_uploaded") && (
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
                            setPromptVideo({
                              id: video.id,
                              action: "submit_cut",
                              title: video.title,
                            });
                            setLinkInput(video.final_link || "");
                          }}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Submit Final Cut
                        </button>
                      )}

                      {video.stage === "internal_review" && (
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Submitted for Lead Review
                        </span>
                      )}
                    </>
                  )}

                  {/* CONTENT WRITER / TEAM LEAD APPROVAL ACTIONS */}
                  {(isWriter || isAiCreator) && (
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
                            onClick={() => onStageChange(video.id, "scheduled")}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve for Publishing
                          </button>
                          <button
                            onClick={() => onStageChange(video.id, "client_approval")}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Client Approval
                          </button>
                          <button
                            onClick={() => {
                              setPromptVideo({
                                id: video.id,
                                action: "request_revision",
                                title: video.title,
                              });
                              setLinkInput(video.notes || "");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Revision
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
                              });
                              setLinkInput(video.notes || "");
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
                    ? "Google Drive Raw Footage Link *"
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
    </div>
  );
}
