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
} from "lucide-react";
import { formatDeadline, isDeadlineOverdue, STAGE_MAP } from "@/lib/constants";
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
  const [filter, setFilter] = useState<"active" | "all" | "completed">("active");
  const [promptVideo, setPromptVideo] = useState<{
    id: number;
    action: "submit_cut" | "submit_raw";
    title: string;
  } | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditor = user.role === "editor";
  const isCameraman = user.role === "cameraman";
  const isWriter = user.role === "content_writer";
  const isAiCreator = user.role === "ai_content_creator";

  // Filter videos for the current staff member
  const roleFilteredVideos = videos.filter((v) => {
    if (isEditor) {
      // Editor must only see assigned videos that are past the script stage
      return v.assigned_editor_id === user.id && v.stage !== "script";
    }
    if (isCameraman) {
      return v.assigned_cameraman_id === user.id;
    }
    if (isWriter || isAiCreator) {
      return v.assigned_writer_id === user.id || v.assigned_editor_id === user.id;
    }
    return true;
  });

  const activeTasks = roleFilteredVideos.filter((v) => v.stage !== "posted");
  const completedTasks = roleFilteredVideos.filter((v) => v.stage === "posted");

  const displayedVideos = roleFilteredVideos.filter((v) => {
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

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Role Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: user.avatar_color }}
          >
            {isEditor ? (
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
            <h1 className="text-base font-bold text-slate-900">
              {isEditor
                ? "My Editing Workspace"
                : isCameraman
                ? "My Shoot Schedule"
                : isAiCreator
                ? "My AI Content Queue"
                : "My Content & Scripts Queue"}
            </h1>
            <p className="text-xs text-slate-500">
              {isEditor
                ? "Videos ready to edit after camera shoot. Keep edit deadlines on track!"
                : isCameraman
                ? "Videos assigned for shoot. Mark shoot done when recording finishes."
                : "Create scripts, hooks, and track video production progress."}
            </p>
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
              All ({roleFilteredVideos.length})
            </button>
          </div>
        </div>
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {video.client_name}
                    </span>
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
                    Assigned Team:
                  </span>
                  <span className="text-slate-700 font-medium block mt-0.5 truncate">
                    {video.cameraman_name ? `Cam: ${video.cameraman_name}` : "Cam: Unassigned"}
                    {" • "}
                    {video.editor_name ? `Ed: ${video.editor_name}` : "Ed: Unassigned"}
                  </span>
                </div>
              </div>

              {/* Notes if available */}
              {video.notes && (
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
                <div className="flex items-center gap-3 text-xs">
                  {video.raw_link ? (
                    <a
                      href={video.raw_link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Raw Footage
                    </a>
                  ) : (
                    <span className="text-slate-400">No raw footage link</span>
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
                </div>

                {/* Role Specific Quick Action */}
                <div className="flex items-center gap-2">
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
                          <Clock className="w-3 h-3" /> Submitted for Review
                        </span>
                      )}
                    </>
                  )}

                  {/* CONTENT WRITER / AI CREATOR ACTIONS */}
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
              {isEditor
                ? "You don't have any pending videos ready for editing. When Pandeeswaran marks a shoot done, it will appear here automatically."
                : isCameraman
                ? "No pending shoots assigned to you right now. Rajavalli will assign upcoming client shoots here."
                : "No videos found in this queue."}
            </p>
          </div>
        )}
      </div>

      {/* Quick Link Input Modal */}
      {promptVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {promptVideo.action === "submit_cut"
                  ? "Submit Final Cut Link"
                  : "Upload Raw Footage Link"}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {promptVideo.title}
              </p>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Drive / Cloud Link *
                </label>
                <input
                  type="url"
                  required
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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
                  {submitting ? "Saving..." : "Save & Update Stage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
