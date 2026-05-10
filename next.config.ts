import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` uses webpack (--webpack flag in package.json) because Excalidraw's
  // UMD bundle conflicts with Turbopack's ESM/CJS interop in dev mode.
  // `next build` uses Turbopack (the default) and compiles correctly.
  webpack: (config) => {
    // Prevent webpack from trying to bundle the native `canvas` node module
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      { canvas: "canvas" },
    ];
    return config;
  },

  turbopack: {},

  // Allow the ngrok tunnel origin so HMR and assets load without CORS errors
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],

  // Add ngrok bypass header to every response so visitors skip the interstitial
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "ngrok-skip-browser-warning", value: "true" }],
      },
    ];
  },
};

export default nextConfig;
