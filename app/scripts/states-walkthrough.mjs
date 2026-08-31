/**
 * Criterion 12 manual walkthrough: drive the built SPA (served by the PHP
 * shim) through every state in the spec's states table, in light and dark
 * mode and at a narrow viewport, capturing screenshots.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8899";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "verification-screenshots");
mkdirSync(OUT, { recursive: true });

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${step}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  // ---- Empty state (light) --------------------------------------------
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const dropzone = page.getByTestId("dropzone");
  await dropzone.waitFor({ state: "visible", timeout: 10000 });
  record("empty: dropzone visible while input empty", true);
  const placeholder = await page.getByTestId("output-pane").innerText();
  record("empty: output placeholder", /appears here|placeholder/i.test(await page.getByTestId("output-pane").innerText()), placeholder.slice(0, 60));
  const example = page.getByTestId("try-example");
  record("empty: 'Try an example' affordance present", await example.isVisible());
  await page.screenshot({ path: OUT + "/01-empty-light.png", fullPage: false });

  // ---- Drag-over highlight --------------------------------------------
  const pane = page.getByTestId("input-pane");
  await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="input-pane"]');
    const dt = new DataTransfer();
    dt.items.add(new File(["a,b\n1,2"], "drag.csv", { type: "text/csv" }));
    pane.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await page.waitForTimeout(200);
  const dragAttr = await pane.getAttribute("data-drag-over");
  record("drag-over: pane sets data-drag-over", dragAttr !== null, `attr=${dragAttr}`);
  await page.screenshot({ path: OUT + "/02-dragover-light.png" });

  // ---- Ready state: example data → dense table + counts ---------------
  await page.getByTestId("try-example").click();
  await page.waitForSelector('[data-testid="input-table"]', { timeout: 5000 });
  const meta = await page.getByTestId("pane-meta").first().innerText();
  record("ready: table replaces dropzone; header shows counts", (await dropzone.count()) === 0 && /\d/.test(meta), meta.replace(/\n/g, " "));
  record("ready: output JSON rendered", await page.getByTestId("output-pane").locator("code, pre, .cm-editor, [data-testid='json-output']").first().isVisible().catch(() => false));
  await page.screenshot({ path: OUT + "/03-ready-light.png" });

  // ---- Editing: raw toggle + live conversion ---------------------------
  await page.getByTestId("raw-toggle").first().click();
  await page.waitForSelector('[data-testid="input-editor"], textarea', { timeout: 5000 });
  record("ready: raw toggle exposes source text editing", true);
  await page.screenshot({ path: OUT + "/04-raw-editing-light.png" });

  // ---- Direction flip (real trusted mouse input) ------------------------
  await page.getByTestId("divider-switch").click();
  await page.waitForTimeout(400);
  const flipLabel = await page.getByTestId("divider-switch").getAttribute("aria-label");
  record("flip: switch toggles direction on real click", /JSON → CSV/.test(flipLabel), flipLabel);
  await page.screenshot({ path: OUT + "/06-flipped-light.png" });

  // ---- Invalid input: inline error, last valid output retained --------
  const before = await page.getByTestId("output-pane").innerText();
  await page.locator('[data-testid="input-editor"] .cm-content').waitFor({ state: "visible", timeout: 5000 });
  await page.locator('[data-testid="input-editor"] .cm-content').click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("{ not valid json");
  await page.waitForTimeout(1200);
  const after = await page.getByTestId("output-pane").innerText();
  const paneStatus = await page.getByTestId("pane-status").first().innerText().catch(() => "");
  record("invalid: inline error shown", /error|invalid|expect|parse/i.test(paneStatus), paneStatus.slice(0, 80));
  const sample = before.split("\n").filter((line) => !/^(CSV|JSON|COPY|DOWNLOAD|\d+ rows)/i.test(line.trim()));
  const retained = sample.filter((line) => line.trim() !== "").every((line) => after.includes(line));
  record("invalid: last valid output retained", retained, `after ${after.length} chars vs before ${before.length}`);
  await page.screenshot({ path: OUT + "/05-invalid-light.png" });

  // ---- Dark mode -------------------------------------------------------
  await page.getByTestId("theme-toggle").click();
  await page.waitForTimeout(300);
  const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  record("dark: html.dark applied after toggle", isDark);
  await page.screenshot({ path: OUT + "/07-dark-mode.png" });
  const persisted = await page.evaluate(() => localStorage.getItem("csvjson-theme") ?? localStorage.getItem("theme"));
  record("dark: theme persisted", persisted === "dark", `localStorage=${persisted}`);

  // ---- Narrow viewport (stacked panes below 768px) ---------------------
  await page.setViewportSize({ width: 375, height: 720 });
  await page.waitForTimeout(300);
  const stacked = await page.evaluate(() => {
    const input = document.querySelector('[data-testid="input-pane"]');
    const output = document.querySelector('[data-testid="output-pane"]');
    if (!input || !output) return false;
    const ir = input.getBoundingClientRect(), or = output.getBoundingClientRect();
    return or.top >= ir.bottom - 2;
  });
  record("narrow: panes stack vertically at 375px", stacked);
  await page.screenshot({ path: OUT + "/08-narrow-dark.png", fullPage: false });
  await page.getByTestId("theme-toggle").click(); // back to light
  await page.screenshot({ path: OUT + "/09-narrow-light.png" });

  // ---- Permalink: unknown id → inline not-found, never blank ----------
  await page.setViewportSize({ width: 1280, height: 800 });
  const unknown = "deadbeefdeadbeefdeadbeefdeadbeef";
  await page.goto(`${BASE}/csv2json/${unknown}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="permalink-notice"]', { timeout: 15000 });
  const nf = await page.getByTestId("permalink-notice").innerText();
  record("permalink unknown id: inline not-found notice", /exist|deleted/i.test(nf), nf.slice(0, 60));
  await page.screenshot({ path: OUT + "/10-permalink-notfound.png" });

  // ---- Permalink: real object hydrates --------------------------------
  await page.goto(`${BASE}/csv2json/000c44f43e2f62cc15c48d9d7c5a4582`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="permalink-notice"]', { state: "detached", timeout: 20000 }).catch(() => {});
  await page.waitForSelector('[data-testid="input-pane"] table, [data-testid="csv-table"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  const hydrated = await page.getByTestId("input-pane").innerText();
  record("permalink real id: converter hydrated with saved CSV", /sonicMatchId|homeTeam/i.test(hydrated));
  const urlUnchanged = page.url().endsWith("/csv2json/000c44f43e2f62cc15c48d9d7c5a4582");
  record("permalink real id: URL never rewritten", urlUnchanged, page.url());
  await page.screenshot({ path: OUT + "/11-permalink-hydrated.png" });

  // ---- FAQ accordion: collapsed in DOM, click reveals ------------------
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const faqContent = page.getByTestId("faq-content");
  const inDom = await faqContent.count();
  const visibleBefore = await faqContent.isVisible().catch(() => false);
  await page.getByTestId("faq-toggle").click();
  await page.waitForTimeout(200);
  const visibleAfter = await faqContent.isVisible().catch(() => false);
  record("faq: content in initial DOM + click reveals", inDom > 0 && !visibleBefore && visibleAfter, `${inDom} node(s)`);
  await page.screenshot({ path: OUT + "/12-faq-open.png" });
} catch (e) {
  record("walkthrough crashed", false, String(e).slice(0, 300));
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
