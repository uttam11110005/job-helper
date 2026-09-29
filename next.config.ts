import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf", "mammoth", "docx"],
  experimental: { serverActions: { bodySizeLimit: "15mb" } },
};

export default nextConfig;
