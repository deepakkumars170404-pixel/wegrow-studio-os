import type { UserRole, VideoPriority, VideoStage } from "@/lib/db";

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_color: string;
  active: number;
  created_at: string;
}

export interface ClientItem {
  id: number;
  name: string;
  industry: string;
  monthly_target: number;
  brand_drive_url: string;
  guidelines: string;
  status: "active" | "paused";
  total_videos?: number;
  posted_count?: number;
  ready_count?: number;
  pending_count?: number;
}

export interface VideoItem {
  id: number;
  client_id: number;
  client_name: string;
  client_industry: string;
  title: string;
  content_type: string;
  stage: VideoStage;
  priority: VideoPriority;
  assigned_editor_id: number | null;
  editor_name: string | null;
  editor_color: string | null;
  assigned_writer_id: number | null;
  writer_name: string | null;
  assigned_cameraman_id: number | null;
  cameraman_name: string | null;
  edit_deadline: string;
  posting_date: string;
  raw_link: string;
  final_link: string;
  live_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}
