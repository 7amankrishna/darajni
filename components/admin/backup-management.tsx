"use client";

import {
  CloudCheck,
  DatabaseBackup,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface BackupSummaryDto {
  backupId: string;
  createdAt: string;
  createdAtEpochMs: number;
  objectName: string;
  encryptedSize: number;
  checksum: string;
  pgDumpVersion: string;
  serverVersion: string;
}

interface BackupStatusDto {
  backupId: string;
  status: string;
  timestamp: string;
  encryptedSize?: number;
  error?: string;
}

interface BackupOverview {
  env: string;
  retentionDays: number;
  maxRetentionDays: number;
  pgDumpAvailable: boolean;
  configured: { database: boolean; encryptionKey: boolean; storage: boolean };
  destination?: "separate-project" | "same-project";
  restoreConfigured?: boolean;
  restoreStatus?: RestoreStatusDto | null;
  latestRun: BackupStatusDto | null;
  latestSuccessful: BackupStatusDto | null;
  backups: BackupSummaryDto[];
}

interface RestoreStatusDto {
  status: "running" | "success" | "failed";
  objectName: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  runUrl?: string;
}

interface RunResultDto {
  status: string;
  dbDump?: { status: string; reason?: string; bytes?: number; error?: string };
  retention?: { deletedCount?: number; keptCount?: number };
  error?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function BackupManagement() {
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [busyObject, setBusyObject] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/backup", { cache: "no-store" });
      const data = (await response.json()) as BackupOverview & { error?: string };
      if (!response.ok) {
        setLoadError(data.error || `Backup status failed (HTTP ${response.status}).`);
        return;
      }
      setOverview(data);
    } catch {
      setLoadError("Could not reach the backup service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runBackupNow = async () => {
    if (
      !window.confirm(
        "Start a backup now? The database dump runs on this server; on Vercel hosting the dump part is skipped (scheduled GitHub Actions performs full dumps).",
      )
    ) {
      return;
    }
    setRunning(true);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = (await response.json()) as RunResultDto & { error?: string };
      if (!response.ok) {
        toast.error(data.error || "Backup failed to start.");
        return;
      }
      if (data.status === "success") {
        toast.success("Backup completed.");
      } else if (data.status === "partial") {
        toast.warning(`Backup partially succeeded${data.dbDump?.error ? `: ${data.dbDump.error}` : ""}.`);
      } else {
        toast.error(`Backup ${data.status}${data.error ? `: ${data.error}` : ""}.`);
      }
      await load();
    } catch {
      toast.error("Backup request failed.");
    } finally {
      setRunning(false);
    }
  };

  const verify = async (objectName: string) => {
    setBusyObject(objectName);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", objectName }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || data.error === "download-failed") {
        toast.error(data.error === "manifest-unreadable" ? "Manifest unreadable." : "Verification failed.");
        return;
      }
      if (data.ok) toast.success("Integrity verified (SHA-256 matches).");
      else toast.error("Integrity check FAILED — do not rely on this backup.");
    } catch {
      toast.error("Verification request failed.");
    } finally {
      setBusyObject(null);
    }
  };

  const remove = async (objectName: string) => {
    if (!window.confirm("Delete this backup permanently? This cannot be undone.")) return;
    setBusyObject(objectName);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", objectName }),
      });
      const data = (await response.json()) as { deleted?: boolean; error?: string };
      if (!response.ok) {
        toast.error(data.error || "Delete failed.");
        return;
      }
      toast.success("Backup deleted.");
      await load();
    } catch {
      toast.error("Delete request failed.");
    } finally {
      setBusyObject(null);
    }
  };

  const restore = async (objectName: string, createdAt: string) => {
    const answer = window.prompt(
      `DANGER: This will OVERWRITE the current store data (products, orders, settings) with the backup from ${formatDate(createdAt)}.\n\n` +
        "A safety backup of the current state is taken first. Supabase logins are not affected.\n\n" +
        'Type RESTORE to continue:',
    );
    if (answer !== "RESTORE") {
      toast.info("Restore cancelled.");
      return;
    }
    setBusyObject(objectName);
    try {
      const response = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", objectName, confirm: answer }),
      });
      const data = (await response.json()) as { dispatched?: boolean; message?: string; error?: string };
      if (!response.ok) {
        toast.error(data.error || "Could not start the restore.");
        return;
      }
      toast.success(data.message || "Restore started.");
      await load();
    } catch {
      toast.error("Restore request failed.");
    } finally {
      setBusyObject(null);
    }
  };

  const allConfigured =
    overview?.configured.database &&
    overview?.configured.encryptionKey &&
    overview?.configured.storage;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Disaster recovery</p>
          <h2 className="font-display mt-2 text-4xl">Backups</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Encrypted database dumps kept for a maximum of {overview?.retentionDays ?? 30} days.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="secondary-button" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={() => void runBackupNow()} className="primary-button" disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
            Back up now
          </button>
        </div>
      </div>

      {loadError && (
        <div className="glass-panel mt-6 border-red-500/40 p-5 text-sm">
          <p className="font-bold text-red-400">Backup status could not load</p>
          <p className="mt-1 text-text-secondary">{loadError}</p>
          <button type="button" onClick={() => void load()} className="secondary-button mt-3">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {!allConfigured && !loading && !loadError && (
        <div className="glass-panel mt-6 border-red-500/40 p-5 text-sm">
          <p className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            Backups are not fully configured yet.
          </p>
          <ul className="mt-3 space-y-1 text-text-secondary">
            <li>Database connection: {overview?.configured.database ? "configured" : "missing SUPABASE_DB_URL"}</li>
            <li>Encryption key: {overview?.configured.encryptionKey ? "configured" : "missing BACKUP_ENCRYPTION_KEY"}</li>
            <li>Storage destination: {overview?.configured.storage ? "configured" : "missing Supabase credentials"}</li>
          </ul>
          <p className="mt-3 text-text-secondary">
            See <code>docs/BACKUP_DISASTER_RECOVERY.md</code> for the setup steps.
          </p>
        </div>
      )}

      {!overview?.restoreConfigured && !loading && (
        <div className="glass-panel mt-6 p-4 text-xs text-text-secondary">
          <ShieldAlert className="mr-2 inline h-3 w-3" />
          Restore buttons are disabled until BACKUP_RESTORE_GH_TOKEN is added to Vercel
          (a GitHub token with Actions access). See docs/BACKUP_DISASTER_RECOVERY.md.
        </div>
      )}

      <div className="glass-panel mt-6 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Backup destination</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <HardDriveDownload className="h-4 w-4" />
            {overview?.destination === "separate-project"
              ? "Separate backup Supabase project"
              : "This app's own Supabase project"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Latest run</p>
          <p className="mt-1 text-sm font-semibold">
            {overview?.latestRun ? `${overview.latestRun.status} · ${formatDate(overview.latestRun.timestamp)}` : "No runs recorded"}
          </p>
          {overview?.latestRun?.status !== "success" && overview?.latestRun?.error && (
            <p className="mt-1 text-xs text-red-400">{overview.latestRun.error}</p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Latest success</p>
          <p className="mt-1 text-sm font-semibold">
            {overview?.latestSuccessful
              ? formatDate(overview.latestSuccessful.timestamp)
              : "None yet"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Dump capability</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
            <CloudCheck className="h-4 w-4" />
            {overview?.pgDumpAvailable
              ? "Full dumps available on this host"
              : "This host skips dumps — scheduled GitHub Actions handles them"}
          </p>
        </div>
      </div>

      {overview?.restoreStatus && (
        <div
          className={`glass-panel mt-6 p-5 text-sm ${
            overview.restoreStatus.status === "failed" ? "border-red-500/40" : ""
          }`}
        >
          <p className="font-semibold">
            Last restore:{" "}
            <span
              className={
                overview.restoreStatus.status === "success"
                  ? "text-green-400"
                  : overview.restoreStatus.status === "failed"
                    ? "text-red-400"
                    : "text-amber-400"
              }
            >
              {overview.restoreStatus.status}
            </span>{" "}
            · {formatDate(overview.restoreStatus.startedAt)}
            {overview.restoreStatus.durationMs
              ? ` · ${Math.round(overview.restoreStatus.durationMs / 1000)}s`
              : ""}
          </p>
          {overview.restoreStatus.error && (
            <p className="mt-1 text-xs text-red-400">{overview.restoreStatus.error}</p>
          )}
          {overview.restoreStatus.runUrl && (
            <a
              href={overview.restoreStatus.runUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs underline"
            >
              View restore run on GitHub Actions
            </a>
          )}
        </div>
      )}

      <div className="glass-panel mt-6 overflow-hidden p-0">
        <div className="border-b border-border bg-black/10 px-4 py-3 text-xs text-text-secondary">
          <ShieldAlert className="mr-2 inline h-3 w-3 text-amber-400" />
          To restore: press <strong>Restore</strong> on a row below, then type
          <strong> RESTORE</strong> when asked. A safety backup of the current data is
          always taken first; logins are not affected.
          {overview?.restoreConfigured === false && (
            <span className="mt-1 block text-amber-400">
              Restore is disabled until BACKUP_RESTORE_GH_TOKEN is added to Vercel.
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Checksum</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                  Loading backups…
                </td>
              </tr>
            )}
            {!loading && (overview?.backups.length ?? 0) === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                  No backups stored yet. Run one with “Back up now” or wait for the nightly schedule.
                </td>
              </tr>
            )}
            {overview?.backups.map((backup) => (
              <tr key={backup.backupId} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-3">{formatDate(backup.createdAt)}</td>
                <td className="px-4 py-3">{formatBytes(backup.encryptedSize)}</td>
                <td className="px-4 py-3 font-mono text-xs">{backup.checksum.slice(0, 12)}…</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void restore(backup.objectName, backup.createdAt)}
                      className="danger-button !px-3"
                      disabled={busyObject === backup.objectName}
                      title="Overwrite current data with this backup (safety backup taken first)"
                    >
                      {busyObject === backup.objectName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <HardDriveDownload className="h-4 w-4" />
                      )}
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => void verify(backup.objectName)}
                      className="secondary-button !px-3"
                      disabled={busyObject === backup.objectName}
                      title="Re-compute SHA-256 and compare with the manifest"
                    >
                      {busyObject === backup.objectName ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(backup.objectName)}
                      className="danger-button !px-3"
                      disabled={busyObject === backup.objectName}
                      title="Delete this backup permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel mt-6 p-6 text-sm text-text-secondary">
        <p className="flex items-center gap-2 font-semibold text-text-primary">
          <HardDriveDownload className="h-4 w-4" />
          Restoring a backup
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>On a trusted machine, add SUPABASE_DB_URL, BACKUP_ENCRYPTION_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.</li>
          <li>List and decrypt a backup: <code>npm run backup:restore-verify</code></li>
          <li>Restore the dump with pg_restore (full command in docs/BACKUP_DISASTER_RECOVERY.md).</li>
        </ol>
        <p className="mt-3">
          Nightly schedule: 02:00 UTC — GitHub Actions creates the encrypted dump; Vercel Cron runs storage checks and retention cleanup.
        </p>
      </div>
    </div>
  );
}
