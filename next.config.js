const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8080' },
    ],
  },
})