/** One-off / user-requested: force ./-prefixed paths in out/ for file:// (HTML + JS). */
const fs = require("fs");
const path = require("path");

function walk(d) {
  fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!p.endsWith(".html") && !p.endsWith(".js")) return;
    let c = fs.readFileSync(p, "utf8");
    c = c.replace(/"\/_next\//g, '"./_next/');
    c = c.replace(/'\/_next\//g, "'./_next/");
    c = c.replace(/href="\//g, 'href="./');
    c = c.replace(/src="\//g, 'src="./');
    c = c.replace(/"\/process\//g, '"./process/');
    c = c.replace(/"\/overview\//g, '"./overview/');
    c = c.replace(/"\/commercial\//g, '"./commercial/');
    fs.writeFileSync(p, c);
  });
}

const out = path.join(__dirname, "..", "out");
if (!fs.existsSync(out)) {
  console.error("Missing out/ — run npm run build first.");
  process.exit(1);
}
walk(out);
console.log("All paths fixed");
