export interface WorkshopMemo {
  vendorId: string;
  vendorName: string;
  workshop: number;
  date: string;
  sessionDuration: string;
  note?: string;
  bottomLine: string;
  sections: MemoSection[];
}

export interface MemoSection {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
  subSections?: {
    title: string;
    bullets: string[];
  }[];
  assessment?: string;
}

export interface Milestone {
  id: string;
  label: string;
  date: string;
  isoDate: string;
  status: "complete" | "active" | "upcoming";
  vendorCount?: number;
  vendors?: string[];
  /** Extra line under the milestone (FIS deck / timeline copy). */
  detail?: string;
  /** Rich context for Process countdown cards and timeline. */
  description?: string;
}
