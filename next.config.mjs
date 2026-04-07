/** @type {import('next').NextConfig} */
const pages = process.env.GITHUB_PAGES === "true";
const [, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
let basePath = "";
if (pages && repo && !repo.endsWith(".github.io")) {
  basePath = `/${repo}`;
}

const nextConfig = {
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ["react-pdf"],
};

export default nextConfig;
