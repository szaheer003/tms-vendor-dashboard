/** @type {import('next').NextConfig} */
/**
 * GitHub Pages project sites live at https://owner.github.io/repo-name/ — set GITHUB_PAGES=true in CI
 * so asset URLs resolve. User/org root sites use a repo named *.github.io; those keep basePath "".
 */
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
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
