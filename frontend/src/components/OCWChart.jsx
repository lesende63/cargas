import { useRef, useState, useEffect } from "react";

// OCW 2D target chart. Each charge group holds up to 3 shots placed freely
// (left/right + up/down) relative to the point of aim (center). Select the
// active charge, then click anywhere to place its shots. Click a shot to remove it.
export default function OCWChart({ charges, values, onChange, recommended = [] }) {
  const W = 860, H = 380, PAD = 46, CX = W / 2, CY = H / 2, RANGE_X = 50, RANGE_Y = 50;
  const svgRef = useRef(null);
  const [active, setActive] = useState(charges[0]);
  const [pending, setPending] = useState(null); // { xmm, ymm, px, py, full }

  useEffect(() => {
    if (!charges.includes(active)) setActive(charges[0]);
  }, [charges, active]);

  if (!charges || charges.length === 0) return null;

  const colorFor = (i) => `hsl(${Math.round((i / Math.max(charges.length, 1)) * 280)}, 75%, 62%)`;
  const norm = (arr) => (arr || []).map((p) => (typeof p === "number" ? { x: 0, y: p } : p)).filter((p) => p && p.x != null && p.y != null);
  const getArr = (c) => norm(values[c]);

  const xToPx = (xmm) => CX + (xmm / RANGE_X) * (W / 2 - PAD);
  const yToPx = (ymm) => CY - (ymm / RANGE_Y) * (H / 2 - PAD);
  const pxToXmm = (px) => Math.round(((px - CX) / (W / 2 - PAD)) * RANGE_X * 10) / 10;
  const pxToYmm = (py) => Math.round(((CY - py) / (H / 2 - PAD)) * RANGE_Y * 10) / 10;
  const centroid = (arr) => (arr.length ? { x: arr.reduce((a, b) => a + b.x, 0) / arr.length, y: arr.reduce((a, b) => a + b.y, 0) / arr.length } : null);

  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const arr = getArr(active);

    // remove a shot of the active charge if clicked on it
    let removeAt = -1;
    arr.forEach((p, k) => {
      if (Math.abs(xToPx(p.x) - px) < 9 && Math.abs(yToPx(p.y) - py) < 9) removeAt = k;
    });
    if (removeAt >= 0) {
      const na = [...arr];
      na.splice(removeAt, 1);
      onChange(active, na);
      setPending(null);
      return;
    }

    if (arr.length >= 3) { setPending({ px, py, full: true }); return; }
    setPending({ px, py, xmm: pxToXmm(px), ymm: pxToYmm(py), full: false });
  };

  const confirm = () => {
    if (pending && !pending.full) {
      const arr = getArr(active);
      onChange(active, [...arr, { x: pending.xmm, y: pending.ymm }]);
      setPending(null);
    }
  };

  const activeIdx = charges.indexOf(active);

  return (
    <div data-testid="ocw-chart">
      {/* charge selector */}
      <div className="flex flex-wrap gap-2 mb-3" data-testid="ocw-charge-selector">
        {charges.map((c, i) => {
          const cnt = getArr(c).length;
          const isActive = c === active;
          return (
            <button
              key={c}
              data-testid={`ocw-charge-${c}`}
              onClick={() => { setActive(c); setPending(null); }}
              className="text-xs font-mono-data px-2 py-1 rounded-sm transition-colors"
              style={{
                border: `1px solid ${colorFor(i)}`,
                background: isActive ? colorFor(i) : "transparent",
                color: isActive ? "#0A1526" : colorFor(i),
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {c.toFixed(2)} ({cnt}/3)
            </button>
          );
        })}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm cursor-crosshair" style={{ background: "#0A1526", border: "1px solid #1A2E50" }} onClick={handleClick}>
        {/* grid */}
        {[-40, -30, -20, -10, 10, 20, 30, 40].map((mm) => (
          <line key={`gx${mm}`} x1={xToPx(mm)} x2={xToPx(mm)} y1={PAD / 2} y2={H - PAD / 2} stroke="#152a4d" strokeWidth="1" />
        ))}
        {[-40, -30, -20, -10, 10, 20, 30, 40].map((mm) => (
          <line key={`gy${mm}`} x1={PAD / 2} x2={W - PAD / 2} y1={yToPx(mm)} y2={yToPx(mm)} stroke="#152a4d" strokeWidth="1" />
        ))}
        {/* center crosshair */}
        <line x1={CX} x2={CX} y1={PAD / 2} y2={H - PAD / 2} stroke="#D4AF37" strokeWidth="1.3" />
        <line x1={PAD / 2} x2={W - PAD / 2} y1={CY} y2={CY} stroke="#D4AF37" strokeWidth="1.3" />
        <circle cx={CX} cy={CY} r="3" fill="#D4AF37" />
        <text x={W - PAD / 2 + 2} y={CY - 4} fill="#94A3B8" fontSize="10" fontFamily="monospace">mm</text>
        <text x={CX + 4} y={PAD / 2 + 8} fill="#94A3B8" fontSize="10" fontFamily="monospace">+alto</text>

        {/* centroid walk line (charge order) */}
        <polyline
          fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
          points={charges.map((c) => { const ce = centroid(getArr(c)); return ce ? `${xToPx(ce.x)},${yToPx(ce.y)}` : null; }).filter(Boolean).join(" ")}
        />

        {/* shots per charge */}
        {charges.map((c, i) => {
          const arr = getArr(c);
          const ce = centroid(arr);
          const col = colorFor(i);
          const isRec = recommended.includes(c);
          return (
            <g key={`s-${c}`} opacity={c === active || arr.length ? 1 : 0.5}>
              {arr.map((p, k) => (
                <circle key={k} cx={xToPx(p.x)} cy={yToPx(p.y)} r={c === active ? 5 : 4} fill={col} stroke="#0A1526" strokeWidth="1" />
              ))}
              {ce && (
                <g>
                  <circle cx={xToPx(ce.x)} cy={yToPx(ce.y)} r="9" fill="none" stroke={isRec ? "#4ADE80" : col} strokeWidth={isRec ? 2.5 : 1.5} />
                  <text x={xToPx(ce.x) + 11} y={yToPx(ce.y) + 3} fill={isRec ? "#4ADE80" : col} fontSize="9" fontFamily="monospace">{c.toFixed(2)}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* pending shot */}
        {pending && <circle cx={pending.px} cy={pending.py} r="6" fill="none" stroke="#38BDF8" strokeWidth="2" />}
      </svg>

      <div className="flex items-center gap-3 mt-3 min-h-[40px]" data-testid="ocw-toolbar">
        {pending && pending.full && (
          <span className="font-mono-data text-sm" style={{ color: "#F87171" }}>
            La carga {Number(active).toFixed(2)} gr ya tiene 3 disparos. Click sobre un punto para borrarlo.
          </span>
        )}
        {pending && !pending.full && (
          <>
            <span className="font-mono-data text-sm" style={{ color: "#38BDF8" }}>
              Disparo carga {Number(active).toFixed(2)} gr → X {pending.xmm > 0 ? `+${pending.xmm}` : pending.xmm} mm, Y {pending.ymm > 0 ? `+${pending.ymm}` : pending.ymm} mm
            </span>
            <button className="fc-btn" data-testid="ocw-confirm-btn" onClick={confirm}>Confirmar</button>
          </>
        )}
        {pending && <button className="fc-btn-outline" data-testid="ocw-clear-btn" onClick={() => setPending(null)}>Cancelar</button>}
        {!pending && (
          <span className="text-xs" style={{ color: "#94A3B8" }}>
            Carga activa: <b style={{ color: colorFor(activeIdx) }}>{Number(active).toFixed(2)} gr</b> · {getArr(active).length}/3 disparos
          </span>
        )}
      </div>
      <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
        Selecciona la carga, luego marca cada disparo donde impacte (libre: izquierda/derecha, arriba/abajo). El centro es el punto de mira; el anillo es el centro del grupo. Click sobre un punto para borrarlo.
      </p>
    </div>
  );
}
