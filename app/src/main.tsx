import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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
