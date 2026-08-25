// Best-effort email notification about a finished backup run.
//
// Uses the same Gmail SMTP credentials as order notifications
// (EMAIL_USER + EMAIL_APP_PASSWORD) and mails the store owner. Never throws
// and never affects the backup's exit code: if credentials are absent or SMTP
// fails, this silently skips/logs and moves on.

import nodemailer from "nodemailer";

export interface BackupNotificationInput {
  status: "success" | "partial" | "failed" | "skipped";
  env?: string;
  error?: string;
  startedAt?: string;
  durationMs?: number;
  dump?: { bytes?: number; objectName?: string };
  retention?: { deletedCount?: number; keptCount?: number };
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function row(label: string, value?: string | number): string {
  if (value === undefined || value === "") return "";
  return `<tr><td style="padding:8px;border:1px solid #eee;background-color:#f9f9f9;"><strong>${label}</strong></td><td style="padding:8px;border:1px solid #eee;">${value}</td></tr>`;
}

export async function sendBackupNotification(input: BackupNotificationInput): Promise<void> {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) return;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const icon =
      input.status === "success" ? "✅" : input.status === "partial" ? "⚠️" : "❌";
    const subject = `${icon} Database backup ${input.status}${input.env ? ` (${input.env})` : ""}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color:#333;border-bottom:2px solid #D9B56B;padding-bottom:10px;">Backup ${input.status}</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          ${row("Status", input.status)}
          ${row("Environment", input.env)}
          ${row("Started", input.startedAt)}
          ${input.durationMs ? row("Duration", `${Math.round(input.durationMs / 1000)}s`) : ""}
          ${input.dump?.bytes ? row("Encrypted size", formatBytes(input.dump.bytes)) : ""}
          ${input.dump?.objectName ? row("Archive", `<code>${input.dump.objectName}</code>`) : ""}
          ${input.retention && typeof input.retention.keptCount === "number" ? row("Retention", `deleted ${input.retention.deletedCount ?? 0}, kept ${input.retention.keptCount}`) : ""}
          ${input.error ? row("Error", `<span style="color:#b91c1c;">${String(input.error).slice(0, 300)}</span>`) : ""}
        </table>
        <p style="margin-top:24px;font-size:13px;color:#888;">
          Automated encrypted backup to Supabase Storage. Restore guide:
          <a href="https://github.com/7amankrishna/darajni/blob/main/docs/BACKUP_DISASTER_RECOVERY.md" style="color:#D9B56B;">docs/BACKUP_DISASTER_RECOVERY.md</a>
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"DARAJNI Backups" <${user}>`,
      to: user,
      subject,
      html,
    });
  } catch (error) {
    // Non-fatal by design; log a bounded, secret-free detail line.
    console.error(
      JSON.stringify({
        stage: "notify",
        message: "backup notification failed",
        detail: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      }),
    );
  }
}
