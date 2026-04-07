/**
 * User-requested relative path pass on static export.
 * Skips `out/_next/**` so webpack runtime string literals like return"/_next/" stay valid for http(s).
 */
const fs = require("fs");
const path = require("path");

const out = path.join(__dirname, "..", "out");

function walk(d) {
  fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    const norm = p.split(path.sep).join("/");
    if (norm.includes("/_next/")) return;
    if (!p.endsWith(".html") && !p.endsWith(".js")) return;
    let c = fs.readFileSync(p, "utf8");
    c = c.replace(/"\/_next\//g, '"./_next/');
    c = c.replace(/'\/_next\//g, "'./_next/");
    c = c.replace(/href="\//g, 'href="./');
    c = c.replace(/src="\//g, 'src="./');
    fs.writeFileSync(p, c);
  });
}

if (!fs.existsSync(out)) {
  console.error("Missing out/");
  process.exit(1);
}
walk(out);
console.log("Paths fixed (html + root js only; skipped _next/)");
