import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="min-h-[70vh] grid place-items-center">
        <p className="eyebrow">Loading your account…</p>
      </main>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (!adminOnly && profile?.accountStatus === "blocked") {
    return (
      <main className="grid min-h-[70vh] place-items-center px-4 text-center">
        <div className="glass-panel max-w-xl p-7 sm:p-10">
          <p className="eyebrow !text-rose-300">Account blocked</p>
          <h1 className="font-display mt-4 text-5xl">Your account access is disabled.</h1>
          <p className="mt-5 text-sm leading-7 text-white/50">
            {profile.moderationMessage || "Please contact support for more information."}
          </p>
          <button type="button" onClick={() => void signOut()} className="secondary-button mt-7">
            Sign out
          </button>
        </div>
      </main>
    );
  }
  return children;
}
