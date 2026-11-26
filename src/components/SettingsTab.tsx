"use client";

import React, { useEffect, useState } from "react";
import {
  Share2,
  Building,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Zap,
} from "lucide-react";

export default function SettingsTab() {
  const [socialAutoPosting, setSocialAutoPosting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          setSocialAutoPosting(json.settings?.social_auto_posting === "1");
        }
      } catch (e) {
        console.warn("Failed to load settings:", e);
      }
    }
    loadSettings();
  }, []);

  async function updateSetting(key: string, value: string) {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Organization & System Settings
        </h2>
        <p className="text-xs text-slate-500">
          Configure social media auto-posting, studio engine velocity, and multi-tenant controls
        </p>
      </div>

      {/* Feature 1: Social Media Auto-Posting Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Direct Social Media Auto-Posting
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-lg leading-relaxed">
                Automatically publish reels and shorts directly to client Instagram & YouTube channels when videos reach <strong>Approved & Scheduled</strong> stage on their scheduled posting date.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const nextVal = !socialAutoPosting;
              setSocialAutoPosting(nextVal);
              updateSetting("social_auto_posting", nextVal ? "1" : "0");
            }}
            disabled={saving}
            className="cursor-pointer transition shrink-0"
          >
            {socialAutoPosting ? (
              <ToggleRight className="w-9 h-9 text-indigo-600" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-300 hover:text-slate-400" />
            )}
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Current Status:{" "}
            <strong className={socialAutoPosting ? "text-emerald-700" : "text-slate-500"}>
              {socialAutoPosting ? "ACTIVE (Auto-publish enabled)" : "DISABLED (Manual posting mode)"}
            </strong>
          </span>
          <span className="text-slate-400">
            {socialAutoPosting ? "Posts scheduled automatically" : "Staff will manually paste live post link"}
          </span>
        </div>
      </div>

      {/* Feature 2: High-Speed Instant Engine */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              High-Speed Instant Portal Engine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-lg leading-relaxed">
              Equipped with <strong>0ms Optimistic UI updates</strong>. All button clicks (Shoot Done, Editor Approvals, Internal & Client Reviews, Scheduled Posting) update instantly on your screen without waiting for network latency.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700 font-medium">Optimistic 0ms Button Response</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700 font-medium">Background Database Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700 font-medium">External Blocking Gateways Disabled</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700 font-medium">In-Memory Local Query Caching</span>
          </div>
        </div>
      </div>

      {/* Feature 3: Multi-Tenancy Architecture Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              SaaS Multi-Tenancy Architecture
            </h3>
            <p className="text-xs text-slate-500">
              Organization isolation and tenancy status
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-medium">Active Organization:</span>
            <span className="font-bold text-indigo-700">WEGROW Digital Marketing</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Tenant ID Partition:</span>
            <code className="bg-white px-2 py-0.5 rounded border border-slate-200">org_1</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Multi-Tenancy Readiness:</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Public SaaS Scaling
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
