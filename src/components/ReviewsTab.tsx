"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Clock,
  Calendar,
  Send,
  RefreshCw,
  Share2,
  Copy,
  Building2,
  Play,
  Film,
  AlertTriangle,
  Search,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import {
  formatDeadline,
  isDeadlineDueTodayOrOverdue,
  PRIORITY_META,
  STAGE_MAP,
  TEAM_META,
  WEGROW_TEAMS,
  type WegrowTeam,
} from "@/lib/constants";
import type { VideoItem, StaffMember, ClientItem } from "@/types/portal";
import type { VideoStage } from "@/lib/db";

interface ReviewsTabProps {
  videos: VideoItem[];
  clients: ClientItem[];
  staff: StaffMember[];
  currentUser: StaffMember;
  onStageChange: (videoId: number, newStage: VideoStage) => void;
  onOpenVideo: (video: VideoItem) => void;
  onRefresh: () => void;
}

type ReviewFilter = "all" | "internal" | "client";

export default function ReviewsTab({
  videos,
  clients,
  staff,
  currentUser,
  onStageChange,
  onOpenVideo,
  onRefresh,
}: ReviewsTabProps) {
  const [selectedTeam, setSelectedTeam] = useState<"all" | WegrowTeam>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [search, setSearch] = useState("");

  // Revision Modal State
  const [revisionModal, setRevisionModal] = useState<{
    video: VideoItem;
    isClientRevision: boolean;
  } | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>("");

  // Only consider videos in review stages
  const allReviewVideos = videos.filter(
    (v) => v.stage === "internal_review" || v.stage === "client_approval"
  );

  // Filter by Team
  const teamVideos = allReviewVideos.filter((v) => {
    if (selectedTeam === "all") return true;
    return (v.team || "BSchool") === selectedTeam;
  });

  // Filter by Sub-category
  const filteredVideos = teamVideos.filter((v) => {
    if (reviewFilter === "internal" && v.stage !== "internal_review") return false;
    if (reviewFilter === "client" && v.stage !== "client_approval") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        v.title.toLowerCase().includes(q) ||
        v.client_name.toLowerCase().includes(q) ||
        (v.editor_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const internalCount = teamVideos.filter((v) => v.stage === "internal_review").length;
  const clientCount = teamVideos.filter((v) => v.stage === "client_approval").length;

  function showToast(msg: string) {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  }

  function handleApprove(video: VideoItem, targetStage: "client_approval" | "scheduled") {
    // Instant 0ms optimistic transition
    onStageChange(video.id, targetStage);
    showToast(
      targetStage === "client_approval"
        ? `✓ "${video.title}" approved internally! Moved to Client Approval.`
        : `✓ "${video.title}" directly approved & marked ready to post!`
    );
    // Non-blocking background persistence
    fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: targetStage }),
    }).catch((e) => console.error(e));
  }

  function handleSubmitRevision(e: React.FormEvent) {
    e.preventDefault();
    if (!revisionModal || !revisionFeedback.trim()) return;

    const modalVideo = revisionModal.video;
    const feedbackText = revisionFeedback.trim();
    const isClient = revisionModal.isClientRevision;

    // Instant optimistic state change & close modal
    onStageChange(modalVideo.id, "editing");
    setRevisionModal(null);
    setRevisionFeedback("");
    showToast(`⚠️ Revision request sent to Rahul for "${modalVideo.title}"!`);

    const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const tag = isClient
      ? `⚠️ [Client Revision Request on ${nowStr}]: ${feedbackText}`
      : `⚠️ [Internal Revision by ${currentUser.name} on ${nowStr}]: ${feedbackText}`;

    const existingNotes = modalVideo.notes || "";
    const updatedNotes = `${tag}\n${existingNotes}`.trim();

    // Background persistence
    fetch(`/api/videos/${modalVideo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: "editing",
        notes: updatedNotes,
      }),
    }).catch((err) => {
      console.error("Failed to submit revision:", err);
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Review & Approval Hub
            </h1>
            {allReviewVideos.length > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {allReviewVideos.length} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fast-track video approvals: watch Rahul&apos;s cuts, approve for client portal, or request revisions.
          </p>
        </div>

        {/* Team Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setSelectedTeam("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedTeam === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Teams ({allReviewVideos.length})
          </button>
          {WEGROW_TEAMS.map((t) => {
            const count = allReviewVideos.filter((v) => (v.team || "BSchool") === t).length;
            const meta = TEAM_META[t];
            return (
              <button
                key={t}
                onClick={() => setSelectedTeam(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  selectedTeam === t
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{meta.iconLabel}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setReviewFilter("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              reviewFilter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            All In Review ({teamVideos.length})
          </button>
          <button
            onClick={() => setReviewFilter("internal")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              reviewFilter === "internal"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Lead Review Needed ({internalCount})
          </button>
          <button
            onClick={() => setReviewFilter("client")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              reviewFilter === "client"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Client Approval ({clientCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or video title..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Videos Waiting for Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredVideos.map((video) => {
          const isInternal = video.stage === "internal_review";
          const teamMeta = TEAM_META[(video.team as WegrowTeam) || "BSchool"];
          const isOverdue = isDeadlineDueTodayOrOverdue(video.edit_deadline, video.stage);

          return (
            <div
              key={video.id}
              className={`bg-white rounded-3xl border-2 transition shadow-xs flex flex-col justify-between overflow-hidden ${
                isInternal
                  ? "border-amber-300 ring-2 ring-amber-500/10"
                  : "border-sky-200 hover:border-sky-300"
              }`}
            >
              {/* Card Header */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-[11px] font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {video.client_name}
                    </span>
                    {teamMeta && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${teamMeta.badgeClass}`}
                      >
                        {teamMeta.iconLabel}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      {video.content_type}
                    </span>
                  </div>

                  {/* Stage Pill */}
                  {isInternal ? (
                    <span className="px-3 py-1 text-[11px] font-black text-amber-900 bg-amber-100 border border-amber-300 rounded-xl flex items-center gap-1.5 animate-pulse">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Lead Review Needed
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-[11px] font-black text-sky-900 bg-sky-100 border border-sky-300 rounded-xl flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-sky-700" />
                      Client Approval Portal
                    </span>
                  )}
                </div>

                {/* Video Title */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="text-slate-400">Editor:</span>
                      <span className="font-bold text-slate-800">
                        {video.editor_name || "Rahul"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-slate-400">Lead / Script:</span>
                      <span className="font-semibold text-slate-700">
                        {teamMeta?.leadName || "Lead"}
                      </span>
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        isOverdue ? "text-rose-600 font-bold" : ""
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDeadline(video.edit_deadline)}</span>
                    </span>
                  </div>
                </div>

                {/* Watch Final Cut Direct Link / Player Bar */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {video.final_link ? "Edited Cut Ready to Watch" : "Cut Link Pending"}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">
                        {video.final_link || "No Google Drive link uploaded yet"}
                      </p>
                    </div>
                  </div>

                  {video.final_link ? (
                    <a
                      href={video.final_link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 shadow-xs transition shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Watch Cut ↗
                    </a>
                  ) : (
                    <button
                      onClick={() => onOpenVideo(video)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
                    >
                      Add Link
                    </button>
                  )}
                </div>

                {/* Client Review Portal Bar */}
                {video.review_token && (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-sky-950 block">Client Approval Portal:</span>
                      <span className="text-[11px] text-sky-700 font-mono">
                        /review/{video.review_token}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/review/${video.review_token}`
                          );
                          showToast("Copied client portal link to clipboard!");
                        }}
                        className="px-2.5 py-1.5 bg-white border border-sky-200 text-sky-800 rounded-xl text-xs font-semibold hover:bg-sky-100 cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Copy client portal link"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </button>
                      <a
                        href={`/review/${video.review_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        Open Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Notes & Revision Feedback History */}
                {video.notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Production Notes / Feedback:
                    </p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap max-h-24 overflow-y-auto font-sans leading-relaxed">
                      {video.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenVideo(video)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Edit Task Details
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Internal Review Actions */}
                  {isInternal && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setRevisionModal({
                            video,
                            isClientRevision: false,
                          })
                        }
                        className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Request Revision
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(video, "client_approval")}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Internal Approve ➔ Client Review
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(video, "scheduled")}
                        className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl flex items-center gap-1 cursor-pointer transition"
                        title="Skip client approval and mark ready to post"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Direct Approve ➔ Post
                      </button>
                    </>
                  )}

                  {/* Client Approval Actions */}
                  {video.stage === "client_approval" && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setRevisionModal({
                            video,
                            isClientRevision: true,
                          })
                        }
                        className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Client Changes
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(video, "scheduled")}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Client Approved ➔ Ready to Post
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredVideos.length === 0 && (
        <div className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              No videos waiting for review right now!
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When Rahul completes an edit and submits the cut, it will appear here automatically for your internal review and approval.
            </p>
          </div>
        </div>
      )}

      {/* Revision Request Feedback Modal */}
      {revisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {revisionModal.isClientRevision
                      ? "Client Revision Feedback"
                      : "Internal Revision for Rahul"}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">
                    {revisionModal.video.title} ({revisionModal.video.client_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevisionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specify Exact Changes Needed *
                </label>
                <textarea
                  required
                  rows={4}
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="e.g. Trim intro hook by 2 seconds, remove background noise, fix subtitle typography in the ending call to action..."
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-slate-900 leading-relaxed font-sans"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 This feedback will trigger an instant revision alert directly on Rahul&apos;s dashboard!
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevisionModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRevision || !revisionFeedback.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {submittingRevision ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Send Changes to Rahul
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
