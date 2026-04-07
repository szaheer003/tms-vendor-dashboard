"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type NavLeaf = { href: string; label: string; hint?: string; prominent?: boolean };

type NavSection = { title?: string; items: NavLeaf[] };

type NavGroup = { id: string; label: string; sections: NavSection[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "rfp-plan",
    label: "RFP Plan",
    sections: [
      {
        items: [
          {
            href: "/process/",
            label: "Timeline & process",
            hint: "Milestones, gates, funnel, workshop timeline",
          },
        ],
      },
    ],
  },
  {
    id: "rfp-assessment",
    label: "RFP Assessment",
    sections: [
      {
        title: "Program & commercial",
        items: [
          { href: "/overview/", label: "Overview", hint: "Executive radar & portfolio snapshot", prominent: true },
          { href: "/workshops/", label: "Workshops", hint: "Memos & preparation" },
          { href: "/tear-sheets/", label: "Tear sheets", hint: "Vendor one-pagers" },
          { href: "/commercial/", label: "Commercial", hint: "TCV, pricing, charts", prominent: true },
          { href: "/drill-down/", label: "Drill-down", hint: "Appendix B excerpts" },
        ],
      },
      {
        title: "Evaluation",
        items: [
          { href: "/scorecard/", label: "Scorecard", hint: "Pillar scores & composite", prominent: true },
          { href: "/scoring-dashboard/", label: "Scoring dashboard", hint: "Charts & heatmaps" },
          { href: "/evaluator-scores/", label: "Evaluator scores", hint: "Workshop 1 rubric detail" },
          { href: "/feedback/", label: "Feedback", hint: "Q3–Q7 text, themes, confidence & proceed" },
        ],
      },
    ],
  },
  {
    id: "administration",
    label: "RFP Administration",
    sections: [
      {
        items: [
          {
            href: "/ideal-rfp-submission/",
            label: "Ideal RFP submission",
            hint: "What good looks like — submission checklist",
          },
          { href: "/vendor-submissions/", label: "Vendor submissions", hint: "Workbooks, PDFs, SOW" },
          { href: "/admin/", label: "Admin checklist", hint: "Internal runbook items" },
          { href: "/provide-feedback/", label: "Your feedback", hint: "Capture notes for the build — saves in browser" },
        ],
      },
    ],
  },
];

function normPath(p: string) {
  const x = (p.endsWith("/") ? p.slice(0, -1) : p) || "/";
  return x;
}

function groupContainsPath(group: NavGroup, pathNorm: string): boolean {
  return group.sections.some((s) => s.items.some((item) => normPath(item.href) === pathNorm));
}

function groupOwnsPath(group: NavGroup, pathNorm: string): boolean {
  return group.sections.some((s) =>
    s.items.some((item) => pathNorm === normPath(item.href) || pathNorm.startsWith(`${normPath(item.href)}/`)),
  );
}

function tabTriggerClass(isActiveGroup: boolean): string {
  return `shrink-0 pb-2 pt-1 -mb-px text-[12px] sm:text-[13px] border-b-2 transition-fast flex items-center gap-1.5 rounded-t-md px-1.5 sm:px-2 -mx-1.5 whitespace-nowrap max-w-[200px] sm:max-w-none sm:whitespace-normal sm:text-left leading-tight ${
    isActiveGroup
      ? "text-[#0F172A] font-semibold border-[#0F172A]"
      : "text-[#334155] font-medium border-transparent hover:text-[#0F172A]"
  }`;
}

function NavMenuGroup({
  group,
  pathNorm,
  openId,
  setOpenId,
  activeGroupId,
}: {
  group: NavGroup;
  pathNorm: string;
  openId: string | null;
  setOpenId: Dispatch<SetStateAction<string | null>>;
  activeGroupId: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const open = openId === group.id;
  const isActiveGroup = activeGroupId === group.id;
  const multiColumn = group.sections.length > 1;
  const flatItems = group.sections.flatMap((s) => s.items);
  const singleLink = flatItems.length === 1 ? flatItems[0] : null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpenId]);

  /** One destination only — no dropdown (avoids dead zone + goes straight to Timeline & process). */
  if (singleLink) {
    const leafActive = pathNorm === normPath(singleLink.href);
    return (
      <Link
        href={singleLink.href}
        className={tabTriggerClass(leafActive)}
        onClick={() => setOpenId(null)}
      >
        <span className="line-clamp-2 sm:line-clamp-none text-left">{group.label}</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`nav-group-${group.id}`}
        id={`nav-group-trigger-${group.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpenId((cur) => (cur === group.id ? null : group.id));
        }}
        className={tabTriggerClass(isActiveGroup)}
      >
        <span className="line-clamp-2 sm:line-clamp-none text-left">{group.label}</span>
        <span className={`text-[10px] text-[#475569] opacity-80 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={`nav-group-${group.id}`}
          role="menu"
          aria-labelledby={`nav-group-trigger-${group.id}`}
          className={`absolute left-0 top-[calc(100%-10px)] z-[60] pt-3 rounded-xl border border-[#E2E8F0] bg-white py-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)] animate-page-in ${
            multiColumn
              ? "min-w-[min(100vw-2rem,520px)] max-w-[calc(100vw-1.5rem)] grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 px-2"
              : "min-w-[min(100vw-2rem,280px)] max-w-[calc(100vw-2rem)] py-1.5"
          }`}
        >
          {group.sections.map((section, si) => (
            <div key={si} className={multiColumn ? "min-w-0" : ""}>
              {section.title ? (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
                  {section.title}
                </p>
              ) : null}
              <div className={multiColumn ? "pb-1" : ""}>
                {section.items.map((item) => {
                  const active = pathNorm === normPath(item.href);
                  return (
                    <Link
                      key={item.href}
                      role="menuitem"
                      href={item.href}
                      onClick={() => setOpenId(null)}
                      className={`block py-2.5 text-left transition-colors border-l-[3px] ${
                        active ? "bg-[#F1F5F9] border-[#0F172A] pl-[13px] pr-4" : "border-transparent hover:bg-[#F8FAFC] pl-4 pr-4"
                      }`}
                    >
                      <span
                        className={`block text-[13px] text-[#0F172A] ${active ? "font-semibold" : item.prominent ? "font-semibold" : "font-medium"}`}
                      >
                        {item.label}
                      </span>
                      {item.hint ? (
                        <span className="mt-0.5 block text-[11px] leading-snug text-[#475569]">{item.hint}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({
  title,
  subtitle: _subtitle,
  classification,
  footer,
  dataFootnote,
  children,
}: {
  title: string;
  subtitle: string;
  classification: string;
  footer: string;
  dataFootnote?: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const pNorm = normPath(path);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const activeGroupId = useMemo(() => {
    const exact = NAV_GROUPS.find((g) => groupContainsPath(g, pNorm));
    if (exact) return exact.id;
    const prefix = NAV_GROUPS.find((g) => groupOwnsPath(g, pNorm));
    return prefix?.id ?? null;
  }, [pNorm]);

  useEffect(() => {
    setOpenMenuId(null);
  }, [path]);

  return (
    <div className="min-h-screen flex flex-col surface-page">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] shadow-subtle pt-3 pb-0">
        <div className="max-w-board mx-auto px-4 sm:px-8 lg:px-16 flex min-h-[52px] items-start sm:items-center gap-3 lg:gap-6">
          <p
            className="text-[20px] font-bold text-[#0F172A] shrink-0 max-w-[220px] truncate hidden sm:block pt-2"
            title={title}
          >
            {title}
          </p>
          <nav
            className="flex flex-1 flex-wrap items-start sm:items-center justify-center gap-x-2 gap-y-2 sm:gap-x-5 lg:gap-x-8 min-w-0 overflow-visible pt-2 pb-2 relative z-50"
            aria-label="Primary"
          >
            {NAV_GROUPS.map((g) => (
              <NavMenuGroup
                key={g.id}
                group={g}
                pathNorm={pNorm}
                openId={openMenuId}
                setOpenId={setOpenMenuId}
                activeGroupId={activeGroupId}
              />
            ))}
          </nav>
          <p className="text-[11px] text-[#475569] text-right shrink-0 max-w-[260px] leading-snug hidden lg:block pt-2">
            {classification}
          </p>
        </div>
      </header>

      <div className="min-[1024px]:hidden mt-[72px] sm:mt-[60px] mx-auto max-w-board px-4 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC] text-center">
        <p className="text-caption text-[#475569] font-medium">Best on a wide display (1024px+). All features remain available below.</p>
      </div>

      <main className="flex-1 max-w-board w-full mx-auto px-4 sm:px-8 lg:px-16 pt-10 pb-16 lg:pb-20 mt-[72px] sm:mt-[60px] scroll-mt-[72px] sm:scroll-mt-[60px] animate-page-in min-h-[40vh]">
        {children}
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white mt-auto no-print">
        <div className="max-w-board mx-auto px-4 sm:px-8 lg:px-16 py-6 text-micro text-[#475569]">
          <p className="text-center lg:text-left">{footer}</p>
          {dataFootnote ? <p className="mt-2 text-center lg:text-left text-[#475569] max-w-4xl mx-auto lg:mx-0">{dataFootnote}</p> : null}
        </div>
      </footer>
    </div>
  );
}
