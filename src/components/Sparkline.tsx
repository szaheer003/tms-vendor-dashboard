export function Sparkline({ values, color }: { values: (number | null | undefined)[]; color: string }) {
  const v = values.map((x) => (x == null || Number.isNaN(x) ? null : Number(x))).filter((x): x is number => x != null);
  const w = 80;
  const h = 24;
  const first = v[0];
  const last = v[v.length - 1];
  let tint = "bg-surface-sunken/80";
  if (v.length >= 2 && first != null && last != null) {
    if (last < first * 0.98) tint = "bg-positive/10";
    else if (last > first * 1.02) tint = "bg-negative/10";
    else tint = "bg-ink-faint/15";
  }
  if (v.length < 2) {
    return <div style={{ width: w, height: h }} className={`rounded-sm shrink-0 ${tint}`} aria-hidden />;
  }
  const min = Math.min(...v);
  const max = Math.max(...v);
  const pad = 2;
  const pts = v.map((val, i) => {
    const x = (i / Math.max(1, v.length - 1)) * (w - pad * 2) + pad;
    const y = max === min ? h / 2 : h - pad - ((val - min) / (max - min)) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <div className={`rounded-sm shrink-0 ${tint} flex items-center justify-center`} style={{ width: w, height: h }} aria-hidden>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="1.75" strokeOpacity={0.75} points={pts.join(" ")} />
      </svg>
    </div>
  );
}
