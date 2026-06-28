import { useRef, useState, useEffect } from "react";

// OCW chart. Top = 2D target showing ONLY the selected charge's shots (editing
// surface, up to 3 free shots: left/right + up/down). Bottom = horizontal
// overview of ALL charges as they are added. Shots can be deleted on error.
export default function OCWChart({ charges, values, onChange, recommended = [] }) {
  const W = 860, H = 360, PAD = 46, CX = W / 2, CY = H / 2, RANGE_X = 50, RANGE_Y = 50;
  const svgRef = useRef(null);
  const [active, setActive] = useState(charges[0]);
  const [pending, setPending] = useState(null);

  useEffect(() => { if (!charges.includes(active)) setActive(charges[0]); }, [charges, active]);
  if (!charges || charges.length === 0) return null;

  const colorFor = (i) => `hsl(${Math.round((i / Math.max(charges.length, 1)) * 280)}, 75%, 62%)`;
  const norm = (arr) => (arr || []).map((p) => (typeof p === "number" ? { x: 0, y: p } : p)).filter((p) => p && p.x != null && p.y != null);
  const getArr = (c) => norm(values[c]);
  const centroid = (arr) => (arr.length ? { x: arr.reduce((a, b) => a + b.x, 0) / arr.length, y: arr.reduce((a, b) => a + b.y, 0) / arr.length } : null);

  // ---- top 2D target ----
  const xToPx = (xmm) => CX + (xmm / RANGE_X) * (W / 2 - PAD);
  const yToPx = (ymm) => CY - (ymm / RANGE_Y) * (H / 2 - PAD);
  const pxToXmm = (px) => Math.round(((px - CX) / (W / 2 - PAD)) * RANGE_X * 10) / 10;
  const pxToYmm = (py) => Math.round(((CY - py) / (H / 2 - PAD)) * RANGE_Y * 10) / 10;

  const handleClick = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    const arr = getArr(active);
    let removeAt = -1;
    arr.forEach((p, k) => { if (Math.abs(xToPx(p.x) - px) < 10 && Math.abs(yToPx(p.y) - py) < 10) removeAt = k; });
    if (removeAt >= 0) { const na = [...arr]; na.splice(removeAt, 1); onChange(active, na); setPending(null); return; }
    if (arr.length >= 3) { setPending({ px, py, full: true }); return; }
    setPending({ px, py, xmm: pxToXmm(px), ymm: pxToYmm(py), full: false });
  };
  const confirm = () => {
    if (pending && !pending.full) { onChange(active, [...getArr(active), { x: pending.xmm, y: pending.ymm }]); setPending(null); }
  };
  const removeLast = () => { const arr = getArr(active); if (arr.length) onChange(active, arr.slice(0, -1)); setPending(null); };
  const clearActive = () => { onChange(active, []); setPending(null); };

  const activeIdx = charges.indexOf(active);
  const activeArr = getArr(active);
  const activeCe = centroid(activeArr);
  const activeColor = colorFor(activeIdx);

  // ---- bottom horizontal overview ----
  const BW = 860, BH = 240, BPAD = 46, BCY = BH / 2;
  const colW = (BW - 2 * BPAD) / Math.max(charges.length, 1);
  const half = colW * 0.4;
  const bxFor = (i) => BPAD + colW * (i + 0.5);
  const byTo = (ymm) => BCY - (ymm / RANGE_Y) * (BH / 2 - 26);
  const bxOff = (xmm) => (xmm / RANGE_X) * half;

  return (
    <div data-testid="ocw-chart">
      {/* charge selector */}
      <div className="flex flex-wrap gap-2 mb-3" data-testid="ocw-charge-selector">
        {charges.map((c, i) => {
          const cnt = getArr(c).length, isA = c === active;
          return (
            <button key={c} data-testid={`ocw-charge-${c}`} onClick={() => { setActive(c); setPending(null); }}
              className="text-xs font-mono-data px-2 py-1 rounded-sm transition-colors"
              style={{ border: `1px solid ${colorFor(i)}`, background: isA ? colorFor(i) : "transparent", color: isA ? "#0A1526" : colorFor(i), fontWeight: isA ? 700 : 500 }}>
              {c.toFixed(2)} ({cnt}/3)
            </button>
          );
        })}
      </div>

      {/* TOP: active charge only */}
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#94A3B8" }}>
        Diana · carga <b style={{ color: activeColor }}>{Number(active).toFixed(2)} gr</b>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-sm cursor-crosshair" style={{ background: "#0A1526", border: "1px solid #1A2E50" }} onClick={handleClick}>
        {[-40, -30, -20, -10, 10, 20, 30, 40].map((mm) => (
          <line key={`gx${mm}`} x1={xToPx(mm)} x2={xToPx(mm)} y1={PAD / 2} y2={H - PAD / 2} stroke="#152a4d" strokeWidth="1" />
        ))}
        {[-40, -30, -20, -10, 10, 20, 30, 40].map((mm) => (
          <line key={`gy${mm}`} x1={PAD / 2} x2={W - PAD / 2} y1={yToPx(mm)} y2={yToPx(mm)} stroke="#152a4d" strokeWidth="1" />
        ))}
        <line x1={CX} x2={CX} y1={PAD / 2} y2={H - PAD / 2} stroke="#D4AF37" strokeWidth="1.3" />
        <line x1={PAD / 2} x2={W - PAD / 2} y1={CY} y2={CY} stroke="#D4AF37" strokeWidth="1.3" />
        <circle cx={CX} cy={CY} r="3" fill="#D4AF37" />
        {activeArr.map((p, k) => (
          <circle key={k} cx={xToPx(p.x)} cy={yToPx(p.y)} r="5" fill={activeColor} stroke="#0A1526" strokeWidth="1" />
        ))}
        {activeCe && <circle cx={xToPx(activeCe.x)} cy={yToPx(activeCe.y)} r="9" fill="none" stroke="#4ADE80" strokeWidth="1.5" />}
        {pending && <circle cx={pending.px} cy={pending.py} r="6" fill="none" stroke="#38BDF8" strokeWidth="2" />}
      </svg>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 mt-3 min-h-[40px]" data-testid="ocw-toolbar">
        {pending && pending.full && (
          <span className="font-mono-data text-sm" style={{ color: "#F87171" }}>Esta carga ya tiene 3 disparos. Click sobre un punto para borrarlo.</span>
        )}
        {pending && !pending.full && (
          <>
            <span className="font-mono-data text-sm" style={{ color: "#38BDF8" }}>
              X {pending.xmm > 0 ? `+${pending.xmm}` : pending.xmm} mm · Y {pending.ymm > 0 ? `+${pending.ymm}` : pending.ymm} mm
            </span>
            <button className="fc-btn" data-testid="ocw-confirm-btn" onClick={confirm}>Confirmar</button>
          </>
        )}
        {pending && <button className="fc-btn-outline" data-testid="ocw-clear-btn" onClick={() => setPending(null)}>Cancelar</button>}
        <button className="fc-btn-outline" data-testid="ocw-remove-last-btn" onClick={removeLast} disabled={!activeArr.length}>Borrar último</button>
        <button className="fc-btn-outline" data-testid="ocw-clear-active-btn" onClick={clearActive} disabled={!activeArr.length}>Borrar carga</button>
      </div>

      {/* BOTTOM: horizontal overview of all charges */}
      <div className="text-xs uppercase tracking-wider mt-5 mb-1" style={{ color: "#94A3B8" }}>Vista general · todas las cargas</div>
      <svg viewBox={`0 0 ${BW} ${BH}`} className="w-full rounded-sm" style={{ background: "#0A1526", border: "1px solid #1A2E50" }} data-testid="ocw-overview">
        {[-40, -20, 20, 40].map((mm) => (
          <line key={`oy${mm}`} x1={BPAD / 2} x2={BW - BPAD / 2} y1={byTo(mm)} y2={byTo(mm)} stroke="#152a4d" strokeWidth="1" />
        ))}
        <line x1={BPAD / 2} x2={BW - BPAD / 2} y1={BCY} y2={BCY} stroke="#D4AF37" strokeWidth="1.2" />
        <text x={6} y={byTo(40) + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace">+alto</text>
        <text x={6} y={byTo(-40) + 3} fill="#94A3B8" fontSize="9" fontFamily="monospace">-bajo</text>
        {charges.map((c, i) => {
          const arr = getArr(c), ce = centroid(arr), col = colorFor(i), isRec = recommended.includes(c), bx = bxFor(i);
          return (
            <g key={`o-${c}`}>
              <line x1={bx} x2={bx} y1={20} y2={BH - 22} stroke={isRec ? "rgba(74,222,128,0.18)" : "#0e1d38"} strokeWidth={isRec ? colW * 0.8 : 1} />
              {arr.map((p, k) => (
                <circle key={k} cx={bx + bxOff(p.x)} cy={byTo(p.y)} r="3.5" fill={col} stroke="#0A1526" strokeWidth="0.8" />
              ))}
              {ce && <circle cx={bx + bxOff(ce.x)} cy={byTo(ce.y)} r="6" fill="none" stroke={isRec ? "#4ADE80" : col} strokeWidth={isRec ? 2.2 : 1.4} />}
              <text x={bx} y={BH - 8} fill={c === active ? col : "#94A3B8"} fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight={c === active ? 700 : 400}>{c.toFixed(2)}</text>
            </g>
          );
        })}
      </svg>

      <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
        Arriba marcas los 3 disparos de la <b>carga seleccionada</b> (libre en X e Y; centro = punto de mira). Abajo ves <b>todas las cargas</b> según las añades. Click sobre un punto, "Borrar último" o "Borrar carga" para corregir errores.
      </p>
    </div>
  );
}
