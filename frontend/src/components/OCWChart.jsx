import { useRef, useState } from "react";

// Horizontal OCW chart: one column per charge. Click to mark vertical point of
// impact for that charge. Pending marker can be confirmed or deleted before saving.
export default function OCWChart({ charges, values, onChange, recommended = [] }) {
  const W = 860, H = 300, PAD = 50, CENTER = H / 2, RANGE_MM = 40;
  const svgRef = useRef(null);
  const [pending, setPending] = useState(null); // { charge, y(px), mm }

  if (!charges || charges.length === 0) return null;

  const xFor = (i) => PAD + (i / Math.max(charges.length - 1, 1)) * (W - 2 * PAD);
  const nearestIndex = (px) => {
    let best = 0, bestD = Infinity;
    charges.forEach((c, i) => { const d = Math.abs(xFor(i) - px); if (d < bestD) { bestD = d; best = i; } });
    return best;
  };
  const pxToMm = (py) => Math.round(((CENTER - py) / (H / 2 - 20)) * RANGE_MM * 10) / 10;
  const mmToPx = (mm) => CENTER - (mm / RANGE_MM) * (H / 2 - 20);

  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const idx = nearestIndex(px);
    setPending({ idx, charge: charges[idx], y: py, mm: pxToMm(py) });
  };

  const confirm = () => { if (pending) { onChange(pending.charge, pending.mm); setPending(null); } };
  const clearPending = () => setPending(null);

  return (
    <div data-testid="ocw-chart">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm cursor-crosshair" style={{ background: "#0A1526", border: "1px solid #1A2E50" }} onClick={handleClick}>
        {/* grid */}
        {[-30, -20, -10, 0, 10, 20, 30].map((mm) => (
          <g key={mm}>
            <line x1={PAD} x2={W - PAD} y1={mmToPx(mm)} y2={mmToPx(mm)} stroke={mm === 0 ? "#D4AF37" : "#1A2E50"} strokeWidth={mm === 0 ? 1.5 : 1} />
            <text x={10} y={mmToPx(mm) + 4} fill="#94A3B8" fontSize="11" fontFamily="monospace">{mm > 0 ? `+${mm}` : mm}</text>
          </g>
        ))}
        {/* recommended band */}
        {charges.map((c, i) => (
          <g key={c}>
            <line x1={xFor(i)} x2={xFor(i)} y1={20} y2={H - 24} stroke={recommended.includes(c) ? "rgba(74,222,128,0.25)" : "#112240"} strokeWidth={recommended.includes(c) ? 10 : 1} />
            <text x={xFor(i)} y={H - 8} fill="#94A3B8" fontSize="10" fontFamily="monospace" textAnchor="middle">{c.toFixed(2)}</text>
          </g>
        ))}
        {/* confirmed markers + connecting line */}
        <polyline
          fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="3 3"
          points={charges.map((c, i) => (values[c] != null ? `${xFor(i)},${mmToPx(values[c])}` : null)).filter(Boolean).join(" ")}
        />
        {charges.map((c, i) => values[c] != null && (
          <circle key={c} cx={xFor(i)} cy={mmToPx(values[c])} r="6" fill="#D4AF37" stroke="#0A1526" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 4px #D4AF37)" }} />
        ))}
        {/* pending marker */}
        {pending && (
          <circle cx={xFor(pending.idx)} cy={pending.y} r="7" fill="none" stroke="#38BDF8" strokeWidth="2" />
        )}
      </svg>

      {pending && (
        <div className="flex items-center gap-3 mt-3" data-testid="ocw-pending-toolbar">
          <span className="font-mono-data text-sm" style={{ color: "#38BDF8" }}>
            Carga {pending.charge.toFixed(2)} gr → impacto {pending.mm > 0 ? `+${pending.mm}` : pending.mm} mm
          </span>
          <button className="fc-btn" data-testid="ocw-confirm-btn" onClick={confirm}>Confirmar</button>
          <button className="fc-btn-outline" data-testid="ocw-clear-btn" onClick={clearPending}>Borrar</button>
        </div>
      )}
      <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
        Haz click sobre la columna de la carga para marcar la zona de impacto. Puedes borrar antes de confirmar.
      </p>
    </div>
  );
}
