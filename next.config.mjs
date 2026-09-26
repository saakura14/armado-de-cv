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
  images: { unoptimized: true },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
