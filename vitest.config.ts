import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url)).replace(/[/\\]+$/, "");
const serverOnlyStub = fileURLToPath(
  new URL("./vitest.server-only-stub.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      // Mirror the tsconfig path alias "@/*" -> repo root.
      { find: "@", replacement: root },
      // The `server-only` marker package only resolves inside Next's bundler.
      // Stub it so the API route (the one backup module that imports it) can be
      // imported under vitest without an ERR_MODULE_NOT_FOUND.
      { find: "server-only", replacement: serverOnlyStub },
    ],
  },
  test: {
    environment: "node",
    include: ["lib/backup/**/*.test.ts", "tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
