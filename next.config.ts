import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
