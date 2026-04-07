import { fmtBytes } from "./fmtBytes";

type Props = {
  fileName: string;
  pages?: number;
  bytes?: number;
  submittedAt?: string;
};

function fmtSubmitted(iso: string) {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });
}

export function DocumentMetadataBar({ fileName, pages, bytes, submittedAt }: Props) {
  const parts = [
    fileName,
    pages != null ? `${pages} page${pages === 1 ? "" : "s"}` : null,
    bytes != null ? fmtBytes(bytes) : null,
    submittedAt ? `Submitted ${fmtSubmitted(submittedAt)}` : null,
  ].filter(Boolean);

  return (
    <p className="mt-3 text-caption text-[#475569]">
      {parts.join(" · ")}
    </p>
  );
}
