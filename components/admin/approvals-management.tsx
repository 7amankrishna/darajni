"use client";

import { Check, Mail, Phone, User, X } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";

import {
  approveDressComment,
  approveRequestedDress,
  rejectDressComment,
  rejectRequestedDress,
} from "@/actions/admin-approvals";
import type { AdminDressComment, AdminRequestedDress } from "@/types/admin";

export function ApprovalsManagement({
  dresses,
  comments,
}: {
  dresses: AdminRequestedDress[];
  comments: AdminDressComment[];
}) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"dresses" | "comments">("dresses");
  const pendingDressesCount = dresses.filter(
    (d) => d.status === "pending" || d.status === "hidden",
  ).length;
  const pendingCommentsCount = comments.filter(
    (c) => c.status === "pending",
  ).length;

  const [dressStatusFilter, setDressStatusFilter] = useState<
    "pending" | "published" | "rejected" | "all"
  >(pendingDressesCount > 0 ? "pending" : "all");

  const filteredDresses = dresses.filter((dress) => {
    if (dressStatusFilter === "pending") {
      return dress.status === "pending" || dress.status === "hidden";
    }
    if (dressStatusFilter === "published") {
      return dress.status === "published";
    }
    if (dressStatusFilter === "rejected") {
      return dress.status === "rejected";
    }
    return true;
  });

  const pendingComments = comments.filter((c) => c.status === "pending");

  const handleApproveDress = (id: string) => {
    startTransition(async () => {
      await approveRequestedDress(id);
    });
  };

  const handleRejectDress = (id: string) => {
    startTransition(async () => {
      await rejectRequestedDress(id);
    });
  };

  const handleApproveComment = (id: string) => {
    startTransition(async () => {
      await approveDressComment(id);
    });
  };

  const handleRejectComment = (id: string) => {
    startTransition(async () => {
      await rejectDressComment(id);
    });
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex gap-4 border-b border-border pb-4">
        <button
          className={`text-sm font-semibold uppercase tracking-wider ${
            activeTab === "dresses" ? "text-accent border-b-2 border-accent pb-1" : "text-text-secondary"
          }`}
          onClick={() => setActiveTab("dresses")}
        >
          Custom Dresses ({pendingDressesCount} Pending)
        </button>
        <button
          className={`text-sm font-semibold uppercase tracking-wider ${
            activeTab === "comments" ? "text-accent border-b-2 border-accent pb-1" : "text-text-secondary"
          }`}
          onClick={() => setActiveTab("comments")}
        >
          Comments ({pendingCommentsCount} Pending)
        </button>
      </div>

      {activeTab === "dresses" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setDressStatusFilter("pending")}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                dressStatusFilter === "pending"
                  ? "bg-accent text-white"
                  : "bg-surface-alt text-text-secondary hover:text-text-primary"
              }`}
            >
              Pending ({pendingDressesCount})
            </button>
            <button
              onClick={() => setDressStatusFilter("published")}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                dressStatusFilter === "published"
                  ? "bg-accent text-white"
                  : "bg-surface-alt text-text-secondary hover:text-text-primary"
              }`}
            >
              Published ({dresses.filter((d) => d.status === "published").length})
            </button>
            <button
              onClick={() => setDressStatusFilter("rejected")}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                dressStatusFilter === "rejected"
                  ? "bg-accent text-white"
                  : "bg-surface-alt text-text-secondary hover:text-text-primary"
              }`}
            >
              Rejected ({dresses.filter((d) => d.status === "rejected").length})
            </button>
            <button
              onClick={() => setDressStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                dressStatusFilter === "all"
                  ? "bg-accent text-white"
                  : "bg-surface-alt text-text-secondary hover:text-text-primary"
              }`}
            >
              All ({dresses.length})
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDresses.length === 0 ? (
              <p className="text-sm text-text-secondary col-span-full">
                No custom dresses found in this view.
              </p>
            ) : (
              filteredDresses.map((dress) => (
                <div key={dress.id} className="premium-card overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="relative h-64 w-full bg-surface-alt">
                      <Image
                        src={dress.imageUrl}
                        alt="Custom dress request"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span
                          className={`rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider backdrop-blur-md ${
                            dress.status === "published"
                              ? "bg-emerald-500/90 text-white"
                              : dress.status === "rejected"
                              ? "bg-red-500/90 text-white"
                              : "bg-amber-500/90 text-white"
                          }`}
                        >
                          {dress.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Customer Details Box */}
                      <div className="rounded-xl bg-surface-alt/70 p-3 space-y-1.5 border border-border/60 text-xs">
                        <div className="flex items-center gap-2 font-semibold text-text-primary">
                          <User className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span className="truncate">{dress.userName || "Guest Customer"}</span>
                        </div>
                        {dress.userEmail && (
                          <div className="flex items-center gap-2 text-text-secondary">
                            <Mail className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                            <a href={`mailto:${dress.userEmail}`} className="hover:underline truncate">
                              {dress.userEmail}
                            </a>
                          </div>
                        )}
                        {dress.userPhone && (
                          <div className="flex items-center gap-2 text-text-secondary">
                            <Phone className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                            <a href={`tel:${dress.userPhone}`} className="hover:underline">
                              {dress.userPhone}
                            </a>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-text-secondary line-clamp-3">
                        {dress.description || "No description provided."}
                      </p>
                      <p className="text-[0.65rem] text-text-secondary/70">
                        Uploaded {new Date(dress.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="flex gap-3">
                      {dress.status !== "published" && (
                        <button
                          onClick={() => handleApproveDress(dress.id)}
                          disabled={isPending}
                          className="primary-button flex-1 text-xs py-2"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </button>
                      )}
                      {dress.status !== "rejected" && (
                        <button
                          onClick={() => handleRejectDress(dress.id)}
                          disabled={isPending}
                          className="danger-button flex-1 text-xs py-2"
                        >
                          <X className="h-4 w-4" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "comments" && (
        <div className="space-y-4">
          {pendingComments.length === 0 ? (
            <p className="text-sm text-text-secondary">No pending comments to review.</p>
          ) : (
            pendingComments.map((comment) => {
              const dress = dresses.find((d) => d.id === comment.requestedDressId);
              return (
                <div key={comment.id} className="premium-card flex flex-col sm:flex-row gap-4 p-4">
                  {dress && (
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-alt">
                      <Image
                        src={dress.imageUrl}
                        alt="Dress"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-text-primary mb-2">"{comment.commentText}"</p>
                    <p className="text-xs text-text-secondary mb-4">
                      Posted on {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveComment(comment.id)}
                        disabled={isPending}
                        className="primary-button text-xs px-4"
                      >
                        <Check className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectComment(comment.id)}
                        disabled={isPending}
                        className="danger-button text-xs px-4"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
