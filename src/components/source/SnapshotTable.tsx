import type { GridSnapshot } from "@/lib/sourceTypes";

export function SnapshotTable({ snap }: { snap: GridSnapshot }) {
  if (!snap?.rows?.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 max-h-48 overflow-y-auto">
      <table className="text-[10px] font-mono w-full border-collapse">
        <thead className="sticky top-0 bg-slate-100 text-slate-500">
          <tr>
            <th className="p-1 text-left w-8 border-b border-slate-200"> </th>
            {snap.rows[0]?.map((cell) => (
              <th key={cell.col} className="p-1 border-b border-slate-200 font-medium">
                {cell.col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snap.rows.map((row, ri) => (
            <tr key={ri}>
              <td className="p-1 text-slate-400 border-r border-slate-100">{row[0]?.r ?? snap.minRow + ri}</td>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`p-1 max-w-[72px] truncate border border-slate-100 ${
                    cell.highlight ? "bg-amber-200/90 ring-1 ring-amber-500 font-semibold text-slate-900" : ""
                  }`}
                  title={cell.value}
                >
                  {cell.value || "·"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
