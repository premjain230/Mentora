// Vercel Web Analytics initialization
// This script initializes Vercel Web Analytics using the inject() function
// Recommended approach for vanilla HTML/JavaScript projects per official docs

import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
// The inject() function will automatically handle script loading and tracking
inject({
  mode: 'production', // Use 'auto' to automatically switch between production and development
  debug: false, // Set to true for debugging in development
});
