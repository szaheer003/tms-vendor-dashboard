"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/PrintButton";

const LS_KEY = "tms-dashboard-stakeholder-feedback-v1";

type Draft = {
  overall: string;
  navigation: string;
  scorecard: string;
  dataContent: string;
  bugs: string;
  priorities: string;
};

const emptyDraft = (): Draft => ({
  overall: "",
  navigation: "",
  scorecard: "",
  dataContent: "",
  bugs: "",
  priorities: "",
});

function loadDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyDraft();
    const p = JSON.parse(raw) as Partial<Draft>;
    return { ...emptyDraft(), ...p };
  } catch {
    return emptyDraft();
  }
}

function toMarkdown(d: Draft, savedAt: string): string {
  return [
    "# TMS dashboard — stakeholder feedback",
    "",
    `_Saved locally in browser · exported ${savedAt}_`,
    "",
    "## Overall",
    d.overall.trim() || "_(empty)_",
    "",
    "## Navigation & layout",
    d.navigation.trim() || "_(empty)_",
    "",
    "## Scorecard & evaluation views",
    d.scorecard.trim() || "_(empty)_",
    "",
    "## Data, copy, methodology",
    d.dataContent.trim() || "_(empty)_",
    "",
    "## Bugs or broken behavior",
    d.bugs.trim() || "_(empty)_",
    "",
    "## Top priorities for next iteration",
    d.priorities.trim() || "_(empty)_",
    "",
  ].join("\n");
}

export function ProvideFeedbackClient() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  const persist = useCallback((d: Draft) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(d));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
    } catch {
      /* quota / private mode */
    }
  }, []);

  const update = useCallback(
    (key: keyof Draft, value: string) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(next), 400);
        return next;
      });
    },
    [persist],
  );

  const downloadMd = () => {
    const md = toMarkdown(draft, new Date().toISOString());
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tms-dashboard-feedback-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = async () => {
    const md = toMarkdown(draft, new Date().toISOString());
    await navigator.clipboard.writeText(md);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const clearAll = () => {
    if (!confirm("Clear all feedback fields in this browser?")) return;
    const next = emptyDraft();
    setDraft(next);
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  };

  const fields: { key: keyof Draft; title: string; hint: string }[] = [
    { key: "overall", title: "Overall", hint: "First impressions, tone, usefulness for your role." },
    { key: "navigation", title: "Navigation & layout", hint: "Menus, grouping, print, mobile, what’s hard to find." },
    { key: "scorecard", title: "Scorecard & evaluation", hint: "Heatmap, composites, drill-down, scoring dashboard." },
    { key: "dataContent", title: "Data & narrative", hint: "Accuracy, missing vendors/tabs, methodology copy." },
    { key: "bugs", title: "Bugs", hint: "What broke, browser, steps to reproduce." },
    { key: "priorities", title: "Priorities", hint: "Top 3 changes you want next." },
  ];

  return (
    <div className="space-y-10 animate-page-in max-w-3xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-h1 text-[#0F172A]">Your feedback</h1>
          <p className="mt-2 text-body text-[#475569] leading-relaxed">
            Capture notes for the dashboard build. Nothing is sent to a server — text stays in this browser until you copy or download it. You can paste the file into email, Teams, or Cursor.
          </p>
          {hydrated && (
            <p className={`mt-2 text-caption transition-opacity ${savedFlash ? "text-[#059669] opacity-100" : "text-[#475569] opacity-90"}`}>
              {savedFlash ? "Saved locally." : "Autosaves as you type."}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 print-hide">
          <PrintButton label="Print" />
          <button
            type="button"
            onClick={copyAll}
            className="text-caption text-[#475569] hover:text-[#0F172A] px-3 py-1.5 rounded-btn border border-[#E2E8F0] bg-white transition-colors duration-150"
          >
            Copy all
          </button>
          <button
            type="button"
            onClick={downloadMd}
            className="text-caption font-medium text-[#0F172A] px-3 py-1.5 rounded-btn border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors duration-150"
          >
            Export feedback (.md)
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-caption text-[#B91C1C] hover:text-[#991B1B] px-3 py-1.5 rounded-btn border border-transparent hover:border-[#FECACA] transition-colors duration-150"
          >
            Clear
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFBEB] p-4 text-caption text-[#92400E] leading-relaxed">
        This page is separate from <strong className="font-semibold">Evaluation → Feedback</strong>, which shows Workshop 1 evaluator Q3–Q7 text from imports.
      </div>

      <div className="space-y-8">
        {fields.map(({ key, title, hint }) => (
          <div key={key} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <label htmlFor={`fb-${key}`} className="block text-h3 font-semibold text-[#0F172A]">
              {title}
            </label>
            <p className="mt-1 text-caption text-[#475569] mb-3">{hint}</p>
            <textarea
              id={`fb-${key}`}
              value={hydrated ? draft[key] : ""}
              onChange={(e) => update(key, e.target.value)}
              rows={key === "priorities" ? 4 : 5}
              disabled={!hydrated}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-body text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15 focus:border-[#CBD5E1] resize-y min-h-[100px]"
              placeholder="Type here…"
            />
          </div>
        ))}
      </div>

      <footer className="text-center text-caption text-[#475569] pb-8">
        Tip: after <strong className="text-[#475569]">Download .md</strong>, attach the file or drop it into a chat with your team or AI assistant.
      </footer>
    </div>
  );
}
