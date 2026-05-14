/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  basePath: isGitHubPages ? "/ramen-analytics" : undefined,
  assetPrefix: isGitHubPages ? "/ramen-analytics/" : undefined
};

export default nextConfig;
