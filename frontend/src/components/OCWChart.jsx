import { useRef, useState } from "react";

// OCW chart: one column per charge, registering up to 3 shots per group.
// Click an empty spot to add a shot (confirm/cancel before saving).
// Click on an existing shot marker to remove it.
export default function OCWChart({ charges, values, onChange, recommended = [] }) {
  const W = 860, H = 300, PAD = 50, CENTER = H / 2, RANGE_MM = 40;
  const svgRef = useRef(null);
  const [pending, setPending] = useState(null); // { idx, charge, y(px), mm, full }

  if (!charges || charges.length === 0) return null;

  const getArr = (c) => {
    const v = values[c];
    if (Array.isArray(v)) return v;
    if (v != null && v !== "") return [v];
    return [];
  };

  const xFor = (i) => PAD + (i / Math.max(charges.length - 1, 1)) * (W - 2 * PAD);
  const nearestIndex = (px) => {
    let best = 0, bestD = Infinity;
    charges.forEach((c, i) => { const d = Math.abs(xFor(i) - px); if (d < bestD) { bestD = d; best = i; } });
    return best;
  };
  const pxToMm = (py) => Math.round(((CENTER - py) / (H / 2 - 20)) * RANGE_MM * 10) / 10;
  const mmToPx = (mm) => CENTER - (mm / RANGE_MM) * (H / 2 - 20);
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + Number(b), 0) / arr.length : null);

  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const idx = nearestIndex(px);
    const charge = charges[idx];
    const arr = getArr(charge);
    const colX = xFor(idx);

    // Remove a shot if the click landed on an existing marker.
    let removeAt = -1;
    arr.forEach((mm, k) => {
      if (Math.abs(colX - px) < 26 && Math.abs(mmToPx(mm) - py) < 9) removeAt = k;
    });
    if (removeAt >= 0) {
      const na = [...arr];
      na.splice(removeAt, 1);
      onChange(charge, na);
      setPending(null);
      return;
    }

    if (arr.length >= 3) { setPending({ idx, charge, y: py, mm: pxToMm(py), full: true }); return; }
    setPending({ idx, charge, y: py, mm: pxToMm(py), full: false });
  };

  const confirm = () => {
    if (pending && !pending.full) {
      const arr = getArr(pending.charge);
      onChange(pending.charge, [...arr, pending.mm]);
      setPending(null);
    }
  };
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
        {/* columns + recommended band + shot count */}
        {charges.map((c, i) => {
          const arr = getArr(c);
          return (
            <g key={c}>
              <line x1={xFor(i)} x2={xFor(i)} y1={20} y2={H - 24} stroke={recommended.includes(c) ? "rgba(74,222,128,0.25)" : "#112240"} strokeWidth={recommended.includes(c) ? 10 : 1} />
              <text x={xFor(i)} y={16} fill={arr.length === 3 ? "#4ADE80" : "#94A3B8"} fontSize="9" fontFamily="monospace" textAnchor="middle">{arr.length}/3</text>
              <text x={xFor(i)} y={H - 8} fill="#94A3B8" fontSize="10" fontFamily="monospace" textAnchor="middle">{c.toFixed(2)}</text>
            </g>
          );
        })}
        {/* group-mean connecting line */}
        <polyline
          fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeDasharray="3 3"
          points={charges.map((c, i) => { const m = mean(getArr(c)); return m != null ? `${xFor(i)},${mmToPx(m)}` : null; }).filter(Boolean).join(" ")}
        />
        {/* individual shots + group mean ring */}
        {charges.map((c, i) => {
          const arr = getArr(c);
          const m = mean(arr);
          return (
            <g key={`s-${c}`}>
              {arr.map((mm, k) => (
                <circle key={k} cx={xFor(i)} cy={mmToPx(mm)} r="4" fill="#D4AF37" stroke="#0A1526" strokeWidth="1" style={{ filter: "drop-shadow(0 0 3px #D4AF37)" }} />
              ))}
              {m != null && <circle cx={xFor(i)} cy={mmToPx(m)} r="8" fill="none" stroke="#4ADE80" strokeWidth="1.5" opacity="0.8" />}
            </g>
          );
        })}
        {/* pending marker */}
        {pending && <circle cx={xFor(pending.idx)} cy={pending.y} r="6" fill="none" stroke="#38BDF8" strokeWidth="2" />}
      </svg>

      {pending && (
        <div className="flex items-center gap-3 mt-3" data-testid="ocw-pending-toolbar">
          {pending.full ? (
            <span className="font-mono-data text-sm" style={{ color: "#F87171" }}>
              Carga {pending.charge.toFixed(2)} gr ya tiene 3 disparos. Haz click sobre un punto para borrarlo.
            </span>
          ) : (
            <>
              <span className="font-mono-data text-sm" style={{ color: "#38BDF8" }}>
                Disparo en carga {pending.charge.toFixed(2)} gr → {pending.mm > 0 ? `+${pending.mm}` : pending.mm} mm
              </span>
              <button className="fc-btn" data-testid="ocw-confirm-btn" onClick={confirm}>Confirmar</button>
            </>
          )}
          <button className="fc-btn-outline" data-testid="ocw-clear-btn" onClick={clearPending}>Cancelar</button>
        </div>
      )}
      <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
        Marca los <b>3 disparos</b> de cada carga (anillo verde = centro del grupo). Click sobre un punto para borrarlo; puedes cancelar antes de confirmar.
      </p>
    </div>
  );
}
