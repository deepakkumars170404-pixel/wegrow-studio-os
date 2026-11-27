"use client";

import React, { useEffect, useState, use } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  MessageSquare,
  Sparkles,
  AlertCircle,
  ThumbsUp,
  RefreshCw,
  Send,
} from "lucide-react";

interface VideoData {
  id: number;
  title: string;
  contentType: string;
  stage: string;
  postingDate: string;
  finalLink: string;
  notes: string;
  clientName: string;
  clientIndustry: string;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && url.includes("drive.google.com")) {
    return `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`;
  }
  const ytMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  return null;
}

export default function ClientReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [approvalNote, setApprovalNote] = useState("");

  const fetchVideo = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/review/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load video details.");
      }
      setVideo(data.video);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading review link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVideo();
    }
  }, [token]);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`/api/review/${token}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", comment: approvalNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed.");
      setStatusMessage(data.message || "Video approved successfully!");
      if (video) setVideo({ ...video, stage: "scheduled" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting approval.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      setError("Please write your feedback before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`/api/review/${token}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_revision", feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setStatusMessage(data.message || "Revision request submitted.");
      setShowRevisionForm(false);
      setFeedback("");
      if (video) setVideo({ ...video, stage: "editing" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting revision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
          <p className="text-sm font-medium text-slate-300">Loading video preview...</p>
        </div>
      </div>
    );
  }

  if (error && !video) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl p-6 text-center text-white shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Link Not Available</h2>
          <p className="text-slate-400 text-sm mt-2">{error}</p>
          <p className="text-xs text-slate-500 mt-4">
            Please contact your account manager for an updated review link.
          </p>
        </div>
      </div>
    );
  }

  if (!video) return null;

  const isApproved = video.stage === "scheduled" || video.stage === "posted";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="bg-white rounded-2xl py-2 px-4 shadow-sm flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="WeGrow Production Hub"
              className="h-10 w-auto object-contain block"
            />
          </div>
          <span className="text-xs px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-slate-200 font-semibold">
            {video.clientName}
          </span>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Video Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded-md text-xs font-semibold mb-2">
                {video.contentType}
              </span>
              <h2 className="text-xl font-bold text-white">{video.title}</h2>
              {video.postingDate && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Target Publishing Date:{" "}
                  <span className="text-slate-200 font-medium">{video.postingDate}</span>
                </p>
              )}
            </div>

            {isApproved ? (
              <span className="px-3 py-1 bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-900/40 border border-amber-600/50 text-amber-300 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5" /> Ready for Review
              </span>
            )}
          </div>

          {/* Video Preview & Player */}
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
            <p className="text-xs text-slate-400 font-medium">Final Video Cut Preview:</p>
            {video.finalLink ? (
              <>
                {(() => {
                  const embedUrl = getEmbedUrl(video.finalLink);
                  if (embedUrl) {
                    return (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-black shadow-inner">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full border-0"
                          allow="autoplay; encrypted-media; fullscreen"
                          allowFullScreen
                          title={video.title}
                        />
                      </div>
                    );
                  }
                  return null;
                })()}

                <a
                  href={video.finalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  <Film className="w-4 h-4" />
                  Watch Video Cut in Full Quality (Google Drive)
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                Video file is being rendered. Check back shortly.
              </div>
            )}
          </div>

          {/* Notes from production */}
          {video.notes && (
            <div className="text-xs text-slate-400 bg-slate-950/30 p-3 rounded-lg border border-slate-800/80">
              <span className="font-semibold text-slate-300 block mb-1">Production Notes:</span>
              <p className="whitespace-pre-wrap">{video.notes}</p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        {isApproved ? (
          <div className="bg-emerald-950/40 border border-emerald-600/30 rounded-2xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-emerald-200">
              This video is approved for publishing!
            </h3>
            <p className="text-xs text-emerald-300/80">
              Our marketing team is scheduling it for social media distribution.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Client Decision
            </h3>

            {!showRevisionForm ? (
              <div className="space-y-4">
                {/* Optional praise note */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">
                    Optional note / praise for the editing team:
                  </label>
                  <input
                    type="text"
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    placeholder="e.g. Looks fantastic! Audio and pacing are on point."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    disabled={submitting}
                    onClick={handleApprove}
                    className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Approve Video
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => setShowRevisionForm(true)}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Request Changes
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRevision} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    What changes would you like us to make?
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRevisionForm(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <textarea
                  required
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g. At 0:12 please change subtitle font. Reduce background music at end..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Submit Changes to Editor
                </button>
              </form>
            )}
          </div>
        )}

        <div className="text-center text-[11px] text-slate-600 pt-6">
          Powered by <span className="text-indigo-400 font-semibold">WEGROW Studio OS</span> • Agency Video Operations Platform
        </div>
      </div>
    </div>
  );
}
