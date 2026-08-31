/**
 * Manual E2E (spec criterion 6): fetch a REAL legacy permalink object
 * from the production S3 bucket through the actual fetchLegacyPermalink +
 * hydrateConverter code paths — no mocks. Run: npx tsx scripts/e2e-legacy-permalink.ts
 */
const REAL_ID = "000c44f43e2f62cc15c48d9d7c5a4582";

// Minimal import.meta.env shim — matches .env / code default.
(globalThis as Record<string, unknown>).import_meta_env = {};

const { fetchLegacyPermalink, hydrateConverter } = await import("../src/lib/permalink");

const data = await fetchLegacyPermalink(REAL_ID);
console.log("fetched keys:", Object.keys(data));

const state = hydrateConverter(data);
if (!state) throw new Error("hydrateConverter returned null for a real object!");
console.log("direction:", state.direction);
console.log("options:", JSON.stringify(state.options));
console.log("input head:", state.input.slice(0, 120).replace(/\n/g, "\\n"));
console.log("E2E OK: real legacy object hydrated read-only");
