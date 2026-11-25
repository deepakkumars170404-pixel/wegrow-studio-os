"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
} from "lucide-react";

interface AnalyticsData {
  total_target: number;
  total_posted: number;
  total_in_pipe: number;
  delivery_percentage: number;
  leaderboard: {
    id: number;
    name: string;
    role: string;
    avatar_color: string;
    total_assigned: number;
    completed_count: number;
    active_count: number;
    in_editing_count: number;
    in_review_count: number;
    overdue_count: number;
    on_time_rate: number;
  }[];
  client_health: {
    id: number;
    name: string;
    industry: string;
    monthly_target: number;
    posted_count: number;
    pending_count: number;
    overdue_count: number;
    completion_rate: number;
    health_status: "healthy" | "attention" | "critical";
  }[];
  funnel: {
    script: number;
    shoot_done: number;
    editing: number;
    review: number;
    scheduled: number;
    posted: number;
  };
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
        Loading agency analytics...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Agency Performance & Delivery Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time monthly delivery rate, editor turnaround speed, and client health
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly Delivery Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Monthly Delivery Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {data.delivery_percentage}%
            </span>
            <span className="text-xs text-slate-500">
              ({data.total_posted} / {data.total_target} committed)
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${data.delivery_percentage}%` }}
            />
          </div>
        </div>

        {/* Total In Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>In Production Pipe</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{data.total_in_pipe}</p>
          <p className="text-xs text-slate-500">
            {data.funnel.editing} currently in edit • {data.funnel.shoot_done} ready
          </p>
        </div>

        {/* Review & Approvals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Awaiting Approval</span>
            <CheckCircle2 className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {data.funnel.review + data.funnel.scheduled}
          </p>
          <p className="text-xs text-slate-500">
            {data.funnel.scheduled} scheduled • {data.funnel.review} under review
          </p>
        </div>

        {/* Client Attention Needed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Client Health Alert</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600">
            {data.client_health.filter((c) => c.health_status === "critical").length}
          </p>
          <p className="text-xs text-slate-500">
            Clients lagging behind target or with overdue videos
          </p>
        </div>
      </div>

      {/* Editor Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Editor Performance Leaderboard</h3>
            <p className="text-xs text-slate-500">
              Total completed edits, active queue, and on-time delivery percentage
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Editor Name</th>
                <th className="py-3 px-4">Completed Videos</th>
                <th className="py-3 px-4">Active In Queue</th>
                <th className="py-3 px-4">Overdue Tasks</th>
                <th className="py-3 px-4 text-right">On-Time Delivery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {data.leaderboard.map((ed) => (
                <tr key={ed.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-7 h-7 rounded-lg text-white font-bold flex items-center justify-center text-xs"
                        style={{ backgroundColor: ed.avatar_color }}
                      >
                        {ed.name.charAt(0)}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block">{ed.name}</span>
                        <span className="text-[10px] text-slate-500 capitalize">
                          {ed.role.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {ed.completed_count} posted
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-semibold">
                    {ed.active_count} active ({ed.in_editing_count} editing)
                  </td>
                  <td className="py-3.5 px-4">
                    {ed.overdue_count > 0 ? (
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {ed.overdue_count} overdue
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">0 overdue</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        ed.on_time_rate >= 80
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : ed.on_time_rate >= 50
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {ed.on_time_rate}% On-Time
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Health Meter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Client Delivery Health Meter</h3>
            <p className="text-xs text-slate-500">
              Monthly targets vs actual delivered content for each client
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.client_health.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                c.health_status === "healthy"
                  ? "bg-emerald-50/30 border-emerald-200/80"
                  : c.health_status === "attention"
                  ? "bg-amber-50/30 border-amber-200/80"
                  : "bg-rose-50/30 border-rose-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500">{c.industry}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    c.health_status === "healthy"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : c.health_status === "attention"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-rose-100 text-rose-800 border-rose-200"
                  }`}
                >
                  {c.health_status}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">
                    {c.posted_count} / {c.monthly_target} Posted
                  </span>
                  <span className="text-indigo-600 font-bold">{c.completion_rate}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      c.health_status === "healthy"
                        ? "bg-emerald-500"
                        : c.health_status === "attention"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${c.completion_rate}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 text-slate-500">
                <span>{c.pending_count} in production pipe</span>
                {c.overdue_count > 0 ? (
                  <span className="text-rose-600 font-bold">
                    ⚠️ {c.overdue_count} overdue
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">All deadlines on track</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
