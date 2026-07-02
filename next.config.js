/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["protobufjs", "ws"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "protobufjs",
        "ws",
      ];
    }
    return config;
  },
};
module.exports = nextConfig;
