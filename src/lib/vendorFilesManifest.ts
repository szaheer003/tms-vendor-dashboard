import type { VendorFilesManifest } from "./vendorFilesTypes";
import fallbackJson from "@/data/vendor-files-manifest.json";

/** Bundled fallback when /vendor-files-manifest.json is missing (used before first Python sync). */
export const fallbackVendorFilesManifest = fallbackJson as VendorFilesManifest;

export const VENDOR_SUBMISSION_ORDER = ["cognizant", "genpact", "exl", "sutherland", "ubiquity", "ibm"] as const;

export type { VendorDocFile, VendorManifestEntry } from "./vendorFilesTypes";
