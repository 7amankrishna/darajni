"use client";

import { Check, X } from "lucide-react";
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

  const pendingDresses = dresses.filter((d) => d.status === "pending" || d.status === "hidden");
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
            activeTab === "dresses" ? "text-accent" : "text-text-secondary"
          }`}
          onClick={() => setActiveTab("dresses")}
        >
          Custom Dresses ({pendingDresses.length})
        </button>
        <button
          className={`text-sm font-semibold uppercase tracking-wider ${
            activeTab === "comments" ? "text-accent" : "text-text-secondary"
          }`}
          onClick={() => setActiveTab("comments")}
        >
          Comments ({pendingComments.length})
        </button>
      </div>

      {activeTab === "dresses" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pendingDresses.length === 0 ? (
            <p className="text-sm text-text-secondary">No pending custom dresses to review.</p>
          ) : (
            pendingDresses.map((dress) => (
              <div key={dress.id} className="premium-card overflow-hidden">
                <div className="relative h-64 w-full">
                  <Image
                    src={dress.imageUrl}
                    alt="Custom dress request"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-text-secondary mb-4">
                    {dress.description || "No description provided."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveDress(dress.id)}
                      disabled={isPending}
                      className="primary-button flex-1 text-xs"
                    >
                      <Check className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleRejectDress(dress.id)}
                      disabled={isPending}
                      className="danger-button flex-1 text-xs"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
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
