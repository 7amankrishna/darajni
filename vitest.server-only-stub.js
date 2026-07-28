// server-only stub for vitest.
//
// The real `server-only` package is a marker that throws when imported in a
// browser bundle; it only resolves inside Next's bundler
// (node_modules/next/dist/compiled/server-only). Under vitest, the standalone
// test run cannot resolve it, so we alias it to this empty no-op module so the
// single backup module that legitimately imports it (the Next API route) can be
// imported during tests. No exports are needed: `import "server-only"` is a
// side-effect-only import.
export {};
