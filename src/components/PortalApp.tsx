"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Clapperboard,
  Film,
  Building2,
  CalendarDays,
  Users,
  Plus,
  Search,
  LogOut,
  ListTodo,
  TrendingUp,
  Settings,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { ROLE_META } from "@/lib/constants";
import type { VideoStage } from "@/lib/db";
import type { ClientItem, StaffMember, VideoItem } from "@/types/portal";
import LoginView from "./LoginView";
import OwnerHubTab from "./OwnerHubTab";
import StaffQueueTab from "./StaffQueueTab";
import ClientsTab from "./ClientsTab";
import CalendarTab from "./CalendarTab";
import StaffTab from "./StaffTab";
import AnalyticsTab from "./AnalyticsTab";
import SettingsTab from "./SettingsTab";
import ProfileModal from "./ProfileModal";
import VideoDrawer from "./VideoDrawer";

type TabKey =
  | "videos"
  | "my_queue"
  | "analytics"
  | "clients"
  | "calendar"
  | "staff"
  | "settings";

export default function PortalApp() {
  const [user, setUser] = useState<StaffMember | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("videos");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
    // Background check for approaching deadlines (Zero-cost cron)
    fetch("/api/cron/deadline-alerts").catch(() => {});
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            const isStaff =
              data.user.role === "editor" ||
              data.user.role === "cameraman" ||
              data.user.role === "content_writer" ||
              data.user.role === "ai_content_creator";
            setActiveTab(isStaff ? "my_queue" : "videos");
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
    const isStaff =
      loggedInUser.role === "editor" ||
      loggedInUser.role === "cameraman" ||
      loggedInUser.role === "content_writer" ||
      loggedInUser.role === "ai_content_creator";
    setActiveTab(isStaff ? "my_queue" : "videos");
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        v.title.toLowerCase().includes(q) ||
        v.client_name.toLowerCase().includes(q) ||
        (v.editor_name || "").toLowerCase().includes(q) ||
        (v.cameraman_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Navigation Items per Role
  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    ...(canManageOps
      ? [
          {
            key: "videos" as const,
            label: "All Videos & Tasks",
            icon: <Film className="w-4 h-4" />,
          },
          {
            key: "analytics" as const,
            label: "Performance & Velocity",
            icon: <TrendingUp className="w-4 h-4" />,
          },
        ]
      : [
          {
            key: "my_queue" as const,
            label:
              user.email.toLowerCase().includes("mareeswaran") ||
              user.email.toLowerCase().includes("millar")
                ? "Publishing & Live Queue"
                : user.email.toLowerCase().includes("rajkumar")
                ? "SkillCampus Pipeline"
                : user.email.toLowerCase().includes("gopinath")
                ? "Jobz Pipeline"
                : user.role === "editor"
                ? "My Editing Queue"
                : user.role === "cameraman"
                ? "My Shoot Queue"
                : user.role === "ai_content_creator"
                ? "My AI Content"
                : "My Scripts & Content",
            icon: <ListTodo className="w-4 h-4" />,
          },
        ]),
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
          {
            key: "settings" as const,
            label: "System Settings",
            icon: <Settings className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      {/* Mobile Top App Bar (shown only on < md screens) */}
      <div className="md:hidden bg-slate-950 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Clapperboard className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-white tracking-tight">WEGROW Studio OS</h1>
            <p className="text-[10px] text-slate-400">Marketing Operations</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-900 text-slate-200 hover:text-white cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - FIXED to viewport on desktop, physically impossible to scroll or stretch */}
      <aside
        className={`w-full md:w-64 bg-slate-950 text-slate-200 flex flex-col justify-between shrink-0 border-r border-slate-800/80 z-40 transition-all duration-200 ${
          mobileMenuOpen
            ? "fixed inset-y-0 left-0 w-72 max-w-[85vw] flex h-full z-50 shadow-2xl"
            : "hidden md:flex md:fixed md:inset-y-0 md:left-0 md:w-64 md:h-screen md:max-h-screen"
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          <div className="p-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-3">
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
            {mobileMenuOpen && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <nav className="p-3 space-y-1 overflow-y-auto flex-1 min-h-0">
            {navItems.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key);
                    setMobileMenuOpen(false);
                  }}
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

        {/* Logged-in User Card - permanently pinned to the bottom of the screen */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2 shrink-0 bg-slate-950">
          <button
            onClick={() => {
              setProfileOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-900 text-left transition cursor-pointer group"
          >
            <span
              className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
              style={{ backgroundColor: user.avatar_color }}
            >
              {user.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {ROLE_META[user.role].label}
              </p>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 shrink-0" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area - with left padding on desktop for fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30 shrink-0">
          <div className="relative w-full max-w-xs sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, clients, crew..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {canCreateVideo && (
              <button
                onClick={() => {
                  setEditingVideo(null);
                  setDrawerOpen(true);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">Add Video</span>
              </button>
            )}

            {/* Quick User Badge & Sign Out in Top Header */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 shrink-0">
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer group text-left"
                title="Edit Profile & Password"
              >
                <span
                  className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.name.charAt(0)}
                </span>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-indigo-600">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    {ROLE_META[user.role].label}
                  </p>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Active Page View */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {/* OWNER / ADMIN / MANAGER VIEW */}
          {activeTab === "videos" && canManageOps && (
            <OwnerHubTab
              videos={visibleVideos}
              clients={clients}
              staff={staff}
              onOpenVideo={(v) => {
                setEditingVideo(v);
                setDrawerOpen(true);
              }}
              onStageChange={handleStageChange}
              onNewVideo={() => {
                setEditingVideo(null);
                setDrawerOpen(true);
              }}
              onSelectClient={() => {
                setActiveTab("clients");
              }}
            />
          )}

          {/* ANALYTICS & VELOCITY TAB */}
          {activeTab === "analytics" && canManageOps && <AnalyticsTab />}

          {/* STAFF DEDICATED QUEUE (Editor, Cameraman, Content Creator, AI Creator) */}
          {activeTab === "my_queue" && (
            <StaffQueueTab
              user={user}
              videos={visibleVideos}
              onOpenVideo={(v) => {
                setEditingVideo(v);
                setDrawerOpen(true);
              }}
              onStageChange={handleStageChange}
              onRefresh={fetchAllData}
              onNewVideo={() => {
                setEditingVideo(null);
                setDrawerOpen(true);
              }}
            />
          )}

          {/* CLIENTS TAB */}
          {activeTab === "clients" && (
            <ClientsTab
              clients={clients}
              canManage={canManageOps}
              onRefresh={fetchAllData}
              onViewClientVideos={() => {
                if (canManageOps) {
                  setActiveTab("videos");
                } else {
                  setActiveTab("my_queue");
                }
              }}
            />
          )}

          {/* CALENDAR TAB */}
          {activeTab === "calendar" && (
            <CalendarTab
              videos={visibleVideos}
              onOpenVideo={(v) => {
                setEditingVideo(v);
                setDrawerOpen(true);
              }}
            />
          )}

          {/* TEAM & STAFF MANAGEMENT TAB */}
          {activeTab === "staff" && canManageStaff && (
            <StaffTab
              staff={staff}
              videos={videos}
              currentUser={user}
              onRefresh={fetchAllData}
            />
          )}

          {/* SYSTEM SETTINGS TAB */}
          {activeTab === "settings" && canManageStaff && <SettingsTab />}
        </main>
      </div>

      {/* Video Details & Editing Drawer */}
      <VideoDrawer
        open={drawerOpen}
        video={editingVideo}
        clients={clients}
        staff={staff}
        userRole={user.role}
        currentUser={user}
        canDelete={canManageOps}
        onClose={() => setDrawerOpen(false)}
        onSaved={fetchAllData}
      />

      {/* Profile & Password Change Modal */}
      <ProfileModal
        user={user}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onProfileUpdated={(updated) => {
          setUser(updated);
          fetchAllData();
        }}
      />
    </div>
  );
}
