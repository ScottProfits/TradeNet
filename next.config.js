/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["protobufjs", "ws", "yahoo-finance2"],
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
