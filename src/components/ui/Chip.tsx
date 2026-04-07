import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes } from "react";

type Variant = "soft" | "solid" | "outline";
type Size = "sm" | "md";

type ChipProps = {
  label: string;
  color: string;
  variant?: Variant;
  size?: Size;
} & HTMLAttributes<HTMLSpanElement>;

export function Chip({ label, color, variant = "soft", size = "sm", className = "", style, ...props }: ChipProps) {
  const styles: Record<Variant, CSSProperties> = {
    soft: { backgroundColor: `${color}14`, color, borderColor: `${color}30` },
    solid: { backgroundColor: color, color: "#fff", borderColor: color },
    outline: { borderColor: color, color, backgroundColor: "transparent" },
  };
  return (
    <span
      className={`inline-flex items-center font-medium border rounded-chip transition-colors duration-150 ${
        size === "sm" ? "px-2.5 py-0.5 text-micro" : "px-3.5 py-1.5 text-caption"
      } ${className}`}
      style={{ ...styles[variant], ...style }}
      {...props}
    >
      {label}
    </span>
  );
}

/** Vendor / filter pill as a button (selected = tinted or solid). */
export function FilterChip({
  label,
  color,
  selected,
  pillVariant = "soft",
  monochrome,
  className = "",
  ...props
}: {
  label: string;
  color: string;
  selected?: boolean;
  pillVariant?: "soft" | "solid";
  /** Slate / black pills (e.g. drill-down sub-tabs) */
  monochrome?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  if (monochrome) {
    return (
      <button
        type="button"
        className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-fast ${
          selected ? "bg-[#0F172A] text-white" : "bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A]"
        } ${className}`}
        {...props}
      >
        {label}
      </button>
    );
  }
  const softSelected =
    selected && pillVariant === "soft"
      ? {
          backgroundColor: `${color}1F`,
          borderColor: color,
          color,
          borderBottomWidth: 2,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
        }
      : undefined;
  const solidSelected =
    selected && pillVariant === "solid"
      ? { backgroundColor: color, borderColor: color, color: "#fff" }
      : undefined;
  return (
    <button
      type="button"
      className={`rounded-chip border px-4 py-2 text-caption font-medium transition-all duration-200 ease-out ${
        selected ? "font-semibold shadow-sm" : "bg-white text-[#475569] border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1]"
      } ${className}`}
      style={
        solidSelected ??
        softSelected ??
        (!selected ? { color, borderColor: "#E2E8F0" } : undefined)
      }
      {...props}
    >
      {label}
    </button>
  );
}
