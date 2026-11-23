import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Font Be Vietnam Pro và logo để vẽ PDF giấy chứng nhận (lib/certificate-pdf.ts đọc từ đĩa).
  outputFileTracingIncludes: {
    "/chung-nhan/**": ["./assets/certificate/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
