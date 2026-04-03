import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  accent?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Card({ children, className = "", hover = false, accent, style, ...props }: CardProps) {
  return (
    <div
      className={`rounded-card bg-white shadow-card border border-[#F1F5F9] ${hover ? "card-interactive cursor-pointer" : ""} ${className}`}
      style={accent ? { ...style, borderLeftWidth: 2, borderLeftColor: accent } : style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-[#F1F5F9] ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-6 ${className}`}>{children}</div>;
}
