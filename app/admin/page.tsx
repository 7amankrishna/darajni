import { notFound } from "next/navigation";

export default function AdminPage() {
  // The secure commerce dashboard is introduced in Phase 4. Keeping the route
  // unavailable avoids exposing the removed legacy profile/review dashboard.
  notFound();
}
