// Vercel Web Analytics initialization
// This script loads and initializes Vercel Web Analytics for the site

import { inject } from './node_modules/@vercel/analytics/dist/index.mjs';

// Initialize analytics
// The analytics will automatically track page views
inject({
  mode: 'auto', // Automatically detect production vs development
  debug: true,  // Enable debug logging in development
});
