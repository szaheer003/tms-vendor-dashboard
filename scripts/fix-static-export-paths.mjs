/**
 * After `next build` with `output: "export"`, HTML contains root-absolute asset
 * URLs (`/_next/...`, `href="/...`). That breaks when opening `out/index.html` via
 * file:// or from an arbitrary folder. Rewrite per file based on depth under `out/`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "out");

if (!fs.existsSync(outDir)) {
  console.error("fix-static-export-paths: missing out/ — run npm run build first.");
  process.exit(1);
}

function walk(dir, fn) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, fn);
    else fn(p);
  }
}

function prefixForHtmlFile(htmlPath) {
  const dir = path.dirname(htmlPath);
  const rel = path.relative(outDir, dir);
  const depth = rel ? rel.split(path.sep).filter(Boolean).length : 0;
  return depth === 0 ? "./" : "../".repeat(depth);
}

function fixHtml(htmlPath) {
  const prefix = prefixForHtmlFile(htmlPath);
  let s = fs.readFileSync(htmlPath, "utf8");
  const before = s;
  // Next emits "/_next/..." everywhere; make it relative to this file's directory.
  s = s.replace(/\/_next\//g, `${prefix}_next/`);
  // Other root-absolute URLs into out/ (e.g. /data/, /vendor-files/)
  s = s.replace(/href="\//g, `href="${prefix}`);
  s = s.replace(/src="\//g, `src="${prefix}`);
  if (s !== before) fs.writeFileSync(htmlPath, s);
}

walk(outDir, (p) => {
  if (p.endsWith(".html")) fixHtml(p);
});

/** Webpack hard-codes d.p="/_next/" so lazy chunks load from the wrong place under file://. */
function patchWebpackRuntime(chunksDir) {
  if (!fs.existsSync(chunksDir)) return;
  const marker = 'd.p="/_next/"';
  const inject =
    'd.p=function(){try{if(location.protocol!=="file:")return"/_next/";var p=decodeURI(location.pathname.split(String.fromCharCode(92)).join("/")).split("/").filter(Boolean),i=p.lastIndexOf("out"),u=new URL(".",location.href);if(i<0)return"/_next/";for(var k=p.length-i-2,j=0;j<k;j++)u=new URL("..",u);return new URL("_next/",u).href}catch(e){return"/_next/"}}(),';
  for (const name of fs.readdirSync(chunksDir)) {
    if (!name.startsWith("webpack-") || !name.endsWith(".js")) continue;
    const p = path.join(chunksDir, name);
    let s = fs.readFileSync(p, "utf8");
    if (!s.includes(marker)) continue;
    s = s.split(marker).join(inject);
    fs.writeFileSync(p, s);
  }
}

patchWebpackRuntime(path.join(outDir, "_next", "static", "chunks"));

console.log("fix-static-export-paths: updated HTML + webpack runtime under out/");
