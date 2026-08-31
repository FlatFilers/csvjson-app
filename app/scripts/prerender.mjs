/**
 * Build-time prerender of the single route (spec: SEO — prerender at build).
 * Boots a Vite server in middleware mode so the app loads through the same
 * plugin pipeline the production build uses, renders it to static HTML, and
 * writes it into dist/index.html. The deployed file then carries full markup
 * before any JavaScript runs — a build step, not SSR.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const appDir = path.resolve(
  path.dirname(fileURLToPath(new URL(import.meta.url))),
  ".."
);
const distIndexPath = path.join(appDir, "dist", "index.html");
const EMPTY_ROOT = '<div id="root"></div>';

const vite = await createServer({
  root: appDir,
  logLevel: "error",
  // The dev server is only a module loader here — no optimizer work, no
  // watching. Disabling both keeps vite.close() from printing a spurious
  // "The build was canceled" while cancelling nothing that matters.
  server: { middlewareMode: true, watch: null },
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
});

try {
  const { renderAppHtml } = await vite.ssrLoadModule(
    "/src/seo/prerender-entry.tsx"
  );
  const appHtml = renderAppHtml();

  const indexHtml = await readFile(distIndexPath, "utf8");
  if (!indexHtml.includes(EMPTY_ROOT)) {
    throw new Error(
      "Built index.html has no empty #root div — the build output shape changed and the prerender target is gone"
    );
  }
  const prerendered = indexHtml.replace(
    EMPTY_ROOT,
    `<div id="root">${appHtml}</div>`
  );
  await writeFile(distIndexPath, prerendered);
  console.log(
    `prerender: wrote ${appHtml.length} chars of app markup into dist/index.html`
  );
} finally {
  await vite.close();
}
