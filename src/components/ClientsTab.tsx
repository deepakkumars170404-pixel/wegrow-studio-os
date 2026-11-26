"use client";

import React, { useState } from "react";
import { Building2, ExternalLink, Plus, X, ArrowRight } from "lucide-react";
import type { ClientItem } from "@/types/portal";

interface ClientsTabProps {
  clients: ClientItem[];
  canManage: boolean;
  onRefresh: () => void;
  onViewClientVideos: (clientId: number) => void;
}

export default function ClientsTab({
  clients,
  canManage,
  onRefresh,
  onViewClientVideos,
}: ClientsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState(12);
  const [brandDriveUrl, setBrandDriveUrl] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          industry,
          monthly_target: monthlyTarget,
          brand_drive_url: brandDriveUrl,
          guidelines,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add client");
        return;
      }
      setName("");
      setIndustry("");
      setMonthlyTarget(12);
      setBrandDriveUrl("");
      setGuidelines("");
      setShowModal(false);
      onRefresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {canManage ? "Client Hub & Brand Kits" : "Client Brand Kits & Guidelines"}
          </h2>
          <p className="text-xs text-slate-500">
            {canManage
              ? "Track monthly commitments, pending videos, and brand guidelines per client"
              : "Access client brand drive links, fonts, and editing guidelines"}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mt-2">No Clients Added Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Add your clients here to set monthly targets, store brand drive links, and manage their marketing workflow.
          </p>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add First Client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((c) => {
            const total = c.total_videos || 0;
            const posted = c.posted_count || 0;
            const pending = c.pending_count || 0;
            const pct = Math.min(100, Math.round((posted / Math.max(1, c.monthly_target)) * 100));

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                        <p className="text-xs text-slate-500">{c.industry}</p>
                      </div>
                    </div>
                    {canManage && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.monthly_target} / month
                      </span>
                    )}
                  </div>

                  {canManage && (
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          Posted: <strong className="text-slate-900">{posted}</strong> • Pending:{" "}
                          <strong className="text-amber-700">{pending}</strong>
                        </span>
                        <span className="font-bold text-indigo-600">{pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {c.guidelines && (
                    <p className="mt-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {c.guidelines}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {c.brand_drive_url ? (
                    <a
                      href={c.brand_drive_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                    >
                      Brand Drive Kit <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No Drive link</span>
                  )}

                  <button
                    onClick={() => onViewClientVideos(c.id)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    View {total} Videos <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Add New Client</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zenith Dental Studio"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Healthcare / Retail"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Target
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand Drive URL
                </label>
                <input
                  type="url"
                  value={brandDriveUrl}
                  onChange={(e) => setBrandDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Editing & Brand Guidelines
                </label>
                <textarea
                  rows={3}
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  placeholder="Fonts, colors, tone..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                />
              </div>
              {error && (
                <p className="text-xs text-rose-600 font-medium">{error}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {saving ? "Adding..." : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
