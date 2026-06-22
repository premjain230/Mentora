// Vercel Speed Insights initialization
// This script initializes Vercel Speed Insights for performance monitoring
// Uses the browser-ready ESM URL because this project serves vanilla JavaScript.

import { injectSpeedInsights } from "https://esm.sh/@vercel/speed-insights";

// Initialize Speed Insights
// This will automatically track Web Vitals and performance metrics
injectSpeedInsights({
  debug: false, // Set to true for debugging in development
});
