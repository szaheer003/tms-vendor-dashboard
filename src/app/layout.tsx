import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientRoot } from "@/components/ClientRoot";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TMS RFP Intelligence Center — Vendor Evaluation",
  description: "FIS x Total Issuing Solutions — Confidential",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
