/**
 * ─────────────────────────────────────────────────────────────
 * ROAST ENGINE v2.0 — BARREL EXPORT & INTEGRATION
 * ─────────────────────────────────────────────────────────────
 * 
 * STEP 1: Route to RoastSessionV2.tsx in your App.tsx
 * STEP 2: Ensure html2canvas is installed: `npm install html2canvas`
 * STEP 3: Pass auth.currentUser.uid to the hook or components
 * 
 */

export * from "./roastLibrary";
export * from "./roastEngine";
export * from "./roastFirestore";
export * from "./useRoastSession";

// Components
export { default as RoastSessionV2 } from "../pages/roast/RoastSessionV2";
export { ShareCard, MilestoneCelebration } from "../pages/roast/RoastExtras";
