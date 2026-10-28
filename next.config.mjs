/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Keep the production build in-process. Worker pools fork child processes,
    // which is unnecessary here and can fail in restricted build environments.
    webpackBuildWorker: false,
    workerThreads: true,
  },
  // The curriculum adapter reads the canonical dataset from disk instead of
  // duplicating it. Include that file in the tutor function's server trace.
  outputFileTracingIncludes: {
    "/api/tutor": ["./js/learning/curriculum-data.js"],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mentora.vercel.app' }],
        destination: 'https://www.learningallied.world/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mentora-ai.vercel.app' }],
        destination: 'https://www.learningallied.world/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'mentora-lyart-nine.vercel.app' }],
        destination: 'https://www.learningallied.world/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'aquila-sand.vercel.app' }],
        destination: 'https://www.learningallied.world/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'aquila-ai.vercel.app' }],
        destination: 'https://www.learningallied.world/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/track',
        destination: '/api/growth?route=track',
      },
      {
        source: '/api/admin',
        destination: '/api/growth?route=admin',
      },
      {
        source: '/api/admin/:path*',
        destination: '/api/growth?route=admin/:path*',
      },
      {
        source: '/api/cron/growth',
        destination: '/api/growth?route=cron',
      },
      {
        source: '/api/recommendations',
        destination: '/api/learning-event?route=recommendations',
      },
      {
        source: '/api/arena',
        destination: '/api/learning-event?route=arena',
      },
      {
        source: '/api/learn-hub',
        destination: '/api/study-session?route=learn-hub',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/admin',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
