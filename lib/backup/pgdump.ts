// pg_dump runner: streams a compressed custom-format PostgreSQL dump.
//
// Security: the database URL/credentials are NEVER placed on the command line.
// `child_process.spawn` is used with a separate argv array (no shell), and the
// connection details are passed to libpq exclusively via the child-process
// environment (PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD/PGSSLMODE). This
// keeps credentials out of process listings and shell history. `--no-password`
// prevents the process from hanging on an interactive prompt.
//
// stdout is returned as a stream for the caller to pipe through encryption; it
// is never buffered in memory. stderr is captured for diagnostics but is run
// through `redactSecrets` before any line leaves this module, and only the
// caller-supplied `onLog` sink receives it.
//
// This module does not import `server-only` so it can run under tsx/vitest.

import { spawn, type ChildProcess } from "node:child_process";
import type { Readable } from "node:stream";
import type { SupabaseDbConnection } from "@/lib/backup/env";

export class PgDumpError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PgDumpError";
    this.code = code;
  }
}

export class PgDumpNotFound extends PgDumpError {
  constructor() {
    super(
      "pg_dump-not-found",
      "The pg_dump binary was not found. Install PostgreSQL client tools matching your server major version where backups run.",
    );
  }
}

export class PgDumpVersionMismatch extends PgDumpError {
  constructor(detail: string) {
    super("pg_dump-version-mismatch", `pg_dump major version is incompatible with the server: ${detail}`);
  }
}

export class DumpEmpty extends PgDumpError {
  constructor() {
    super("dump-empty", "pg_dump produced an empty archive; refusing to report a successful backup.");
  }
}

export class DumpTimeout extends PgDumpError {
  constructor(timeoutMs: number) {
    super("dump-timeout", `pg_dump exceeded the configured timeout of ${timeoutMs}ms and was terminated.`);
  }
}

export class DumpFailed extends PgDumpError {
  constructor(detail: string) {
    super("dump-failed", `pg_dump failed: ${detail}`);
  }
}

export interface RunPgDumpInput {
  connection: SupabaseDbConnection;
  /** Schemas to dump, or null for all schemas the role can access. */
  schemas: string[] | null;
  timeoutMs: number;
  /** Optional sink for sanitized pg_dump stderr diagnostic lines. */
  onLog?: (line: string) => void;
}

export interface RunPgDumpSuccess {
  /** Full `pg_dump (PostgreSQL) X.Y) ` version string, or "unknown". */
  pgDumpVersion: string;
  /** Major version number parsed from the version string, or 0. */
  pgDumpMajor: number;
  exitCode: number;
}

export interface StartedPgDump {
  /** The raw custom-format dump stream — pipe this through encryption. */
  stdout: Readable;
  /** Resolves on a clean exit with version info; rejects with a typed error. */
  done: Promise<RunPgDumpSuccess>;
}

/** Strip anything that could be a connection string or password from a string. */
function redactSecrets(text: string): string {
  return text
    .replace(/(?:postgresql|postgres):\/\/[^\s"']*/gi, "[redacted-url]")
    .replace(/password=\S+/gi, "password=[redacted]")
    .replace(/PGPASSWORD[=:]\s*\S+/gi, "PGPASSWORD=[redacted]");
}

function probePgDumpVersion(): Promise<{ version: string; major: number } | null> {
  return new Promise((resolve) => {
    const proc: ChildProcess = spawn("pg_dump", ["--version"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      const match = out.match(/pg_dump \(PostgreSQL\)\s+(\d+)\./i);
      resolve(match ? { version: out.trim(), major: Number(match[1]) } : null);
    });
  });
}

/**
 * Best-effort probe of the PostgreSQL SERVER version via `psql`. Returns null
 * when psql is absent or the query fails (non-fatal). Credentials are passed
 * only through the child-process environment, same as the dump itself.
 */
export function probeServerVersion(connection: SupabaseDbConnection): Promise<string | null> {
  return new Promise((resolve) => {
    const childEnv = { ...process.env, ...connection.pgEnv };
    const proc: ChildProcess = spawn("psql", ["--no-password", "-tAc", "SHOW server_version;"], {
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    proc.on("error", () => resolve(null));
    proc.on("close", () => {
      const value = out
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean);
      resolve(value ? redactSecrets(value) : null);
    });
  });
}

/**
 * Start a `pg_dump -Fc` (compressed custom-format) dump. Credentials are passed
 * only through the child-process environment. The caller MUST pipe `stdout`
 * synchronously (before awaiting anything) to avoid backpressure/data loss, and
 * MUST verify the dump is non-empty (the caller's byte counter should throw
 * `DumpEmpty` when zero bytes were produced).
 */
export function runPgDump(input: RunPgDumpInput): StartedPgDump {
  const { connection, schemas, timeoutMs, onLog } = input;

  // Separate argv — no shell, no interpolation of the URL or password.
  const args: string[] = ["--no-password", "-Fc"];
  if (schemas) {
    for (const schema of schemas) {
      args.push("-n", schema);
    }
  }

  // Spread the parent environment (PATH etc.) and override only the libpq
  // connection variables. Credentials live ONLY here.
  const childEnv = {
    ...process.env,
    ...connection.pgEnv,
  };

  const child: ChildProcess = spawn("pg_dump", args, { env: childEnv, stdio: ["ignore", "pipe", "pipe"] });

  let stderrBuf = "";
  let resolved = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const done = new Promise<RunPgDumpSuccess>((resolve, reject) => {
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (resolved) return;
      resolved = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (err.code === "ENOENT") {
        reject(new PgDumpNotFound());
      } else {
        reject(new DumpFailed(redactSecrets(err.message)));
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrBuf += text;
      if (onLog) {
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (trimmed) onLog(redactSecrets(trimmed));
        }
      }
    });

    child.on("close", (exitCode: number | null) => {
      if (resolved) return;
      if (timeoutHandle) clearTimeout(timeoutHandle);

      if (exitCode !== 0) {
        resolved = true;
        const tail = redactSecrets(stderrBuf).trim().slice(-400);
        if (/server version mismatch/i.test(stderrBuf)) {
          reject(new PgDumpVersionMismatch(tail || "pg_dump reported a server version mismatch."));
        } else {
          reject(new DumpFailed(tail || `pg_dump exited with code ${exitCode ?? "null"}.`));
        }
        return;
      }

      resolved = true;
      // Probe the version (best effort) and resolve.
      probePgDumpVersion()
        .then((v) => {
          resolve({
            pgDumpVersion: v?.version ?? "unknown",
            pgDumpMajor: v?.major ?? 0,
            exitCode: 0,
          });
        })
        .catch(() => {
          resolve({ pgDumpVersion: "unknown", pgDumpMajor: 0, exitCode: 0 });
        });
    });

    timeoutHandle = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // Ignore — process may already be gone.
      }
      reject(new DumpTimeout(timeoutMs));
    }, timeoutMs);
  });

  return { stdout: child.stdout as Readable, done };
}
