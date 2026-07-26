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

    // This was once trimmed to 1920 on the premise that the widest any image renders is the
    // Bootstrap lg container (1170px) plus the full-bleed gallery breakout. A gallery cell
    // breaks that premise: it crops by covering, so a wide image is painted several times
    // wider than its cell (see coverFactor in ImageModal.tsx) and can ask for well past 1920
    // once the viewport is large. `sizes` still governs selection, so a 33vw cell holding a
    // 4/5 image never reaches for these; they cost two srcset entries.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560, 3840],

    // Gallery cells, not viewport-width images: a 3-column grid inside a 1170px container
    // makes each cell ~380px, so these are the widths `sizes` resolves to on gallery pages.
    imageSizes: [256, 384, 450, 600],
  },
}

export default nextConfig
