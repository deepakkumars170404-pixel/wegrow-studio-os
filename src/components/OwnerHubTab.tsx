"use client";

import React, { useState } from "react";
import {
  Film,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Table2,
  LayoutGrid,
  Plus,
  ExternalLink,
  Clock,
  Calendar,
  X,
  Building2,
  Users,
  Share2,
} from "lucide-react";
import {
  formatDeadline,
  isDeadlineDueTodayOrOverdue,
  isDeadlineOverdue,
  PRIORITY_META,
  STAGE_MAP,
  VIDEO_STAGES,
  WEGROW_TEAMS,
  TEAM_META,
  type WegrowTeam,
} from "@/lib/constants";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";
import type { VideoStage } from "@/lib/db";

interface OwnerHubTabProps {
  videos: VideoItem[];
  clients: ClientItem[];
  staff: StaffMember[];
  onOpenVideo: (video: VideoItem) => void;
  onStageChange: (videoId: number, newStage: VideoStage) => void;
  onNewVideo: () => void;
  onSelectClient: (clientId: number) => void;
  onNavigateReviews?: () => void;
}

type QuickFilter = "all" | "shoot" | "editing" | "approval" | "overdue";

export default function OwnerHubTab({
  videos,
  clients,
  staff,
  onOpenVideo,
  onStageChange,
  onNewVideo,
  onNavigateReviews,
}: OwnerHubTabProps) {
  const [selectedTeam, setSelectedTeam] = useState<"all" | WegrowTeam>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedClientId, setSelectedClientId] = useState<number | "all">("all");
  const [selectedStaffId, setSelectedStaffId] = useState<number | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  // Filter by team first
  const teamVideos =
    selectedTeam === "all"
      ? videos
      : videos.filter((v) => (v.team || "BSchool") === selectedTeam);

  // Summary counts
  const waitingShoot = teamVideos.filter((v) => v.stage === "script");
  const inEditing = teamVideos.filter((v) =>
    ["shoot_done", "raw_uploaded", "editing"].includes(v.stage)
  );
  const inApproval = teamVideos.filter((v) =>
    ["internal_review", "client_approval", "scheduled"].includes(v.stage)
  );
  const overdueOrUrgent = teamVideos.filter(
    (v) =>
      v.stage !== "posted" &&
      (v.priority === "urgent" || isDeadlineDueTodayOrOverdue(v.edit_deadline, v.stage))
  );

  // Filtered videos
  const filteredVideos = teamVideos.filter((v) => {
    // Quick metric box filter
    if (quickFilter === "shoot" && v.stage !== "script") return false;
    if (
      quickFilter === "editing" &&
      !["shoot_done", "raw_uploaded", "editing"].includes(v.stage)
    )
      return false;
    if (
      quickFilter === "approval" &&
      !["internal_review", "client_approval", "scheduled"].includes(v.stage)
    )
      return false;
    if (
      quickFilter === "overdue" &&
      (v.stage === "posted" ||
        (v.priority !== "urgent" && !isDeadlineDueTodayOrOverdue(v.edit_deadline, v.stage)))
    )
      return false;

    // Dropdown filters
    if (selectedClientId !== "all" && v.client_id !== selectedClientId) return false;
    if (
      selectedStaffId !== "all" &&
      v.assigned_editor_id !== selectedStaffId &&
      v.assigned_cameraman_id !== selectedStaffId &&
      v.assigned_writer_id !== selectedStaffId
    )
      return false;

    return true;
  });

  return (
    <div className="space-y-5">
      {/* 3-Team Brand Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedTeam("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
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
              {videos.length}
            </span>
          </button>

          {WEGROW_TEAMS.map((t) => {
            const isSelected = selectedTeam === t;
            const count = videos.filter((v) => (v.team || "BSchool") === t).length;
            const meta = TEAM_META[t];
            return (
              <button
                key={t}
                onClick={() => setSelectedTeam(t)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
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

        {selectedTeam !== "all" && (
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5 pr-2">
            <span>Lead:</span>
            <strong className="text-slate-800 font-semibold">{TEAM_META[selectedTeam].leadName}</strong>
            <span>•</span>
            <span>Cam:</span>
            <strong className="text-slate-800 font-semibold">Pandeeswaran</strong>
            <span>•</span>
            <span>Editor:</span>
            <strong className="text-slate-800 font-semibold">Rahul</strong>
          </div>
        )}
      </div>
      {/* 4 Clickable Quick-Filter Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Waiting for Shoot */}
        <div
          onClick={() => setQuickFilter((prev) => (prev === "shoot" ? "all" : "shoot"))}
          className={`p-5 rounded-2xl border transition cursor-pointer select-none ${
            quickFilter === "shoot"
              ? "bg-violet-600 text-white border-violet-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-violet-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                quickFilter === "shoot" ? "text-violet-100" : "text-slate-500"
              }`}
            >
              1. Waiting for Shoot
            </span>
            <Camera
              className={`w-4 h-4 ${
                quickFilter === "shoot" ? "text-white" : "text-violet-600"
              }`}
            />
          </div>
          <p className="text-3xl font-extrabold mt-2">{waitingShoot.length}</p>
          <p
            className={`text-xs mt-1 font-medium ${
              quickFilter === "shoot" ? "text-violet-100" : "text-slate-500"
            }`}
          >
            Script ready • Need Pandeeswaran
          </p>
        </div>

        {/* In Editing */}
        <div
          onClick={() => setQuickFilter((prev) => (prev === "editing" ? "all" : "editing"))}
          className={`p-5 rounded-2xl border transition cursor-pointer select-none ${
            quickFilter === "editing"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-amber-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                quickFilter === "editing" ? "text-amber-100" : "text-slate-500"
              }`}
            >
              2. In Production & Edit
            </span>
            <Film
              className={`w-4 h-4 ${
                quickFilter === "editing" ? "text-white" : "text-amber-600"
              }`}
            />
          </div>
          <p className="text-3xl font-extrabold mt-2">{inEditing.length}</p>
          <p
            className={`text-xs mt-1 font-medium ${
              quickFilter === "editing" ? "text-amber-100" : "text-slate-500"
            }`}
          >
            Shoot done / Active editing
          </p>
        </div>

        {/* In Review & Approval */}
        <div
          onClick={() => {
            if (onNavigateReviews) {
              onNavigateReviews();
            } else {
              setQuickFilter((prev) => (prev === "approval" ? "all" : "approval"));
            }
          }}
          className={`p-5 rounded-2xl border transition cursor-pointer select-none ${
            quickFilter === "approval"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
              : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                quickFilter === "approval" ? "text-indigo-100" : "text-slate-500"
              }`}
            >
              3. Review & Approval
            </span>
            <CheckCircle2
              className={`w-4 h-4 ${
                quickFilter === "approval" ? "text-white" : "text-indigo-600"
              }`}
            />
          </div>
          <p className="text-3xl font-extrabold mt-2">{inApproval.length}</p>
          <div className="flex items-center justify-between mt-1">
            <p
              className={`text-xs font-medium ${
                quickFilter === "approval" ? "text-indigo-100" : "text-slate-500"
              }`}
            >
              Internal review & client approval
            </p>
            {onNavigateReviews && inApproval.length > 0 && (
              <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 hover:bg-indigo-100">
                Open Review Tab ➔
              </span>
            )}
          </div>
        </div>

        {/* Overdue / Urgent */}
        <div
          onClick={() => setQuickFilter((prev) => (prev === "overdue" ? "all" : "overdue"))}
          className={`p-5 rounded-2xl border transition cursor-pointer select-none ${
            quickFilter === "overdue"
              ? "bg-rose-600 text-white border-rose-600 shadow-md"
              : "bg-rose-50/70 text-rose-900 border-rose-200 hover:border-rose-400 hover:shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                quickFilter === "overdue" ? "text-rose-100" : "text-rose-700"
              }`}
            >
              4. Urgent / Overdue
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                quickFilter === "overdue" ? "text-white" : "text-rose-600"
              }`}
            />
          </div>
          <p className="text-3xl font-extrabold mt-2">{overdueOrUrgent.length}</p>
          <p
            className={`text-xs mt-1 font-medium ${
              quickFilter === "overdue" ? "text-rose-100" : "text-rose-600"
            }`}
          >
            Needs immediate attention
          </p>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Filter Active Pill */}
          {quickFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold">
              Filter: {quickFilter.toUpperCase()} ({filteredVideos.length})
              <button
                onClick={() => setQuickFilter("all")}
                className="hover:text-indigo-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {/* Client Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedClientId}
              onChange={(e) =>
                setSelectedClientId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Filter */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStaffId}
              onChange={(e) =>
                setSelectedStaffId(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Team Members</option>
              {staff
                .filter((s) => s.active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role.replace("_", " ")})
                  </option>
                ))}
            </select>
          </div>

          <span className="text-xs text-slate-500 font-semibold px-2">
            Showing {filteredVideos.length} videos
          </span>
        </div>

        {/* View Toggle & New Video Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Master List
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === "board"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Stage Board
            </button>
          </div>

          <button
            onClick={onNewVideo}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Video
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "table" ? (
        /* CLEAN MASTER LIST TABLE */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Client & Video</th>
                  <th className="py-3.5 px-4">Production Stage</th>
                  <th className="py-3.5 px-4">Assigned Crew</th>
                  <th className="py-3.5 px-4">Edit Deadline (Date & Time)</th>
                  <th className="py-3.5 px-4">Posting Date</th>
                  <th className="py-3.5 px-4">Drive Links</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredVideos.map((video) => {
                  const stageMeta = STAGE_MAP[video.stage];
                  const isOverdue = isDeadlineOverdue(video.edit_deadline, video.stage);

                  return (
                    <tr
                      key={video.id}
                      onClick={() => onOpenVideo(video)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      {/* Client & Title */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
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
                        </div>
                        <p className="font-bold text-slate-900 leading-snug">
                          {video.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {video.content_type}
                          </span>
                          {video.notes && video.notes.includes("[Client Approved") && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.2 rounded-full flex items-center gap-1">
                              🎉 Client Approved
                            </span>
                          )}
                          {video.notes && video.notes.includes("[Client Revision Request") && video.stage === "editing" && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.2 rounded-full flex items-center gap-1">
                              ⚠️ Client Revision
                            </span>
                          )}
                          {video.priority === "urgent" && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full">
                              Urgent
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stage Dropdown */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1.5 min-w-[130px]">
                          <select
                            value={video.stage}
                            onChange={(e) =>
                              onStageChange(video.id, e.target.value as VideoStage)
                            }
                            className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${stageMeta.badgeClass}`}
                          >
                            {VIDEO_STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          {video.stage === "internal_review" && (
                            <button
                              type="button"
                              onClick={() => onStageChange(video.id, "client_approval")}
                              className="w-full px-2.5 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center justify-center gap-1 transition cursor-pointer"
                              title="Approve Rahul's cut and move to Client Approval"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Internal Approve
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Assigned Crew */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">Cam:</span>
                            <span className="font-semibold text-slate-700">
                              {video.cameraman_name || (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">Editor:</span>
                            <span className="font-semibold text-slate-700">
                              {video.editor_name || (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Edit Deadline */}
                      <td className="py-3.5 px-4 font-semibold">
                        <span
                          className={`flex items-center gap-1.5 ${
                            isOverdue ? "text-rose-600 font-bold" : "text-slate-800"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatDeadline(video.edit_deadline)}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                            ⚠️ Overdue
                          </span>
                        )}
                      </td>

                      {/* Posting Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {video.posting_date ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {video.posting_date}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Drive Links */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 text-[11px]">
                          {video.raw_link ? (
                            video.raw_link.startsWith("http") ? (
                              <a
                                href={video.raw_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 font-semibold"
                              >
                                Raw Footage <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span
                                className="text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded text-[10px] font-semibold max-w-[130px] truncate"
                                title={video.raw_link}
                              >
                                {video.raw_link}
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300">No Raw</span>
                          )}

                          {video.final_link ? (
                            <a
                              href={video.final_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-semibold"
                            >
                              Final Cut <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-300">No Final</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {video.review_token && (
                            <a
                              href={`/review/${video.review_token}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Client Approval Portal"
                              className="p-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {video.stage === "internal_review" && (
                            <button
                              type="button"
                              onClick={() => onStageChange(video.id, "client_approval")}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                              title="Internal Approve ➔ Move to Client Approval"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Internal Approve
                            </button>
                          )}

                          <button
                            onClick={() => onOpenVideo(video)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredVideos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Film className="w-8 h-8 text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">No videos found</p>
                        <p className="text-[11px] text-slate-400">
                          Click &quot;+ Add New Video&quot; above to create your first video task.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* OPTIONAL STAGE BOARD VIEW (for visual dragging/monitoring) */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {VIDEO_STAGES.map((stage) => {
            const stageVideos = filteredVideos.filter((v) => v.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="w-72 shrink-0 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col max-h-[70vh]"
              >
                <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotClass}`} />
                    <span className="text-xs font-bold text-slate-800">{stage.label}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {stageVideos.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {stageVideos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => onOpenVideo(v)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {v.client_name}
                        </span>
                        {v.team && TEAM_META[v.team as WegrowTeam] && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              TEAM_META[v.team as WegrowTeam].badgeClass
                            }`}
                          >
                            {TEAM_META[v.team as WegrowTeam].iconLabel}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_META[v.priority].badgeClass}`}
                        >
                          {PRIORITY_META[v.priority].label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-snug">{v.title}</p>
                      <div className="text-[11px] text-slate-500">
                        {v.editor_name ? `Editor: ${v.editor_name}` : "Editor: Unassigned"}
                      </div>
                      {v.stage === "internal_review" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageChange(v.id, "client_approval");
                          }}
                          className="w-full mt-2 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Internal Approve
                        </button>
                      )}
                    </div>
                  ))}
                  {stageVideos.length === 0 && (
                    <div className="text-center py-6 text-[11px] text-slate-400">
                      No videos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
