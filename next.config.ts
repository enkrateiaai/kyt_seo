import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  // ioredis and other native module deps need to be external in standalone output,
  // otherwise Next.js outputFileTracing leaves them out of the runner image.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
  serverExternalPackages: ['ioredis', '@upstash/redis'],
  async redirects() {
    return [
      // .html → clean URLs for satnam pages
      { source: '/blog.html', destination: '/blog', permanent: true },
      { source: '/glossar.html', destination: '/glossar', permanent: true },
      { source: '/datenschutz.html', destination: '/datenschutz', permanent: true },
      { source: '/impressum.html', destination: '/impressum', permanent: true },
    ]
  },
};

export default nextConfig;
