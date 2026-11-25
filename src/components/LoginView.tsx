"use client";

import React, { useState } from "react";
import { Clapperboard, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import type { StaffMember } from "@/types/portal";

interface LoginViewProps {
  onSuccess: (user: StaffMember) => void;
}

const QUICK_ACCOUNTS = [
  { label: "Thavabalan (Owner)", email: "thavabalan@wegrow.in", role: "Owner" },
  { label: "Rajavalli (Manager)", email: "rajavalli@wegrow.in", role: "Manager" },
  { label: "Mareeswaran (Content)", email: "mareeswaran@wegrow.in", role: "Content Creator" },
  { label: "Rahul (Editor)", email: "rahul@wegrow.in", role: "Editor" },
  { label: "Millar (AI Creator)", email: "millar@wegrow.in", role: "AI Content Creator" },
  { label: "Pandeeswaran (Cameraman)", email: "pandeeswaran@wegrow.in", role: "Cameraman" },
];

export default function LoginView({ onSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("thavabalan@wegrow.in");
  const [password, setPassword] = useState("wegrow123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitLogin(targetEmail: string, targetPassword: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      onSuccess(data.user);
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.18),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(8,145,178,0.14),_transparent_45%)] pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Clapperboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                WEGROW Studio OS
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Video Production & Marketing Ops
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@wegrow.in"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In to Workspace"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Role Switcher */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            WEGROW Quick Login (Default: <code className="text-slate-700 font-mono">wegrow123</code>)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword("wegrow123");
                  submitLogin(acc.email, "wegrow123");
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-700 font-medium transition cursor-pointer"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
