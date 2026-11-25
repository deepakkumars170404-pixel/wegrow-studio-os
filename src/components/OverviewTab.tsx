"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Film,
  Building2,
  UserCheck,
  CalendarClock,
} from "lucide-react";
import {
  PRIORITY_META,
  STAGE_MAP,
  formatDeadline,
  isDeadlineDueTodayOrOverdue,
  isDeadlineOverdue,
} from "@/lib/constants";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";

interface OverviewTabProps {
  videos: VideoItem[];
  clients: ClientItem[];
  staff: StaffMember[];
  onOpenVideo: (video: VideoItem) => void;
  onSelectClient: (clientId: number) => void;
}

export default function OverviewTab({
  videos,
  clients,
  staff,
  onOpenVideo,
  onSelectClient,
}: OverviewTabProps) {
  const today = new Date().toISOString().slice(0, 10);

  const activeClients = clients.filter((c) => c.status === "active");
  const pendingEditing = videos.filter((v) =>
    ["script", "shoot_done", "raw_uploaded", "editing"].includes(v.stage)
  );
  const waitingReview = videos.filter((v) =>
    ["internal_review", "client_approval"].includes(v.stage)
  );
  const scheduledOrPosted = videos.filter((v) =>
    ["scheduled", "posted"].includes(v.stage)
  );
  const overdueOrDueToday = videos.filter((v) =>
    isDeadlineDueTodayOrOverdue(v.edit_deadline, v.stage)
  );

  const editors = staff.filter(
    (s) => s.active && (s.role === "editor" || s.role === "ai_content_creator")
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Clients
            </span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{activeClients.length}</p>
          <p className="text-xs text-slate-500 mt-1">{videos.length} total videos tracked</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Editing
            </span>
            <Film className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{pendingEditing.length}</p>
          <p className="text-xs text-slate-500 mt-1">Script to Editing / Revision</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              In Review
            </span>
            <Clock className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{waitingReview.length}</p>
          <p className="text-xs text-slate-500 mt-1">Internal & Client Approval</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ready / Posted
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{scheduledOrPosted.length}</p>
          <p className="text-xs text-slate-500 mt-1">Scheduled or live</p>
        </div>

        <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Overdue / Today
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-bold text-rose-700 mt-2">{overdueOrDueToday.length}</p>
          <p className="text-xs text-rose-600 mt-1">Needs immediate attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Workload */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              Editor Workload
            </h3>
            <span className="text-xs text-slate-500">Active tasks</span>
          </div>
          <div className="space-y-4">
            {editors.map((ed) => {
              const assigned = videos.filter(
                (v) => v.assigned_editor_id === ed.id && v.stage !== "posted"
              );
              const inEdit = assigned.filter((v) => v.stage === "editing").length;
              const pct = Math.min(100, Math.round((assigned.length / 8) * 100));
              return (
                <div key={ed.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                        style={{ backgroundColor: ed.avatar_color }}
                      >
                        {ed.name.charAt(0)}
                      </span>
                      <span className="font-semibold text-slate-800">{ed.name}</span>
                    </div>
                    <span className="font-semibold text-slate-600">
                      {assigned.length} pending ({inEdit} editing)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(pct, assigned.length > 0 ? 12 : 0)}%`,
                        backgroundColor: ed.avatar_color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {editors.length === 0 && (
              <p className="text-xs text-slate-500">No active editors found.</p>
            )}
          </div>
        </div>

        {/* Client Monthly Commitment */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Client Monthly Targets
            </h3>
            <span className="text-xs text-slate-500">Click to filter</span>
          </div>
          <div className="space-y-3">
            {activeClients.map((client) => {
              const total = client.total_videos || 0;
              const posted = client.posted_count || 0;
              const pct = Math.min(
                100,
                Math.round((posted / Math.max(1, client.monthly_target)) * 100)
              );
              return (
                <button
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{client.name}</span>
                    <span className="text-slate-600 font-medium">
                      {posted}/{client.monthly_target} posted ({total} in pipe)
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Urgent & Overdue Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-rose-600" />
              Urgent & Overdue Deadlines
            </h3>
            <span className="text-xs text-rose-600 font-semibold">
              {overdueOrDueToday.length} items
            </span>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {overdueOrDueToday.map((v) => {
              const stageMeta = STAGE_MAP[v.stage];
              const isOverdue = isDeadlineOverdue(v.edit_deadline, v.stage);
              return (
                <button
                  key={v.id}
                  onClick={() => onOpenVideo(v)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{v.title}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_META[v.priority].badgeClass}`}
                    >
                      {PRIORITY_META[v.priority].label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500">
                    <span>
                      {v.client_name} • {v.editor_name || "Unassigned"}
                    </span>
                    <span className={isOverdue ? "text-rose-600 font-bold" : "text-amber-700 font-semibold"}>
                      {isOverdue ? `Overdue (${formatDeadline(v.edit_deadline)})` : `Due: ${formatDeadline(v.edit_deadline)}`}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${stageMeta.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stageMeta.dotClass}`} />
                      {stageMeta.label}
                    </span>
                  </div>
                </button>
              );
            })}
            {overdueOrDueToday.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                All deadlines are on track!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
