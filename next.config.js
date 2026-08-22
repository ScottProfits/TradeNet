/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["protobufjs", "ws", "yahoo-finance2"],
  images: {
    // Without this, Next.js refuses to optimize Supabase-hosted images
    // ("hostname not configured"), which is why `unoptimized` was used
    // everywhere — that serves full-resolution originals (often multi-MB
    // screen captures) for what should be small thumbnails, which is the
    // real cause of the slow/blank feed loading.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nxcjjpfiubjrnlribnma.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "protobufjs",
        "ws",
        "yahoo-finance2",
      ];
    }
    return config;
  },
};
module.exports = nextConfig;
