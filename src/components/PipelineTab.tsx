"use client";

import React, { useState } from "react";
import { LayoutGrid, Table2, ExternalLink, Calendar, User } from "lucide-react";
import {
  PRIORITY_META,
  STAGE_MAP,
  VIDEO_STAGES,
  formatDeadline,
  isDeadlineOverdue,
} from "@/lib/constants";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";
import type { VideoStage } from "@/lib/db";

interface PipelineTabProps {
  videos: VideoItem[];
  clients: ClientItem[];
  staff: StaffMember[];
  selectedClientId: number | "all";
  onClientFilterChange: (clientId: number | "all") => void;
  onOpenVideo: (video: VideoItem) => void;
  onStageChange: (videoId: number, newStage: VideoStage) => void;
}

export default function PipelineTab({
  videos,
  clients,
  staff,
  selectedClientId,
  onClientFilterChange,
  onOpenVideo,
  onStageChange,
}: PipelineTabProps) {
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [editorFilter, setEditorFilter] = useState<string>("all");

  const today = new Date().toISOString().slice(0, 10);
  const editors = staff.filter((s) => s.active && (s.role === "editor" || s.role === "manager"));

  const filtered = videos.filter((v) => {
    if (selectedClientId !== "all" && v.client_id !== selectedClientId) return false;
    if (stageFilter !== "all" && v.stage !== stageFilter) return false;
    if (editorFilter === "unassigned" && v.assigned_editor_id !== null) return false;
    if (editorFilter !== "all" && editorFilter !== "unassigned" && v.assigned_editor_id !== Number(editorFilter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedClientId}
            onChange={(e) =>
              onClientFilterChange(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800"
          >
            <option value="all">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={editorFilter}
            onChange={(e) => setEditorFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800"
          >
            <option value="all">All Editors</option>
            <option value="unassigned">Unassigned</option>
            {editors.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name}
              </option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800"
          >
            <option value="all">All Stages</option>
            {VIDEO_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-500 font-medium px-2">
            Showing {filtered.length} videos
          </span>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("board")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "board"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kanban Board
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Master Table
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {VIDEO_STAGES.map((stage) => {
            const stageVideos = filtered.filter((v) => v.stage === stage.key);
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
                  {stageVideos.map((v) => {
                    const isOverdue = isDeadlineOverdue(v.edit_deadline, v.stage);
                    return (
                      <div
                        key={v.id}
                        onClick={() => onOpenVideo(v)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {v.client_name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_META[v.priority].badgeClass}`}
                          >
                            {PRIORITY_META[v.priority].label}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {v.title}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {v.editor_name || "Unassigned"}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium text-slate-700">
                            {v.content_type}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] gap-1">
                          <div className="flex flex-col">
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue ? "text-rose-600 font-bold" : "text-slate-500"
                              }`}
                            >
                              <Calendar className="w-3 h-3 shrink-0" />
                              Edit: {formatDeadline(v.edit_deadline)}
                            </span>
                            {v.posting_date && (
                              <span className="text-[10px] text-emerald-700 font-medium pl-4">
                                Post: {v.posting_date}
                              </span>
                            )}
                          </div>
                          <select
                            value={v.stage}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              onStageChange(v.id, e.target.value as VideoStage)
                            }
                            className="text-[10px] font-semibold border border-slate-200 rounded-lg px-1.5 py-0.5 bg-slate-50 text-slate-700 cursor-pointer"
                          >
                            {VIDEO_STAGES.map((st) => (
                              <option key={st.key} value={st.key}>
                                {st.shortLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
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
      ) : (
        /* Master Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Video & Format</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Editor</th>
                  <th className="py-3 px-4">Edit Deadline</th>
                  <th className="py-3 px-4">Posting Date</th>
                  <th className="py-3 px-4">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((v) => {
                  const stageMeta = STAGE_MAP[v.stage];
                  const isOverdue = isDeadlineOverdue(v.edit_deadline, v.stage);
                  return (
                    <tr
                      key={v.id}
                      onClick={() => onOpenVideo(v)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{v.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {v.content_type}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_META[v.priority].badgeClass}`}
                          >
                            {PRIORITY_META[v.priority].label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {v.client_name}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={v.stage}
                          onChange={(e) =>
                            onStageChange(v.id, e.target.value as VideoStage)
                          }
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer ${stageMeta.badgeClass}`}
                        >
                          {VIDEO_STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {v.editor_name || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 font-medium ${
                          isOverdue ? "text-rose-600 font-bold" : "text-slate-700"
                        }`}
                      >
                        {formatDeadline(v.edit_deadline)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {v.posting_date || "—"}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {v.raw_link && (
                            <a
                              href={v.raw_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-sky-600 hover:underline flex items-center gap-0.5"
                            >
                              Raw <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {v.final_link && (
                            <a
                              href={v.final_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5"
                            >
                              Final <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
