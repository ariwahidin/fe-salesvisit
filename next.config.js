const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  customWorkerSrc: 'src/sw-push.js',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 1 hari
          },
        },
      },
    ],
  },
})

module.exports = withPWA({
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8080' },
    ],
  },
})