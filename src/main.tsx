import { createRoot } from "react-dom/client";
import "./i18n"; // Initialize i18n before rendering
import App from "./App.tsx";
import "./index.css";
import { captureRefFromUrl } from "@/lib/referral";

// Capture ?ref=CODE from the landing URL into sessionStorage so it
// survives the signup flow and OAuth redirects.
captureRefFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
