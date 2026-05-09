const isStatic = process.env.STATIC === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Surfaced to the client so components can hide editor affordances in the
  // published build.
  env: {
    NEXT_PUBLIC_STATIC: isStatic ? "1" : "0",
  },
  ...(isStatic
    ? {
        output: "export",
        images: { unoptimized: true },
        trailingSlash: true,
        // For project pages on github.io: STATIC=1 BASE_PATH=/<repo> npm run build
        basePath: process.env.BASE_PATH ?? "",
        assetPrefix: process.env.BASE_PATH ?? "",
      }
    : {}),
};

export default nextConfig;
