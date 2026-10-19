import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // the old Vercel address forwards to the site's own domain
      { source: "/:path*", has: [{ type: "host", value: "otaka-goal.vercel.app" }], destination: "https://goal.mambz.com/:path*", permanent: true },
      { source: "/", destination: "/ar", permanent: false },
    ];
  },
};

export default nextConfig;
