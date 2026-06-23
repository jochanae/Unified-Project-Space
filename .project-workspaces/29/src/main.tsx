import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure the service worker updates apply immediately in Chrome
// (prevents stale cached UI/layout differences vs the preview).
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(<App />);
