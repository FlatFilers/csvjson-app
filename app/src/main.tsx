import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureAnalytics, trackPageview } from "@/analytics/analytics";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// React owns #root now — lift the pre-mount inert guard so the app is
// interactive again (index.html sets it to protect prerendered markup
// during the bundle-load window).
document.getElementById("root")!.removeAttribute("inert");

// Analytics (restored 2026-09-01): add the build-time-conditional GA4 config
// to the gtag.js load bootstrapped in index.html, then the app's single
// pageview per mount (Plausible is manual mode; hydration fires a distinct
// permalink_view event, never a second pageview — see App.tsx).
configureAnalytics();
trackPageview();
