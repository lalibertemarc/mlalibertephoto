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

  images: {
    // `output: 'export'` removes the built-in optimizer, so a custom loader is the only
    // way to get responsive images at all. It replaces `unoptimized: true`, which shipped
    // every Cloudinary original untouched and srcset-less — full-size JPEGs to phones.
    // The loader rewrites the URL; Cloudinary does the resizing. See lib/cloudinary-loader.ts.
    loader: 'custom',
    loaderFile: './lib/cloudinary-loader.ts',

    // Trimmed from the Next defaults, which top out at 3840px. The widest any image can
    // render on this site is the Bootstrap lg container (1170px) plus the full-bleed
    // gallery breakout, so 1920 covers 2x on the largest realistic cell. Keeping 3840 in
    // the list would put a 4K variant in every srcset that no layout can ever select.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],

    // Gallery cells, not viewport-width images: a 3-column grid inside a 1170px container
    // makes each cell ~380px, so these are the widths `sizes` resolves to on gallery pages.
    imageSizes: [256, 384, 450, 600],
  },
}

export default nextConfig
