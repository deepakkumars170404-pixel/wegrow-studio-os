"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Trash2, ExternalLink, Save, Plus, Building2, Check, CheckCircle2 } from "lucide-react";
import { CONTENT_TYPES, VIDEO_STAGES, WEGROW_TEAMS, TEAM_META, type WegrowTeam } from "@/lib/constants";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";
import type { UserRole, VideoPriority, VideoStage } from "@/lib/db";

interface VideoDrawerProps {
  open: boolean;
  video: VideoItem | null;
  clients: ClientItem[];
  staff: StaffMember[];
  userRole: UserRole;
  currentUser?: StaffMember;
  canDelete: boolean;
  onClose: () => void;
  onSaved: () => void;
  onRefreshClients?: () => void;
}

export default function VideoDrawer({
  open,
  video,
  clients,
  staff,
  userRole,
  currentUser,
  canDelete,
  onClose,
  onSaved,
  onRefreshClients,
}: VideoDrawerProps) {
  const isManagerOrAbove =
    userRole === "owner" || userRole === "admin" || userRole === "manager";
  const isEditorOrCameraman = userRole === "editor" || userRole === "cameraman";
  const [team, setTeam] = useState<WegrowTeam>("BSchool");
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

  // New Client creation state inside Video Drawer
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [createdClientName, setCreatedClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Focus ref for Video Title input when proceeding from Step 1
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Guard against wiping user's typed contents when background data refreshes
  const isInitializedRef = useRef(false);
  const currentVideoIdRef = useRef<number | null | undefined>(undefined);

  function handleSelectTeam(newTeam: WegrowTeam) {
    setTeam(newTeam);
    // Auto-assign Pandeeswaran as cameraman for all 3 teams!
    const pandeeswaran = staff.find((s) => s.email.toLowerCase().includes("pandeeswaran"));
    if (pandeeswaran) setCameramanId(String(pandeeswaran.id));

    // Auto-assign Rahul as editor for all 3 teams!
    const rahul = staff.find((s) => s.email.toLowerCase().includes("rahul"));
    if (rahul) setEditorId(String(rahul.id));

    // Auto-assign team-specific Content Creator / Reviewer
    if (newTeam === "BSchool") {
      const rajavalli = staff.find((s) => s.email.toLowerCase().includes("rajavalli"));
      if (rajavalli) setWriterId(String(rajavalli.id));
    } else if (newTeam === "SkillCampus") {
      const rajkumar = staff.find((s) => s.email.toLowerCase().includes("rajkumar"));
      if (rajkumar) setWriterId(String(rajkumar.id));
    } else if (newTeam === "Jobz") {
      const gopinath = staff.find((s) => s.email.toLowerCase().includes("gopinath"));
      if (gopinath) setWriterId(String(gopinath.id));
    }
  }

  useEffect(() => {
    if (!open) {
      isInitializedRef.current = false;
      return;
    }

    // Only populate/reset fields if drawer just opened or switching between videos
    const videoChanged = video ? video.id !== currentVideoIdRef.current : currentVideoIdRef.current !== null;

    if (!isInitializedRef.current || videoChanged) {
      isInitializedRef.current = true;
      currentVideoIdRef.current = video ? video.id : null;
      setError("");

      if (video) {
        setTeam((video.team as WegrowTeam) || "BSchool");
        setTitle(video.title);
        setClientId(video.client_id);
        setIsAddingNewClient(false);
        setCreatedClientName("");
        setNewClientName("");
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
        const hasClients = clients.length > 0;
        setClientId(hasClients ? clients[0].id : 0);
        setIsAddingNewClient(!hasClients);
        setCreatedClientName("");
        setNewClientName("");
        setContentType("Reel");
        setStage("script");
        setPriority("normal");
        setEditDeadline(`${today}T18:00`);
        setPostingDate("");
        setRawLink("");
        setFinalLink("");
        setLiveUrl("");
        setNotes("");

        // Apply initial smart default team assignment
        let defaultTeam: WegrowTeam = "BSchool";
        if (currentUser?.email?.toLowerCase().includes("rajkumar")) {
          defaultTeam = "SkillCampus";
        } else if (currentUser?.email?.toLowerCase().includes("gopinath")) {
          defaultTeam = "Jobz";
        }
        handleSelectTeam(defaultTeam);
      }
    }
  }, [open, video]);

  async function handleQuickCreateClient(e?: React.MouseEvent | React.KeyboardEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanName = newClientName.trim();
    if (!cleanName) {
      setError("Please enter a client name.");
      return;
    }
    setCreatingClient(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, industry: "General", monthly_target: 12 }),
      });
      const data = await res.json();
      if (!res.ok || !data.client?.id) {
        setError(data.error || "Failed to create client.");
        return;
      }
      const newId = Number(data.client.id);
      setClientId(newId);
      setCreatedClientName(cleanName);
      setIsAddingNewClient(false);
      setNewClientName("");

      // Refresh clients list in parent without resetting drawer form or closing!
      if (onRefreshClients) {
        onRefreshClients();
      }

      // Smoothly focus on video title in Step 2
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
    } catch {
      setError("Network error while creating client.");
    } finally {
      setCreatingClient(false);
    }
  }

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

  const selectedClient = clients.find((c) => c.id === clientId);
  const activeClientName =
    selectedClient?.name || createdClientName || (video?.client_name ?? "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let finalClientId = clientId;

    // If user typed a new client name in the box without clicking proceed button, create it automatically!
    if (isAddingNewClient || !finalClientId || clients.length === 0) {
      const cleanName = newClientName.trim();
      if (!cleanName && !finalClientId) {
        setError("Please enter or select a Client Name in Step 1 first.");
        return;
      }
      if (cleanName && (!finalClientId || isAddingNewClient)) {
        setSaving(true);
        try {
          const cRes = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: cleanName, industry: "General", monthly_target: 12 }),
          });
          const cData = await cRes.json();
          if (!cRes.ok || !cData.client?.id) {
            setError(cData.error || "Failed to create client.");
            setSaving(false);
            return;
          }
          finalClientId = Number(cData.client.id);
          setClientId(finalClientId);
          setCreatedClientName(cleanName);
          setIsAddingNewClient(false);
          setNewClientName("");
          if (onRefreshClients) onRefreshClients();
        } catch {
          setError("Network error while creating client.");
          setSaving(false);
          return;
        }
      }
    }

    if (!finalClientId) {
      setError("Please select or add a Client in Step 1 first.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a Video Title in Step 2.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_id: finalClientId,
        title: title.trim(),
        team,
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

        {/* INTERNAL REVIEW QUICK ACTION BANNER */}
        {video && video.stage === "internal_review" && (
          <div className="mx-6 mt-4 p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">
                  Cut Ready for Internal Approval
                </p>
                <p className="text-[11px] text-amber-800">
                  Rahul has submitted the cut. Review and approve or request revision.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              {video.final_link && (
                <a
                  href={video.final_link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl flex items-center gap-1 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Watch Cut
                </a>
              )}
              <button
                type="button"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await fetch(`/api/videos/${video.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ stage: "client_approval" }),
                    });
                    onSaved();
                    onClose();
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" /> Internal Approve
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* STEP 1: CLIENT SELECTION & CREATION (MANDATORY FIRST STEP) */}
          <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
                  1
                </span>
                <label className="text-xs font-bold text-slate-900">
                  Client *
                </label>
              </div>

              {clients.length > 0 && !video && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewClient(!isAddingNewClient);
                    setError("");
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                >
                  {isAddingNewClient ? "← Choose Existing Client" : "+ Add New Client"}
                </button>
              )}
            </div>

            {/* Quick Add Client Input */}
            {isAddingNewClient || clients.length === 0 ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Building2 className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleQuickCreateClient(e);
                        }
                      }}
                      placeholder="Enter Client Name (e.g. Aura Aesthetics, Apple Dental)..."
                      className="w-full pl-9 pr-3 py-2 text-xs border-2 border-indigo-500/60 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400 font-medium"
                      autoFocus={!video}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={creatingClient || !newClientName.trim()}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleQuickCreateClient(e);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {creatingClient ? (
                      "Saving..."
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Client & Proceed ➔
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-indigo-700 font-medium">
                  ✨ Type client name and click <b>Save Client & Proceed</b>. It saves to your Client Hub and unlocks video details below!
                </p>
              </div>
            ) : (
              /* Existing Client Select Dropdown */
              <div className="space-y-2">
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <select
                    disabled={!isManagerOrAbove && Boolean(video)}
                    value={clientId}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsAddingNewClient(true);
                        setNewClientName("");
                      } else {
                        setClientId(Number(e.target.value));
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 cursor-pointer"
                  >
                    <option value="0" disabled>
                      -- Select Client --
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="text-indigo-600 font-bold">
                      + Add New Client...
                    </option>
                  </select>
                </div>

                {activeClientName && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Client: {activeClientName}
                    </span>
                    {!video && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewClient(true);
                          setNewClientName("");
                        }}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        Change / Add New
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: VIDEO PRODUCTION DETAILS (Shown once Client is selected/added) */}
          {!clientId && !activeClientName ? (
            <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-1">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
              <p className="text-xs font-bold text-slate-700">First add or select a Client in Step 1 above</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Once client name is saved, video title, team routing, deadlines, and staff assignments will open right here!
              </p>
            </div>
          ) : (
            <>
              {/* Production Team / Brand Selector */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    2
                  </span>
                  <label className="text-xs font-bold text-slate-800">
                    Production Team / Brand *
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {WEGROW_TEAMS.map((t) => {
                    const isSelected = team === t;
                    const meta = TEAM_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={isEditorOrCameraman}
                        onClick={() => handleSelectTeam(t)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-indigo-500/20"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <span>{meta.iconLabel}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Flow: <span className="font-semibold text-slate-700">{TEAM_META[team].leadName} (Script)</span> ➔ <span className="font-semibold text-slate-700">Pandeeswaran (Shoot)</span> ➔ <span className="font-semibold text-slate-700">Rahul (Edit)</span> ➔ <span className="font-semibold text-slate-700">{TEAM_META[team].leadName} (Approval)</span> ➔ <span className="font-semibold text-slate-700">Publish</span>
                </p>
              </div>

              {/* Video Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Video Title *
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  required
                  disabled={isEditorOrCameraman}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. HydraFacial Before & After Reel"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>

              {/* Format, Stage, Priority in 3-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Content Format
                  </label>
                  <select
                    disabled={!isManagerOrAbove && Boolean(video)}
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 cursor-pointer"
                  >
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Production Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as VideoStage)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 cursor-pointer"
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Raw Footage Drive Link / Storage Location
                </label>
                <span className="text-[10px] text-slate-400">Drive link, or click preset</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rawLink}
                  onChange={(e) => setRawLink(e.target.value)}
                  placeholder="Drive link, or click preset below..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {rawLink && rawLink.startsWith("http") && (
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
              {/* Quick preset buttons for offline handover / local / SSD */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-medium">Quick presets:</span>
                <button
                  type="button"
                  onClick={() => setRawLink("💾 Hard Disk / SSD Handover")}
                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  💾 Hard Disk / SSD
                </button>
                <button
                  type="button"
                  onClick={() => setRawLink("💳 SD Card Handover")}
                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  💳 SD Card
                </button>
                <button
                  type="button"
                  onClick={() => setRawLink("💻 Studio Local PC")}
                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  💻 Studio Local PC
                </button>
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
          </>
          )}

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
                disabled={saving || (!clientId && !activeClientName)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : video ? "Save Changes" : "Create Video Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
