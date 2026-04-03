/**
 * Serves `out/` and prints each dashboard route to PDF in the project root.
 * Requires: `npm run build` (static export) and `npx playwright install chromium`.
 *
 * Usage: node scripts/export-dashboard-pdfs.mjs
 * Optional: --port=4177  --skip-server  (if you already serve out/ at that port)
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "out");

const PORT = (() => {
  const a = process.argv.find((x) => x.startsWith("--port="));
  return a ? Number(a.slice("--port=".length)) || 4177 : 4177;
})();
const SKIP_SERVER = process.argv.includes("--skip-server");

/** Same surface area as AppShell nav; `/` duplicates overview — export overview once. */
const ROUTES = [
  { path: "/overview/", file: "Dashboard-Overview.pdf" },
  { path: "/process/", file: "Dashboard-Process-Timeline.pdf" },
  { path: "/workshops/", file: "Dashboard-Workshops.pdf" },
  { path: "/tear-sheets/", file: "Dashboard-Tear-Sheets.pdf" },
  { path: "/commercial/", file: "Dashboard-Commercial.pdf" },
  { path: "/drill-down/", file: "Dashboard-Drill-Down.pdf" },
  { path: "/scorecard/", file: "Dashboard-Scorecard.pdf" },
  { path: "/scoring-dashboard/", file: "Dashboard-Scoring-Dashboard.pdf" },
  { path: "/evaluator-scores/", file: "Dashboard-Evaluator-Scores.pdf" },
  { path: "/feedback/", file: "Dashboard-Feedback.pdf" },
  { path: "/ideal-rfp-submission/", file: "Dashboard-Ideal-RFP-Submission.pdf" },
  { path: "/vendor-submissions/", file: "Dashboard-Vendor-Submissions.pdf" },
  { path: "/admin/", file: "Dashboard-Admin.pdf" },
  { path: "/provide-feedback/", file: "Dashboard-Provide-Feedback.pdf" },
];

function waitForServer(origin, maxMs = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http
        .get(`${origin}/`, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > maxMs) {
            reject(new Error(`Server at ${origin} did not respond within ${maxMs}ms`));
          } else {
            setTimeout(tryOnce, 250);
          }
        });
    };
    tryOnce();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startStaticServer() {
  const proc = spawn("python", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: OUT,
    stdio: "ignore",
    windowsHide: true,
  });
  const origin = `http://127.0.0.1:${PORT}`;
  await waitForServer(origin);
  return { proc, origin };
}

async function gotoSettled(page, url) {
  /** Avoid `networkidle` — PDF viewers / analytics can prevent it from ever firing. */
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  try {
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
  } catch {
    /* ignore */
  }
  await sleep(4500);
}

async function launchChromium() {
  const envChannel = process.env.PW_CHANNEL;
  if (envChannel) {
    return chromium.launch({ channel: envChannel, headless: true });
  }
  /** Prefer system browsers so `npx playwright install chromium` is not required (e.g. corporate TLS). */
  for (const channel of ["chrome", "msedge"]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      /* try next */
    }
  }
  return chromium.launch({ headless: true });
}

async function main() {
  if (!fs.existsSync(join(OUT, "index.html"))) {
    console.error("Missing out/index.html — run: npm run build");
    process.exit(1);
  }

  let serverProc = null;
  let origin = `http://127.0.0.1:${PORT}`;

  if (!SKIP_SERVER) {
    serverProc = (await startStaticServer()).proc;
  } else {
    await waitForServer(origin);
  }

  const browser = await launchChromium();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  try {
    for (const { path: routePath, file } of ROUTES) {
      const page = await context.newPage();
      const url = `${origin}${routePath}`;
      // Python http.server expects paths like overview/ -> overview/index.html
      const pdfPath = join(ROOT, file);

      await gotoSettled(page, url);

      await page.emulateMedia({ media: "screen" });

      const scrollHeight = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0,
        ),
      );
      const safeHeight = Math.min(Math.ceil(scrollHeight * 1.02), 16000);

      try {
        await page.pdf({
          path: pdfPath,
          printBackground: true,
          width: "1440px",
          height: `${safeHeight}px`,
          margin: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
        });
      } catch (err) {
        console.warn(file, "fallback A4 landscape:", err.message);
        await page.pdf({
          path: pdfPath,
          printBackground: true,
          format: "A4",
          landscape: true,
          margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
        });
      }

      console.log("  ok:", file);
      await page.close();
    }
  } finally {
    await browser.close();
    if (serverProc) {
      serverProc.kill();
    }
  }

  console.log(`Wrote ${ROUTES.length} PDFs to ${ROOT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
