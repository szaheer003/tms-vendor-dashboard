export type VendorDocKind = "pdf" | "spreadsheet" | "html" | "text" | "docx";

export type VendorDocFile = {
  kind: VendorDocKind;
  path: string;
  fileName: string;
  label: string;
  bytes?: number;
  pages?: number;
  submittedAt?: string;
  missing?: boolean;
  sheetNames?: string[];
};

export type VendorManifestEntry = {
  id: string;
  displayName: string;
  color: string;
  proposal?: VendorDocFile | VendorDocFile[];
  workbook?: VendorDocFile;
  sow?: VendorDocFile;
  supplemental?: VendorDocFile[];
};

export type VendorFilesManifest = {
  generatedAt: string;
  vendors: Record<string, VendorManifestEntry>;
};
