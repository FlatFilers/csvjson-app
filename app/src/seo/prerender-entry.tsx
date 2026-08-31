import { renderToString } from "react-dom/server";
import App from "@/App";

/**
 * Build-time-only entry (spec: SEO — prerender at build). Renders the full
 * App to static HTML so the deployed index.html carries real content — H1,
 * option hints, FAQ, JSON-LD — before any JavaScript runs. This is a build
 * step, not SSR: the client still mounts fresh with createRoot and takes
 * over the prerendered markup. Nothing here runs in the browser.
 */
export function renderAppHtml(): string {
  return renderToString(<App />);
}
