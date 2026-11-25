"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, ExternalLink, Save } from "lucide-react";
import { CONTENT_TYPES, VIDEO_STAGES } from "@/lib/constants";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";
import type { UserRole, VideoPriority, VideoStage } from "@/lib/db";

interface VideoDrawerProps {
  open: boolean;
  video: VideoItem | null;
  clients: ClientItem[];
  staff: StaffMember[];
  userRole: UserRole;
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function VideoDrawer({
  open,
  video,
  clients,
  staff,
  userRole,
  canDelete,
  onClose,
  onSaved,
}: VideoDrawerProps) {
  const isManagerOrAbove =
    userRole === "owner" || userRole === "admin" || userRole === "manager";
  const isEditorOrCameraman = userRole === "editor" || userRole === "cameraman";
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<number>(0);
  const [contentType, setContentType] = useState("Reel");
  const [stage, setStage] = useState<VideoStage>("script");
  const [priority, setPriority] = useState<VideoPriority>("normal");
  const [editorId, setEditorId] = useState<string>("");
  const [writerId, setWriterId] = useState<string>("");
  const [cameramanId, setCameramanId] = useState<string>("");
  const [editDeadline, setEditDeadline] = useState("");
  const [postingDate, setPostingDate] = useState("");
  const [rawLink, setRawLink] = useState("");
  const [finalLink, setFinalLink] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (video) {
      setTitle(video.title);
      setClientId(video.client_id);
      setContentType(video.content_type);
      setStage(video.stage);
      setPriority(video.priority);
      setEditorId(video.assigned_editor_id ? String(video.assigned_editor_id) : "");
      setWriterId(video.assigned_writer_id ? String(video.assigned_writer_id) : "");
      setCameramanId(video.assigned_cameraman_id ? String(video.assigned_cameraman_id) : "");
      const normalizedDeadline = video.edit_deadline
        ? video.edit_deadline.includes("T")
          ? video.edit_deadline.slice(0, 16)
          : `${video.edit_deadline}T18:00`
        : "";
      setEditDeadline(normalizedDeadline);
      setPostingDate(video.posting_date || "");
      setRawLink(video.raw_link || "");
      setFinalLink(video.final_link || "");
      setLiveUrl(video.live_url || "");
      setNotes(video.notes || "");
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setTitle("");
      setClientId(clients[0]?.id || 0);
      setContentType("Reel");
      setStage("script");
      setPriority("normal");
      setEditorId("");
      setWriterId("");
      setCameramanId("");
      setEditDeadline(`${today}T18:00`);
      setPostingDate("");
      setRawLink("");
      setFinalLink("");
      setLiveUrl("");
      setNotes("");
    }
  }, [open, video, clients]);

  if (!open) return null;

  const editors = staff.filter(
    (s) =>
      s.active &&
      (s.role === "editor" ||
        s.role === "ai_content_creator" ||
        s.role === "manager" ||
        s.role === "admin")
  );
  const writers = staff.filter(
    (s) =>
      s.active &&
      (s.role === "content_writer" ||
        s.role === "ai_content_creator" ||
        s.role === "manager" ||
        s.role === "admin")
  );

  const cameramen = staff.filter(
    (s) =>
      s.active &&
      (s.role === "cameraman" || s.role === "manager" || s.role === "admin")
  );
  const drawerStages =
    userRole === "editor"
      ? VIDEO_STAGES.filter((s) => s.key !== "script")
      : VIDEO_STAGES;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        title,
        content_type: contentType,
        stage,
        priority,
        assigned_editor_id: editorId ? Number(editorId) : null,
        assigned_writer_id: writerId ? Number(writerId) : null,
        assigned_cameraman_id: cameramanId ? Number(cameramanId) : null,
        edit_deadline: editDeadline,
        posting_date: postingDate,
        raw_link: rawLink,
        final_link: finalLink,
        live_url: liveUrl,
        notes,
      };

      const res = await fetch(video ? `/api/videos/${video.id}` : "/api/videos", {
        method: video ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save video.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!video || !confirm(`Delete "${video.title}"?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });
      if (res.ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {video ? "Video Production Details" : "Add New Video Task"}
            </h2>
            <p className="text-xs text-slate-500">
              {video ? `Task #${video.id} • ${video.client_name}` : "Assign client, stage, editor & deadlines"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Video Title *
            </label>
            <input
              type="text"
              required
              disabled={isEditorOrCameraman}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HydraFacial Before & After Reel"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 disabled:bg-slate-100 disabled:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client *
              </label>
              <select
                disabled={!isManagerOrAbove && Boolean(video)}
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Content Format
              </label>
              <select
                disabled={!isManagerOrAbove && Boolean(video)}
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Production Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as VideoStage)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {drawerStages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                disabled={!isManagerOrAbove}
                value={priority}
                onChange={(e) => setPriority(e.target.value as VideoPriority)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Video Editor
              </label>
              <select
                disabled={!isManagerOrAbove}
                value={editorId}
                onChange={(e) => setEditorId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">Unassigned</option>
                {editors.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Content Writer
              </label>
              <select
                disabled={!isManagerOrAbove}
                value={writerId}
                onChange={(e) => setWriterId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              >
                <option value="">Unassigned</option>
                {writers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Cameraman (Shoot)
            </label>
            <select
              disabled={!isManagerOrAbove}
              value={cameramanId}
              onChange={(e) => setCameramanId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Unassigned</option>
              {cameramen.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Edit Deadline (Date & Time)
              </label>
              <input
                type="datetime-local"
                disabled={!isManagerOrAbove}
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Posting Date (Post Live Date)
              </label>
              <input
                type="date"
                disabled={!isManagerOrAbove}
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raw Footage Drive Link
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={rawLink}
                  onChange={(e) => setRawLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {rawLink && (
                  <a
                    href={rawLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Final Edited Cut Link (For Review)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={finalLink}
                  onChange={(e) => setFinalLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {finalLink && (
                  <a
                    href={finalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 flex items-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {video?.review_token && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-bold text-indigo-900 block">Client Review Link:</span>
                  <span className="text-indigo-600 text-[11px] font-mono">/review/{video.review_token}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/review/${video.review_token}`);
                      alert("Client Review Link copied to clipboard!");
                    }}
                    className="px-2.5 py-1 bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg shadow-2xs cursor-pointer"
                  >
                    Copy
                  </button>
                  <a
                    href={`/review/${video.review_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Live Post URL (After Posting)
              </label>
              <input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Production Notes / Revision Feedback
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hooks, music notes, client feedback..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {video && canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Video"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
