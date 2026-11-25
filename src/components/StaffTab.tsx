"use client";

import React, { useState } from "react";
import { UserPlus, Shield, X, CheckCircle2, Ban } from "lucide-react";
import { ROLE_META } from "@/lib/constants";
import type { StaffMember, VideoItem } from "@/types/portal";
import type { UserRole } from "@/lib/db";

interface StaffTabProps {
  staff: StaffMember[];
  videos: VideoItem[];
  currentUser: StaffMember;
  onRefresh: () => void;
}

export default function StaffTab({
  staff,
  videos,
  currentUser,
  onRefresh,
}: StaffTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("wegrow123");
  const [role, setRole] = useState<UserRole>("editor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canManageStaff = currentUser.role === "owner" || currentUser.role === "admin";

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add staff.");
        return;
      }
      setName("");
      setEmail("");
      setPassword("wegrow123");
      setRole("editor");
      setShowModal(false);
      onRefresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !member.active }),
    });
    onRefresh();
  }

  async function changeRole(member: StaffMember, newRole: UserRole) {
    await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    onRefresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Team & Staff Management</h2>
          <p className="text-xs text-slate-500">
            {canManageStaff
              ? "Owner & Admin can add new staff, assign roles, and manage access"
              : "Active organization members and their current workload"}
          </p>
        </div>

        {canManageStaff && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add New Staff
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Team Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Permissions</th>
                <th className="py-3 px-4">Active Workload</th>
                <th className="py-3 px-4">Status</th>
                {canManageStaff && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {staff.map((m) => {
                const roleMeta = ROLE_META[m.role];
                const assignedCount = videos.filter(
                  (v) =>
                    (v.assigned_editor_id === m.id ||
                      v.assigned_writer_id === m.id ||
                      v.assigned_cameraman_id === m.id) &&
                    v.stage !== "posted"
                ).length;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: m.avatar_color }}
                        >
                          {m.name.charAt(0)}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{m.name}</p>
                          <p className="text-[11px] text-slate-500">{m.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {canManageStaff && m.role !== "owner" ? (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as UserRole)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer ${roleMeta.badgeClass}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="editor">Video Editor</option>
                          <option value="content_writer">Content Creator</option>
                          <option value="ai_content_creator">AI Content Creator</option>
                          <option value="cameraman">Cameraman</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${roleMeta.badgeClass}`}
                        >
                          <Shield className="w-3 h-3" />
                          {roleMeta.label}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                      {roleMeta.description}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {assignedCount} active videos
                    </td>

                    <td className="py-3.5 px-4">
                      {m.active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          <Ban className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>

                    {canManageStaff && (
                      <td className="py-3.5 px-4 text-right">
                        {m.role !== "owner" && (
                          <button
                            onClick={() => toggleActive(m)}
                            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-200 cursor-pointer"
                          >
                            {m.active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Staff Member</h3>
                <p className="text-xs text-slate-500">
                  Create an account for an Editor, Writer, Manager, or Admin
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikram (Editor 3)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@wegrow.in"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900"
                  >
                    <option value="editor">Video Editor</option>
                    <option value="content_writer">Content Creator</option>
                    <option value="ai_content_creator">AI Content Creator</option>
                    <option value="cameraman">Cameraman</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
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
                  {saving ? "Creating..." : "Add Staff Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
