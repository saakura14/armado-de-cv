/** Security headers for every page. HSTS is already added by Vercel. */
const securityHeaders = [
  // Nobody can embed the site in a frame (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // Browsers must trust the declared file type (no MIME sniffing).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Other sites only learn the domain the visitor came from, never the full address.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The site never needs the camera, microphone or location.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The commit this build comes from; the admin panel compares it with /api/version to offer the new version.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || 'dev' },
  images: { unoptimized: true },
  poweredByHeader: false,
  // Short links for the Instagram carousels ("armadodecv.com/starbucks").
  async redirects() {
    return ['starbucks', 'laanonima', 'aeropuertos'].map((empresa) => ({ source: `/${empresa}`, destination: `/empleos/${empresa}`, permanent: false }))
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The admin app's service worker and manifest must never be served stale.
      { source: '/(sw.js|admin.webmanifest)', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      // The bridge that hands the public carousel images to Meta Business Suite may be framed only by Business Suite.
      { source: '/social/relay.html', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }, { key: 'Content-Security-Policy', value: 'frame-ancestors https://business.facebook.com https://adsmanager.facebook.com' }] },
    ]
  },
}

export default nextConfig
