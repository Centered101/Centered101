// Content-Security-Policy — allowlist built from what the site actually loads:
//  - self-hosted Next.js assets + next/font (Kanit, Geist Mono)
//  - Vercel Analytics (va.vercel-scripts.com)
//  - Supabase REST/Storage/Realtime (browser calls from shop + admin)
//  - Images from Supabase storage, GitHub avatars, next/image
// 'unsafe-inline' on script/style is required because we use static (nonce-less)
// CSP to keep pages prerendered/CDN-cached. securityheaders.com still grades A+.
// In development, React + Turbopack need 'unsafe-eval' (debugging features) and
// a ws:/http: connection to the dev server for HMR; both are dev-only and never
// shipped to production.
const isDev = process.env.NODE_ENV !== 'production'

const cspDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'self'"],
  'form-action': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    'https://va.vercel-scripts.com',
    'https://challenges.cloudflare.com',
    ...(isDev ? ["'unsafe-eval'"] : []),
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://va.vercel-scripts.com',
    'https://challenges.cloudflare.com',
    ...(isDev ? ['ws://localhost:*', 'ws://*.localhost:*', 'http://localhost:*'] : []),
  ],
  'frame-src': ["'self'", 'https://checkout.stripe.com', 'https://challenges.cloudflare.com'],
  'worker-src': ["'self'", 'blob:'],
  'media-src': ["'self'"],
  'manifest-src': ["'self'"],
}

const contentSecurityPolicy =
  Object.entries(cspDirectives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ') + (isDev ? '' : '; upgrade-insecure-requests')

const longLivedAssetHeaders = [
  {
    key: 'Cache-Control',
    value: 'public, max-age=31536000, immutable',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: isDev,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'wwcduaaqtyopvofzlouw.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        source: '/:path*.(png|jpg|jpeg|webp|avif|gif|svg|ico|woff|woff2)',
        headers: longLivedAssetHeaders,
      },
    ]
  },
}

export default nextConfig
