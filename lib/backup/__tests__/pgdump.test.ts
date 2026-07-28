import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";

import {
  DumpFailed,
  DumpTimeout,
  PgDumpNotFound,
  PgDumpVersionMismatch,
  runPgDump,
} from "@/lib/backup/pgdump";
import type { SupabaseDbConnection } from "@/lib/backup/env";

// Mock child_process so no real pg_dump is spawned.
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "node:child_process";
const spawnMock = vi.mocked(spawn);

function makeConn(): SupabaseDbConnection {
  return {
    host: "db.example.com",
    port: 5432,
    database: "postgres",
    user: "alice",
    sslmode: "require",
    pgEnv: {
      PGHOST: "db.example.com",
      PGPORT: "5432",
      PGDATABASE: "postgres",
      PGUSER: "alice",
      PGPASSWORD: "s3cret-password",
      PGSSLMODE: "require",
    },
  };
}

// A fake ChildProcess with stream stdio.
function fakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();
  return child;
}

beforeEach(() => {
  spawnMock.mockReset();
});

describe("runPgDump argv and environment", () => {
  it("spawns pg_dump with no shell and credentials only in the env", () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child as never);

    runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = spawnMock.mock.calls[0] as unknown as [
      string,
      string[],
      { env: Record<string, string>; stdio: unknown },
    ];
    expect(cmd).toBe("pg_dump");
    expect(args).toEqual(["--no-password", "-Fc"]);
    expect(opts.stdio).toEqual(["ignore", "pipe", "pipe"]);

    // Credentials are in the child env, NOT on the argv.
    expect(opts.env.PGPASSWORD).toBe("s3cret-password");
    expect(opts.env.PGHOST).toBe("db.example.com");
    expect(args.join(" ")).not.toContain("s3cret-password");
    expect(args.join(" ")).not.toContain("db.example.com");
  });

  it("adds -n <schema> per schema", () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child as never);
    runPgDump({
      connection: makeConn(),
      schemas: ["public", "auth"],
      timeoutMs: 60_000,
    });
    const [, args] = spawnMock.mock.calls[0] as unknown as [string, string[]];
    expect(args).toEqual([
      "--no-password",
      "-Fc",
      "-n",
      "public",
      "-n",
      "auth",
    ]);
  });
});

describe("runPgDump error mapping", () => {
  it("rejects with PgDumpNotFound on ENOENT", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child as never);
    const { done } = runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
    });
    const err = Object.assign(new Error("spawn pg_dump ENOENT"), {
      code: "ENOENT",
    });
    child.emit("error", err);
    await expect(done).rejects.toBeInstanceOf(PgDumpNotFound);
  });

  it("redacts secrets in a non-ENOENT spawn error", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child as never);
    const { done } = runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
    });
    const err = Object.assign(
      new Error("spawn failed postgresql://alice:s3cret-password@h/db"),
      { code: "EACCES" },
    );
    child.emit("error", err);
    await expect(done).rejects.toBeInstanceOf(DumpFailed);
    await expect(done).rejects.toThrow(/\[redacted-url\]/);
    await expect(done).rejects.not.toThrow(/s3cret-password/);
  });

  it("rejects with PgDumpVersionMismatch when stderr reports a version mismatch", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child as never);
    const { done } = runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
    });
    child.stderr.emit(
      "data",
      Buffer.from("pg_dump: error: server version mismatch detected\n"),
    );
    child.emit("close", 1);
    await expect(done).rejects.toBeInstanceOf(PgDumpVersionMismatch);
  });

  it("rejects with DumpFailed on a generic non-zero exit and redacts the tail", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child as never);
    const { done } = runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
    });
    child.stderr.emit(
      "data",
      Buffer.from("FATAL: password=s3cret-password authentication failed\n"),
    );
    child.emit("close", 2);
    await expect(done).rejects.toBeInstanceOf(DumpFailed);
    await expect(done).rejects.not.toThrow(/s3cret-password/);
  });

  it("rejects with DumpTimeout and SIGKILLs after the timeout", async () => {
    vi.useFakeTimers();
    try {
      const child = fakeChild();
      spawnMock.mockReturnValue(child as never);
      const { done } = runPgDump({
        connection: makeConn(),
        schemas: null,
        timeoutMs: 5_000,
      });
      const assertion = expect(done).rejects.toBeInstanceOf(DumpTimeout);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(child.kill).toHaveBeenCalledWith("SIGKILL");
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("runPgDump success and stderr redaction", () => {
  it("redacts secrets in onLog stderr lines", async () => {
    const child = fakeChild();
    spawnMock
      .mockReturnValueOnce(child as never) // the dump
      .mockImplementationOnce(() => {
        // version probe: emit version then close 0
        const probe = fakeChild();
        queueMicrotask(() => {
          probe.stdout.emit("data", Buffer.from("pg_dump (PostgreSQL) 15.4\n"));
          probe.emit("close", 0);
        });
        return probe as never;
      });

    const lines: string[] = [];
    const { done } = runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
      onLog: (l) => lines.push(l),
    });
    child.stderr.emit(
      "data",
      Buffer.from(
        "connecting to postgresql://alice:s3cret-password@h/db\nok\n",
      ),
    );
    child.emit("close", 0);

    const res = await done;
    expect(res.exitCode).toBe(0);
    expect(res.pgDumpMajor).toBe(15);
    expect(lines[0]).toContain("[redacted-url]");
    expect(lines.join(" ")).not.toContain("s3cret-password");
  });

  it("reports version unknown when the probe fails", async () => {
    const child = fakeChild();
    spawnMock
      .mockReturnValueOnce(child as never)
      .mockImplementationOnce(() => {
        const probe = fakeChild();
        queueMicrotask(() => probe.emit("error", new Error("no pg_dump")));
        return probe as never;
      });

    const { done } = runPgDump({
      connection: makeConn(),
      schemas: null,
      timeoutMs: 60_000,
    });
    child.emit("close", 0);
    const res = await done;
    expect(res.pgDumpVersion).toBe("unknown");
    expect(res.pgDumpMajor).toBe(0);
  });
});
