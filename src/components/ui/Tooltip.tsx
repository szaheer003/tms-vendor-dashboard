"use client";

import { useState, type ReactNode } from "react";

type Position = "top" | "bottom" | "left" | "right";

export function Tooltip({
  children,
  content,
  position = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  position?: Position;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={`absolute z-[70] px-3 py-2 rounded-btn text-micro text-white bg-ink shadow-popover whitespace-nowrap animate-fade-in pointer-events-none ${
            position === "top" ? "bottom-full left-1/2 -translate-x-1/2 mb-2" : ""
          } ${position === "bottom" ? "top-full left-1/2 -translate-x-1/2 mt-2" : ""} ${
            position === "left" ? "right-full top-1/2 -translate-y-1/2 mr-2" : ""
          } ${position === "right" ? "left-full top-1/2 -translate-y-1/2 ml-2" : ""}`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
