// Vercel Speed Insights initialization
// This script initializes Vercel Speed Insights for performance monitoring
// Uses the @vercel/speed-insights package for vanilla HTML/JavaScript projects

import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
// This will automatically track Web Vitals and performance metrics
injectSpeedInsights({
  debug: false, // Set to true for debugging in development
});
