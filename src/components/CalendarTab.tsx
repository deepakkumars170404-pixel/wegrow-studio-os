"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STAGE_MAP, VIDEO_STAGES } from "@/lib/constants";
import type { VideoItem } from "@/types/portal";

interface CalendarTabProps {
  videos: VideoItem[];
  onOpenVideo: (video: VideoItem) => void;
}

export default function CalendarTab({ videos, onOpenVideo }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Content & Posting Calendar</h2>
          <p className="text-xs text-slate-500">
            Shows scheduled posting dates across all clients
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-900 min-w-36 text-center">
            {monthLabel}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stage Color Legend */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2 border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
          Stage Colors:
        </span>
        {VIDEO_STAGES.map((st) => (
          <span
            key={st.key}
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${st.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
            {st.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-24 rounded-xl bg-slate-50/50" />;
          }

          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
            2,
            "0"
          )}`;
          const dayVideos = videos.filter((v) => v.posting_date === iso);
          const isToday = iso === todayISO;

          return (
            <div
              key={iso}
              className={`min-h-28 rounded-xl border p-2 flex flex-col gap-1.5 ${
                isToday ? "border-indigo-400 bg-indigo-50/30" : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`text-xs font-bold self-end ${
                  isToday
                    ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                    : "text-slate-600"
                }`}
              >
                {day}
              </span>

              <div className="space-y-1 overflow-y-auto">
                {dayVideos.map((v) => {
                  const stageMeta = STAGE_MAP[v.stage];
                  return (
                    <button
                      key={v.id}
                      onClick={() => onOpenVideo(v)}
                      className={`w-full text-left text-[10px] font-semibold px-2 py-1 rounded-lg border truncate cursor-pointer ${stageMeta.badgeClass}`}
                      title={`${v.client_name}: ${v.title} (${stageMeta.label})`}
                    >
                      {v.client_name.split(" ")[0]}: {v.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
