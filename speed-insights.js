// Vercel Speed Insights initialization
// This script loads and initializes Vercel Speed Insights for the site

import { injectSpeedInsights } from './node_modules/@vercel/speed-insights/dist/index.mjs';

// Initialize Speed Insights
// The script will automatically track web vitals and performance metrics
injectSpeedInsights({
  debug: true,  // Enable debug logging in development
});
