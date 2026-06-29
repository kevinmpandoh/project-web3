import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
    "@solana/wallet-adapter-phantom",
    "@solana/wallet-adapter-solflare",
    "@solana/web3.js",
  ],
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      crypto: false,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;

