/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  async rewrites() {
    // Cordn web SPA (adapter-static) — client routes under /chat-app/chat/*
    return [
      {
        source: "/chat-app/chat/:path*",
        destination: "/chat-app/index.html",
      },
      {
        source: "/chat-app/p/:path*",
        destination: "/chat-app/index.html",
      },
      {
        source: "/chat-app/why",
        destination: "/chat-app/index.html",
      },
    ];
  },
};

export default nextConfig;
