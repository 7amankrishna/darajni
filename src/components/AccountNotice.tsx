import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const noticeStyles = {
  warned: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  restricted: "border-orange-400/25 bg-orange-400/10 text-orange-100",
  blocked: "border-rose-400/25 bg-rose-400/10 text-rose-100",
};

export default function AccountNotice() {
  const { profile } = useAuth();
  if (!profile || profile.role === "admin" || profile.accountStatus === "active") return null;

  const title =
    profile.accountStatus === "warned"
      ? "Private account warning"
      : profile.accountStatus === "restricted"
        ? "Review activity disabled"
        : "Account blocked";

  return (
    <aside className={`border-b px-4 py-3 text-sm ${noticeStyles[profile.accountStatus]}`}>
      <div className="section-shell flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <p>
          <strong>{title}:</strong>{" "}
          {profile.moderationMessage || "Please contact support for more information."}
        </p>
        <Link to="/dashboard" className="shrink-0 text-xs font-bold uppercase tracking-wider underline">
          View account
        </Link>
      </div>
    </aside>
  );
}
