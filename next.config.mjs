/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "www.gravatar.com" },
      { protocol: "https", hostname: "assets.leetcode.com" },
      { protocol: "https", hostname: "static.codeforces.com" },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",         value: "DENY" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.clerk.com https://*.clerk.accounts.dev",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.clerk.com",
              "font-src 'self' https://fonts.gstatic.com https://cdn.clerk.com",
              "img-src 'self' data: blob: https://avatars.githubusercontent.com https://img.clerk.com https://images.clerk.dev https://cdn.clerk.com",
              "connect-src 'self' https://api.clerk.com https://clerk.*.lcl.dev wss://ws.clerk.com https://cdn.clerk.com https://*.clerk.accounts.dev",
              "frame-src https://challenges.cloudflare.com https://accounts.clerk.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
