import type { VendorFilesManifest } from "./vendorFilesTypes";
import bundledJson from "@/data/vendor-files-manifest.json";

/** Bundled at build time (file:// safe; no runtime fetch). */
export const bundledVendorFilesManifest = bundledJson as VendorFilesManifest;

/** @deprecated Use bundledVendorFilesManifest */
export const fallbackVendorFilesManifest = bundledVendorFilesManifest;

export const VENDOR_SUBMISSION_ORDER = ["cognizant", "genpact", "exl", "sutherland", "ubiquity", "ibm"] as const;

export type { VendorDocFile, VendorManifestEntry } from "./vendorFilesTypes";
