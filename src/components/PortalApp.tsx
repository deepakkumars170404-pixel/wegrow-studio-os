"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Clapperboard,
  LayoutDashboard,
  Kanban,
  Building2,
  CalendarDays,
  Users,
  Plus,
  Search,
  LogOut,
  CheckSquare,
} from "lucide-react";
import { ROLE_META } from "@/lib/constants";
import type { VideoStage } from "@/lib/db";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";
import LoginView from "./LoginView";
import OverviewTab from "./OverviewTab";
import PipelineTab from "./PipelineTab";
import ClientsTab from "./ClientsTab";
import CalendarTab from "./CalendarTab";
import StaffTab from "./StaffTab";
import VideoDrawer from "./VideoDrawer";

type TabKey = "overview" | "pipeline" | "clients" | "calendar" | "staff";

export default function PortalApp() {
  const [user, setUser] = useState<StaffMember | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | "all">("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  const fetchAllData = useCallback(async () => {
    const [vRes, cRes, sRes] = await Promise.all([
      fetch("/api/videos"),
      fetch("/api/clients"),
      fetch("/api/staff"),
    ]);
    if (vRes.ok) {
      const vData = await vRes.json();
      setVideos(vData.videos || []);
    }
    if (cRes.ok) {
      const cData = await cRes.json();
      setClients(cData.clients || []);
    }
    if (sRes.ok) {
      const sData = await sRes.json();
      setStaff(sData.staff || []);
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            if (
              data.user.role === "editor" ||
              data.user.role === "content_writer" ||
              data.user.role === "ai_content_creator" ||
              data.user.role === "cameraman"
            ) {
              setActiveTab("pipeline");
              setMyTasksOnly(true);
            }
            await fetchAllData();
          }
        }
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, [fetchAllData]);

  async function handleLoginSuccess(loggedInUser: StaffMember) {
    setUser(loggedInUser);
    if (
      loggedInUser.role === "editor" ||
      loggedInUser.role === "content_writer" ||
      loggedInUser.role === "ai_content_creator" ||
      loggedInUser.role === "cameraman"
    ) {
      setActiveTab("pipeline");
      setMyTasksOnly(true);
    } else {
      setActiveTab("overview");
      setMyTasksOnly(false);
    }
    await fetchAllData();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setVideos([]);
    setClients([]);
    setStaff([]);
  }

  async function handleStageChange(videoId: number, newStage: VideoStage) {
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, stage: newStage } : v))
    );
    await fetch(`/api/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    fetchAllData();
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 text-sm">
        Loading WEGROW Studio OS...
      </div>
    );
  }

  if (!user) {
    return <LoginView onSuccess={handleLoginSuccess} />;
  }

  const canManageOps =
    user.role === "owner" || user.role === "admin" || user.role === "manager";
  const canManageStaff = user.role === "owner" || user.role === "admin";
  const canCreateVideo = user.role !== "editor" && user.role !== "cameraman";

  const visibleVideos = videos.filter((v) => {
    if (myTasksOnly) {
      const isMine =
        v.assigned_editor_id === user.id ||
        v.assigned_writer_id === user.id ||
        v.assigned_cameraman_id === user.id;
      if (!isMine) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        v.title.toLowerCase().includes(q) ||
        v.client_name.toLowerCase().includes(q) ||
        (v.editor_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    ...(canManageOps
      ? [
          {
            key: "overview" as const,
            label: "Executive Overview",
            icon: <LayoutDashboard className="w-4 h-4" />,
          },
        ]
      : []),
    {
      key: "pipeline",
      label:
        user.role === "editor"
          ? "My Editing Queue"
          : user.role === "cameraman"
          ? "My Shoot Queue"
          : user.role === "content_writer" || user.role === "ai_content_creator"
          ? "My Content Queue"
          : "Video Pipeline",
      icon: <Kanban className="w-4 h-4" />,
    },
    {
      key: "clients",
      label: canManageOps ? "Client Hub" : "Brand Kits",
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      key: "calendar",
      label: "Posting Calendar",
      icon: <CalendarDays className="w-4 h-4" />,
    },
    ...(canManageStaff
      ? [
          {
            key: "staff" as const,
            label: "Team & Staff",
            icon: <Users className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                WEGROW Studio OS
              </h1>
              <p className="text-[11px] text-slate-400">Marketing Operations</p>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logged-in User Card */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
              style={{ backgroundColor: user.avatar_color }}
            >
              {user.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">
                {ROLE_META[user.role].label}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, clients, editors..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {canManageOps && (
              <button
                onClick={() => setMyTasksOnly((v) => !v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                  myTasksOnly
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                My Tasks Only
              </button>
            )}

            {canCreateVideo && (
              <button
                onClick={() => {
                  setEditingVideo(null);
                  setDrawerOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Video
              </button>
            )}
          </div>
        </header>

        {/* Active View */}
        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
          {activeTab === "overview" && (
            <OverviewTab
              videos={visibleVideos}
              clients={clients}
              staff={staff}
              onOpenVideo={(v) => {
                setEditingVideo(v);
                setDrawerOpen(true);
              }}
              onSelectClient={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab("pipeline");
              }}
            />
          )}

          {activeTab === "pipeline" && (
            <PipelineTab
              videos={visibleVideos}
              clients={clients}
              staff={staff}
              userRole={user.role}
              selectedClientId={selectedClientId}
              onClientFilterChange={setSelectedClientId}
              onOpenVideo={(v) => {
                setEditingVideo(v);
                setDrawerOpen(true);
              }}
              onStageChange={handleStageChange}
            />
          )}

          {activeTab === "clients" && (
            <ClientsTab
              clients={clients}
              canManage={canManageOps}
              onRefresh={fetchAllData}
              onViewClientVideos={(clientId) => {
                setSelectedClientId(clientId);
                setActiveTab("pipeline");
              }}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarTab
              videos={visibleVideos}
              onOpenVideo={(v) => {
                setEditingVideo(v);
                setDrawerOpen(true);
              }}
            />
          )}

          {activeTab === "staff" && (
            <StaffTab
              staff={staff}
              videos={videos}
              currentUser={user}
              onRefresh={fetchAllData}
            />
          )}
        </main>
      </div>

      <VideoDrawer
        open={drawerOpen}
        video={editingVideo}
        clients={clients}
        staff={staff}
        userRole={user.role}
        canDelete={canManageOps}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchAllData}
      />
    </div>
  );
}
