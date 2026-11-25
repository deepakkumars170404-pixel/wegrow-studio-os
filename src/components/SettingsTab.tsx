"use client";

import React, { useEffect, useState } from "react";
import {
  Share2,
  MessageSquare,
  Building,
  CheckCircle2,
  Send,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function SettingsTab() {
  const [socialAutoPosting, setSocialAutoPosting] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const json = await res.json();
          setSocialAutoPosting(json.settings.social_auto_posting === "1");
          setWhatsappEnabled(json.settings.whatsapp_enabled !== "0");
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

  async function handleSendTestWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (!testPhone.trim()) return;
    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone,
          message:
            "🚀 *WEGROW Studio OS Test Alert*\n\nWhatsApp Gateway (mydreamstechnology) is successfully connected to your studio portal! Automated shoot & edit deadline notifications are active.",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          msg: "WhatsApp test alert dispatched successfully!",
        });
      } else {
        setTestResult({
          success: false,
          msg: data.error || "Failed to dispatch test WhatsApp",
        });
      }
    } catch {
      setTestResult({ success: false, msg: "Network error" });
    } finally {
      setTestSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Organization & System Settings
        </h2>
        <p className="text-xs text-slate-500">
          Configure social media auto-posting, WhatsApp gateway, and multi-tenant controls
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

      {/* Feature 2: WhatsApp Gateway Integration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                WhatsApp Business Gateway Automation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-lg leading-relaxed">
                Powered by <strong>mydreamstechnology</strong> WhatsApp API gateway. Automatically sends alerts when Pandeeswaran marks a shoot done, and alerts editors 2 hours before deadlines.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const nextVal = !whatsappEnabled;
              setWhatsappEnabled(nextVal);
              updateSetting("whatsapp_enabled", nextVal ? "1" : "0");
            }}
            disabled={saving}
            className="cursor-pointer transition shrink-0"
          >
            {whatsappEnabled ? (
              <ToggleRight className="w-9 h-9 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-9 h-9 text-slate-300 hover:text-slate-400" />
            )}
          </button>
        </div>

        {/* Credentials overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
          <div>
            <span className="text-slate-500 block">Active License Number:</span>
            <code className="font-bold text-slate-800">90093749600</code>
          </div>
          <div>
            <span className="text-slate-500 block">Gateway Endpoint:</span>
            <code className="text-slate-700">https://wa.mydreamstechnology.in/</code>
          </div>
        </div>

        {/* Send Test WhatsApp Alert */}
        <div className="pt-2">
          <h4 className="text-xs font-bold text-slate-800 mb-2">Send Test WhatsApp Message</h4>
          <form onSubmit={handleSendTestWhatsApp} className="flex gap-2">
            <input
              type="tel"
              required
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Enter 10-digit mobile number (e.g. 9876543210)"
              className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={testSending}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test Alert
            </button>
          </form>

          {testResult && (
            <p
              className={`text-xs font-semibold mt-2 ${
                testResult.success ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {testResult.msg}
            </p>
          )}
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
