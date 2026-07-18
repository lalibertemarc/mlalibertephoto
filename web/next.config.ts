import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export. Load-bearing: disables middleware, the next/image optimizer,
  // route handlers and every other server feature. Nothing added to this app may
  // depend on them.
  output: 'export',

  // Hugo emits every URL with a trailing slash (/blog/2025/10/29/prohibition/).
  // Without this, export writes blog.html instead of blog/index.html and every
  // existing indexed URL 404s.
  trailingSlash: true,

  // output: 'export' has no image optimizer to run. Site images are Cloudinary
  // URLs served at their final size, so there is nothing to optimize anyway.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
