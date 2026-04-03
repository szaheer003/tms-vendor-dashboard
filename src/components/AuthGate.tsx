"use client";

import { useState, useEffect, useCallback, type ReactNode, type FormEvent } from "react";

const HASH =
  "8d57a3e4409e3bc9992827e4e45e4d00d9244a640ab9427c123dbbb21f39cc30";
const SESSION_KEY = "tms_auth";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    try {
      setAuthed(sessionStorage.getItem(SESSION_KEY) === "1");
    } catch {
      setAuthed(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setChecking(true);
      setError(false);
      const h = await sha256(password);
      if (h === HASH) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        setAuthed(true);
      } else {
        setError(true);
      }
      setChecking(false);
    },
    [password],
  );

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <p className="text-sm text-[#94A3B8]">Loading…</p>
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-[#e2e8f0] p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1e293b] mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-[#0f172a]">
              TMS Vendor Evaluation
            </h1>
            <p className="text-sm text-[#64748b] mt-1">
              FIS &times; Total Issuing Solutions &mdash; Confidential
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="pw"
              className="block text-xs font-medium text-[#64748b] mb-1.5 uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="pw"
              type="password"
              autoFocus
              autoComplete="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-colors
                ${error ? "border-red-400 ring-2 ring-red-100" : "border-[#cbd5e1] focus:border-[#1e293b] focus:ring-2 focus:ring-[#1e293b]/10"}
                bg-white text-[#0f172a] placeholder:text-[#94a3b8]`}
              placeholder="Enter access code"
            />
            {error && (
              <p className="text-xs text-red-500 mt-1.5">
                Incorrect password. Please try again.
              </p>
            )}
            <button
              type="submit"
              disabled={checking || !password}
              className="mt-4 w-full py-2.5 rounded-lg bg-[#1e293b] text-white text-sm font-medium
                hover:bg-[#334155] active:bg-[#0f172a] transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checking ? "Verifying…" : "Access Dashboard"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-[#94a3b8] mt-6">
          PwC &middot; Strictly confidential
        </p>
      </div>
    </div>
  );
}
