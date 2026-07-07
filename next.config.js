/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["protobufjs", "ws", "yahoo-finance2"],
  outputFileTracingIncludes: {
    "/api/brokers/rithmic": ["./src/lib/rithmic/proto/**"],
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
