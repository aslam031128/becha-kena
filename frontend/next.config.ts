import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/users',
      },
      {
        source: '/admin/:path(users|users/.*|kyc-queue|listings-queue|reports|disputes|audits)',
        destination: '/:path',
      },
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:5000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
