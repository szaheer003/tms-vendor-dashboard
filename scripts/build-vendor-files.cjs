/**
 * Copies vendor files into public/vendor-files/, converts workbooks to JSON,
 * docx → HTML (or plain text for Cognizant SOW edge case), records PDF page counts.
 * Run from project root: node scripts/build-vendor-files.cjs
 */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "vendor-files");
const MANIFEST_OUT = path.join(ROOT, "src", "data", "vendor-files-manifest.json");

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function pdfPageCount(absPath) {
  const buf = fs.readFileSync(absPath);
  const data = await pdfParse(buf);
  return data.numpages || 1;
}

function exportWorkbookJson(wb) {
  const sheets = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws["!ref"];
    if (!ref) {
      sheets.push({ name, rows: [] });
      continue;
    }
    const range = XLSX.utils.decode_range(ref);
    const rows = [];
    for (let R = range.s.r; R <= range.e.r; R++) {
      const row = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        let v = "";
        if (cell) {
          v = cell.w != null ? String(cell.w) : cell.v != null ? String(cell.v) : "";
        }
        row.push({ v });
      }
      rows.push(row);
    }
    sheets.push({ name, rows });
  }
  return { sheets };
}

function writeWorkbookJson(wb, jsonPath) {
  const data = exportWorkbookJson(wb);
  fs.writeFileSync(jsonPath, JSON.stringify(data), "utf8");
  return data;
}

async function processDocxToHtml(src, destHtml) {
  const result = await mammoth.convertToHtml({ path: src });
  const html = `<div class="vendor-doc mammoth-doc">${result.value}</div>`;
  fs.writeFileSync(destHtml, html, "utf8");
  if (result.messages?.length) {
    console.warn("mammoth:", path.basename(src), result.messages.map((m) => m.message).join("; "));
  }
}

function isZipDocx(buf) {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
}

async function processSowCognizant(src, outDir) {
  const buf = fs.readFileSync(src);
  if (!isZipDocx(buf)) {
    const text = buf.toString("utf8");
    const dest = path.join(outDir, "sow.txt");
    fs.writeFileSync(dest, text, "utf8");
    return { kind: "text", rel: "sow.txt", fileName: path.basename(src) };
  }
  const dest = path.join(outDir, "sow.html");
  await processDocxToHtml(src, dest);
  return { kind: "html", rel: "sow.html", fileName: path.basename(src) };
}

const SUBMITTED = "2026-03-30";
const F2_ABS = path.join(ROOT, "Folder 2");

function f2PdfNames() {
  try {
    return fs.readdirSync(F2_ABS).filter((n) => n.toLowerCase().endsWith(".pdf"));
  } catch {
    return [];
  }
}

/** @param {string} name @returns {string} */
function f2rel(name) {
  return path.join("Folder 2", name).replace(/\\/g, "/");
}

function scoreCognizantPdf(name) {
  const n = name.toLowerCase();
  let s = 0;
  if (n.includes("one page") || (n.includes("summary") && n.includes("response guide"))) s -= 30;
  if (n.includes("proposal") || n.includes("presentation") || n.includes("partnership")) s += 20;
  if (n.includes("workshop")) s += 8;
  return s;
}

function scoreSutherlandPdf(name) {
  const n = name.toLowerCase();
  let s = 0;
  if (n.includes("response guide")) s -= 25;
  if (n.includes("response") || n.includes("updated") || n.includes("tsys")) s += 10;
  return s;
}

/** @type {Record<string, any>} */
const BUILD = {
  cognizant: {
    id: "cognizant",
    displayName: "Cognizant",
    color: "#1E3A5F",
    proposal: {
      from: "Folder 2/Cognizant_FIS TSYS Managed Services Partnership Cognizant Proposal Document.pdf",
      to: "proposal.pdf",
      label: "Proposal",
    },
    workbook: {
      from: "Folder 1/Cognizant_ Appendix B - TMS RFP - Cognizant - Vendor Response Workbook.xlsx",
      to: "workbook.xlsx",
      label: "Workbook",
    },
    sow: {
      from: "Folder 3/Cognizant_Appendix C - Draft FIS SOW_Cognizant Redline.Docx",
      label: "SOW Redline",
    },
    supplemental: [
      {
        from: "Folder 2/Cognizant_One page summary - FIS RFP Response Guide.pdf",
        to: "supplemental-0.pdf",
        label: "One page summary",
      },
    ],
  },
  genpact: {
    id: "genpact",
    displayName: "Genpact",
    color: "#059669",
    proposal: {
      from: "Folder 2/Genpact_FIS - TMS RFP G Proposal - 20 pager.pdf",
      to: "proposal.pdf",
      label: "Proposal",
    },
    workbook: {
      from: "Folder 1/Genpact_Appendix B - TMS RFP - G updated.xlsx",
      to: "workbook.xlsx",
      label: "Workbook",
    },
    sow: { from: "Folder 3/Genpact_Appendix C - Draft FIS SOW_G updated.docx", label: "SOW Redline" },
    supplemental: [
      {
        from: "Folder 2/Genpact_FIS - TMS RFP G Proposal Exec Summary.docx",
        to: "supplemental-0.html",
        label: "Executive summary",
        convert: "docx",
      },
    ],
  },
  exl: {
    id: "exl",
    displayName: "EXL",
    color: "#EA580C",
    proposal: [
      { from: "Folder 2/EXL_FIS Managed Services RFP_EXL-1.pdf", to: "proposal-0.pdf", label: "Proposal — Part 1" },
      { from: "Folder 2/EXL_FIS Managed Services RFP_EXL-2.pdf", to: "proposal-1.pdf", label: "Proposal — Part 2" },
    ],
    workbook: {
      from: "Folder 1/EXL_APPEND~1.XLS",
      to: "workbook.xlsx",
      label: "Workbook",
      convertFromXls: true,
    },
    sow: { from: "Folder 3/EXL_Draft FIS SOW - EXL Comment.docx", label: "SOW Redline" },
    supplemental: [
      {
        from: "Folder 2/EXL_Response Guide.docx",
        to: "supplemental-0.html",
        label: "Response guide",
        convert: "docx",
      },
    ],
  },
  sutherland: {
    id: "sutherland",
    displayName: "Sutherland",
    color: "#4B5563",
    proposal: {
      from: "Folder 2/Sutherland_Response to FIS (TSYS).pdf",
      to: "proposal.pdf",
      label: "Proposal",
    },
    workbook: {
      from: "Folder 1/Sutherland_Appendix B - TMS RFP - Sutherland Response to FIS.xlsx",
      to: "workbook.xlsx",
      label: "Workbook",
    },
    sow: { from: "Folder 3/Sutherland_Response to Appendix C - FIS SOW.docx", label: "SOW Redline" },
    supplemental: [
      {
        from: "Folder 2/Sutherland_Response Guide.docx",
        to: "supplemental-0.html",
        label: "Response guide",
        convert: "docx",
      },
    ],
  },
  ubiquity: {
    id: "ubiquity",
    displayName: "Ubiquity",
    color: "#DC2626",
    proposal: {
      from: "Folder 2/Ubiquity_FIS__Ubiquity_Proposal.pdf",
      to: "proposal.pdf",
      label: "Proposal",
    },
    workbook: {
      from: "Folder 1/Ubiquity_Pricing Response for FIS(2).xlsx",
      to: "workbook.xlsx",
      label: "Workbook",
    },
    sow: { from: "Folder 3/Ubiquity_Appendix C - Draft FIS SOW RF redliines CB.docx", label: "SOW Redline" },
    supplemental: [
      {
        from: "Folder 2/Ubiquity_Executive Summary_Ubiquity-FIS.pdf",
        to: "supplemental-0.pdf",
        label: "Executive summary",
      },
      {
        from: "Folder 1/Ubiquity_Response_Vendor_RFP_Questionnaire_with_Fraud_Supplement_FINAL.xlsx",
        to: "supplemental-1.json",
        label: "RFP questionnaire",
        spreadsheet: true,
      },
      {
        from: "Folder 1/Ubiquity_Pricing Response for FIS.xlsx",
        to: "supplemental-2.json",
        label: "Pricing response (alternate)",
        spreadsheet: true,
      },
    ],
  },
  ibm: {
    id: "ibm",
    displayName: "IBM",
    color: "#1E40AF",
    proposal: {
      from: "Folder 2/IBM_FIS TMS Managed Services RFP Response_IBM_Mar 26.pdf",
      to: "proposal.pdf",
      label: "Proposal",
    },
    workbook: {
      from: "Folder 1/IBM_Appendix B - TMS RFP - Vendor Response Workbook_IBM 26-Mar-2026.xlsx",
      to: "workbook.xlsx",
      label: "Workbook",
    },
    sow: { from: "Folder 3/IBM_Appendix C - Draft FIS SOW_IBM March 26.docx", label: "SOW Redline" },
    supplemental: [],
  },
};

function applyResolvedFolder2Proposals() {
  const pick = (names, scorer) => {
    const found = names
      .map((n) => ({ n, abs: path.join(F2_ABS, n) }))
      .filter((x) => exists(x.abs));
    if (!found.length) return null;
    found.sort((a, b) => scorer(b.n) - scorer(a.n) || a.n.localeCompare(b.n));
    return found[0].n;
  };

  const cogHits = f2PdfNames().filter((n) => n.toLowerCase().includes("cognizant"));
  if (cogHits.length) {
    const ranked = [...cogHits].sort((a, b) => scoreCognizantPdf(b) - scoreCognizantPdf(a) || a.localeCompare(b));
    BUILD.cognizant.proposal.from = f2rel(ranked[0]);
  }

  const sutNames = [
    "Sutherland_Response to FIS (TSYS).pdf",
    "Sutherland_Response to_FIS (TSYS).pdf",
    "Sutherland_response to FIS-updated March 30, 2026.pdf",
  ];
  let sut = sutNames.find((n) => exists(path.join(F2_ABS, n)));
  if (!sut) {
    const hits = f2PdfNames().filter((n) => n.toLowerCase().includes("sutherland"));
    sut = pick(hits, scoreSutherlandPdf);
  }
  if (sut) BUILD.sutherland.proposal.from = f2rel(sut);

  const genLegacy = "Genpact_FIS - TMS RFP G Proposal - 20 pager.pdf";
  if (exists(path.join(F2_ABS, genLegacy))) BUILD.genpact.proposal.from = f2rel(genLegacy);
  else {
    const hits = f2PdfNames().filter((n) => n.toLowerCase().includes("genpact") && !n.toLowerCase().includes("exec"));
    const n = pick(hits, (name) => (name.toLowerCase().includes("20 pager") || name.toLowerCase().includes("proposal") ? 15 : 0));
    if (n) BUILD.genpact.proposal.from = f2rel(n);
  }

  const exl1 = "EXL_FIS Managed Services RFP_EXL-1.pdf";
  const exl2 = "EXL_FIS Managed Services RFP_EXL-2.pdf";
  if (exists(path.join(F2_ABS, exl1)) && exists(path.join(F2_ABS, exl2))) {
    BUILD.exl.proposal = [
      { from: f2rel(exl1), to: "proposal-0.pdf", label: "Proposal — Part 1" },
      { from: f2rel(exl2), to: "proposal-1.pdf", label: "Proposal — Part 2" },
    ];
  } else {
    const hits = f2PdfNames().filter((n) => n.toLowerCase().includes("exl") && !n.toLowerCase().includes("guide"));
    if (hits.length >= 2) {
      const sorted = [...hits].sort((a, b) => a.localeCompare(b));
      BUILD.exl.proposal = [
        { from: f2rel(sorted[0]), to: "proposal-0.pdf", label: "Proposal — Part 1" },
        { from: f2rel(sorted[1]), to: "proposal-1.pdf", label: "Proposal — Part 2" },
      ];
    } else if (hits.length === 1) {
      BUILD.exl.proposal = [{ from: f2rel(hits[0]), to: "proposal.pdf", label: "Proposal" }];
    }
  }

  const ubiLegacy = "Ubiquity_FIS__Ubiquity_Proposal.pdf";
  if (exists(path.join(F2_ABS, ubiLegacy))) BUILD.ubiquity.proposal.from = f2rel(ubiLegacy);
  else {
    let hits = f2PdfNames().filter((n) => n.toLowerCase().includes("ubiquity"));
    hits = hits.filter((n) => !n.toLowerCase().includes("executive") && !n.toLowerCase().includes("summary"));
    if (!hits.length) hits = f2PdfNames().filter((n) => n.toLowerCase().includes("ubiquity"));
    const n = pick(hits, (name) => {
      const l = name.toLowerCase();
      let s = 0;
      if (l.includes("proposal")) s += 15;
      if (l.includes("executive")) s -= 10;
      return s;
    });
    if (n) BUILD.ubiquity.proposal.from = f2rel(n);
  }

  const ibmLegacy = "IBM_FIS TMS Managed Services RFP Response_IBM_Mar 26.pdf";
  if (exists(path.join(F2_ABS, ibmLegacy))) BUILD.ibm.proposal.from = f2rel(ibmLegacy);
  else {
    const hits = f2PdfNames().filter((n) => n.toLowerCase().includes("ibm"));
    if (hits.length) BUILD.ibm.proposal.from = f2rel([...hits].sort((a, b) => a.localeCompare(b))[0]);
  }
}

applyResolvedFolder2Proposals();

async function copyPdf(relFrom, vendorDir, destName, label) {
  const src = path.join(ROOT, relFrom);
  const dest = path.join(vendorDir, destName);
  if (!exists(src)) {
    console.warn("Missing:", relFrom);
    return {
      kind: "pdf",
      path: `/vendor-files/${path.basename(vendorDir)}/${destName}`,
      fileName: path.basename(relFrom),
      label,
      missing: true,
      submittedAt: SUBMITTED,
    };
  }
  ensureDir(vendorDir);
  fs.copyFileSync(src, dest);
  const st = fs.statSync(dest);
  const pages = await pdfPageCount(dest);
  return {
    kind: "pdf",
    path: `/vendor-files/${path.basename(vendorDir)}/${destName}`,
    fileName: path.basename(relFrom),
    label,
    bytes: st.size,
    pages,
    submittedAt: SUBMITTED,
  };
}

async function buildVendor(vendorKey, def) {
  const vendorDir = path.join(OUT, vendorKey);
  ensureDir(vendorDir);
  /** @type {any} */
  const entry = {
    id: def.id,
    displayName: def.displayName,
    color: def.color,
  };

  // Proposal
  if (Array.isArray(def.proposal)) {
    const arr = [];
    for (const p of def.proposal) {
      arr.push(await copyPdf(p.from, vendorDir, p.to, p.label));
    }
    entry.proposal = arr;
  } else if (def.proposal) {
    entry.proposal = await copyPdf(def.proposal.from, vendorDir, def.proposal.to, def.proposal.label);
  }

  // Workbook
  if (def.workbook) {
    const src = path.join(ROOT, def.workbook.from);
    const xlsxName = def.workbook.to;
    const destX = path.join(vendorDir, xlsxName);
    const jsonName = "workbook.json";
    const destJ = path.join(vendorDir, jsonName);
    if (!exists(src)) {
      console.warn("Missing workbook:", def.workbook.from);
      entry.workbook = {
        kind: "spreadsheet",
        path: `/vendor-files/${vendorKey}/${jsonName}`,
        fileName: path.basename(def.workbook.from),
        label: def.workbook.label,
        missing: true,
        submittedAt: SUBMITTED,
        sheetNames: [],
      };
    } else {
      let wb;
      if (def.workbook.convertFromXls) {
        wb = XLSX.readFile(src, { cellDates: true });
        XLSX.writeFile(wb, destX, { bookType: "xlsx" });
      } else {
        fs.copyFileSync(src, destX);
        wb = XLSX.readFile(destX, { cellDates: true });
      }
      const data = writeWorkbookJson(wb, destJ);
      const st = fs.statSync(destJ);
      entry.workbook = {
        kind: "spreadsheet",
        path: `/vendor-files/${vendorKey}/${jsonName}`,
        fileName: path.basename(def.workbook.from),
        label: def.workbook.label,
        bytes: st.size,
        submittedAt: SUBMITTED,
        sheetNames: data.sheets.map((s) => s.name),
      };
    }
  }

  // SOW
  if (def.sow) {
    const src = path.join(ROOT, def.sow.from);
    if (vendorKey === "cognizant") {
      if (!exists(src)) {
        entry.sow = {
          kind: "text",
          path: `/vendor-files/${vendorKey}/sow.txt`,
          fileName: path.basename(def.sow.from),
          label: def.sow.label,
          missing: true,
          submittedAt: SUBMITTED,
        };
      } else {
        const meta = await processSowCognizant(src, vendorDir);
        const st = fs.statSync(path.join(vendorDir, meta.rel));
        entry.sow = {
          kind: meta.kind,
          path: `/vendor-files/${vendorKey}/${meta.rel}`,
          fileName: meta.fileName,
          label: def.sow.label,
          bytes: st.size,
          submittedAt: SUBMITTED,
        };
      }
    } else {
      const dest = path.join(vendorDir, "sow.html");
      if (!exists(src)) {
        entry.sow = {
          kind: "html",
          path: `/vendor-files/${vendorKey}/sow.html`,
          fileName: path.basename(def.sow.from),
          label: def.sow.label,
          missing: true,
          submittedAt: SUBMITTED,
        };
      } else {
        await processDocxToHtml(src, dest);
        const st = fs.statSync(dest);
        entry.sow = {
          kind: "html",
          path: `/vendor-files/${vendorKey}/sow.html`,
          fileName: path.basename(def.sow.from),
          label: def.sow.label,
          bytes: st.size,
          submittedAt: SUBMITTED,
        };
      }
    }
  }

  // Supplemental
  if (def.supplemental?.length) {
    const list = [];
    let idx = 0;
    for (const s of def.supplemental) {
      const src = path.join(ROOT, s.from);
      if (s.spreadsheet) {
        const jsonName = s.to.endsWith(".json") ? s.to : `supplemental-${idx}.json`;
        const destJ = path.join(vendorDir, jsonName);
        const xlsxCopy = path.join(vendorDir, `supplemental-${idx}-source.xlsx`);
        if (!exists(src)) {
          list.push({
            kind: "spreadsheet",
            path: `/vendor-files/${vendorKey}/${jsonName}`,
            fileName: path.basename(s.from),
            label: s.label,
            missing: true,
            submittedAt: SUBMITTED,
            sheetNames: [],
          });
        } else {
          fs.copyFileSync(src, xlsxCopy);
          const wb = XLSX.readFile(xlsxCopy, { cellDates: true });
          writeWorkbookJson(wb, destJ);
          const data = JSON.parse(fs.readFileSync(destJ, "utf8"));
          const st = fs.statSync(destJ);
          list.push({
            kind: "spreadsheet",
            path: `/vendor-files/${vendorKey}/${jsonName}`,
            fileName: path.basename(s.from),
            label: s.label,
            bytes: st.size,
            submittedAt: SUBMITTED,
            sheetNames: data.sheets.map((x) => x.name),
          });
        }
      } else if (s.convert === "docx") {
        const htmlName = s.to || `supplemental-${idx}.html`;
        const dest = path.join(vendorDir, htmlName);
        if (!exists(src)) {
          list.push({
            kind: "html",
            path: `/vendor-files/${vendorKey}/${htmlName}`,
            fileName: path.basename(s.from),
            label: s.label,
            missing: true,
            submittedAt: SUBMITTED,
          });
        } else {
          await processDocxToHtml(src, dest);
          const st = fs.statSync(dest);
          list.push({
            kind: "html",
            path: `/vendor-files/${vendorKey}/${htmlName}`,
            fileName: path.basename(s.from),
            label: s.label,
            bytes: st.size,
            submittedAt: SUBMITTED,
          });
        }
      } else {
        list.push(await copyPdf(s.from, vendorDir, s.to || `supplemental-${idx}.pdf`, s.label));
      }
      idx++;
    }
    entry.supplemental = list;
  }

  return entry;
}

async function copyPdfWorker() {
  const workerSrc = path.join(ROOT, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
  const pub = path.join(ROOT, "public");
  ensureDir(pub);
  if (exists(workerSrc)) {
    fs.copyFileSync(workerSrc, path.join(pub, "pdf.worker.min.mjs"));
    console.log("Copied pdf.worker.min.mjs to /public");
  } else {
    console.warn("pdfjs worker not found — PDF viewer will use CDN fallback in app.");
  }
}

async function main() {
  ensureDir(OUT);
  await copyPdfWorker();
  /** @type {Record<string, any>} */
  const vendors = {};
  for (const key of Object.keys(BUILD)) {
    vendors[key] = await buildVendor(key, BUILD[key]);
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    vendors,
  };
  ensureDir(path.dirname(MANIFEST_OUT));
  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2), "utf8");
  console.log("Wrote", MANIFEST_OUT);
  console.log("Done. Public vendor-files bytes:", fmtBytes(fs.statSync(MANIFEST_OUT).size));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
