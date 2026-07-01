import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame, ListOrdered, Sparkles, Target, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";
import { gr, num } from "../lib/format";
import { Section, Field, AtmoData } from "../components/Bits";
import OCWChart from "../components/OCWChart";

const stats = (vels) => {
  const v = vels.map(num).filter((x) => x != null);
  if (v.length === 0) return { es: null, sd: null, avg: null };
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  const es = Math.max(...v) - Math.min(...v);
  let sd = null;
  if (v.length >= 2) {
    const variance = v.reduce((a, b) => a + (b - avg) ** 2, 0) / (v.length - 1);
    sd = Math.sqrt(variance);
  }
  return { es: Math.round(es * 10) / 10, sd: sd != null ? Math.round(sd * 10) / 10 : null, avg: Math.round(avg * 10) / 10 };
};

export default function Phase2({ project, saveData }) {
  const d = project.data || {};
  const [jump, setJump] = useState(d.load?.jump ?? "0.020");
  const [powder, setPowder] = useState(d.load?.powder || { bullet_brand: "", bullet_weight: "", powder_brand: "", powder_model: "", powder_lot: "" });
  const [powderRes, setPowderRes] = useState(d.load?.powderRes || null);
  const [loadingPowder, setLoadingPowder] = useState(false);

  const [start, setStart] = useState(d.load?.start ?? "");
  const [end, setEnd] = useState(d.load?.end ?? "");
  const [step, setStep] = useState(d.load?.step ?? "0.3");
  const [charges, setCharges] = useState(d.load?.charges || []);
  const [vels, setVels] = useState(d.load?.vels || {}); // charge -> [v1,v2,v3]

  const [ocwEnabled, setOcwEnabled] = useState(d.load?.ocwEnabled || false);
  const [ocw, setOcw] = useState(d.load?.ocw || {}); // charge -> mm
  const [mode, setMode] = useState(d.load?.mode || "both");
  const [rec, setRec] = useState(d.load?.rec || null);
  const [atmo, setAtmo] = useState(d.load?.atmo || {});
  const [groupSizes, setGroupSizes] = useState(d.load?.groupSizes || {});

  useEffect(() => {
    const nd = project.data || {};
    setJump(nd.load?.jump ?? "0.020");
    setPowder(nd.load?.powder || { bullet_brand: "", bullet_weight: "", powder_brand: "", powder_model: "", powder_lot: "" });
    setPowderRes(nd.load?.powderRes || null);
    setStart(nd.load?.start ?? "");
    setEnd(nd.load?.end ?? "");
    setStep(nd.load?.step ?? "0.3");
    setCharges(nd.load?.charges || []);
    setVels(nd.load?.vels || {});
    setOcwEnabled(nd.load?.ocwEnabled || false);
    setOcw(nd.load?.ocw || {});
    setMode(nd.load?.mode || "both");
    setRec(nd.load?.rec || null);
    setAtmo(nd.load?.atmo || {});
    setGroupSizes(nd.load?.groupSizes || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const persist = (patch) => saveData({ load: { ...d.load, jump, powder, powderRes, start, end, step, charges, vels, ocwEnabled, ocw, mode, rec, atmo, groupSizes, ...patch } });

  const updatePowder = (field, v) => { const np = { ...powder, [field]: v }; setPowder(np); persist({ powder: np }); };

  const fetchPowder = async () => {
    if (!powder.powder_brand || !powder.powder_model || !powder.bullet_weight) { toast.error("Completa los datos de punta y pólvora"); return; }
    setLoadingPowder(true);
    try {
      const res = await api.powderData({ caliber: project.caliber, ...powder });
      setPowderRes(res);
      if (!end) setEnd(String(res.max_plus_10));
      persist({ powderRes: res, end: end || String(res.max_plus_10) });
      toast.success("Datos de pólvora generados");
    } catch (e) {
      toast.error("No se pudieron obtener los datos del fabricante. Revisa la conexión o introduce la carga mínima y máxima manualmente.");
    } finally {
      setLoadingPowder(false);
    }
  };

  const setPowderField = (field, val) => {
    const next = { ...(powderRes || { min_grains: "", max_grains: "", notes: "" }), [field]: val };
    const mx = num(next.max_grains);
    next.max_plus_10 = mx != null ? Math.round(mx * 1.1 * 100) / 100 : null;
    setPowderRes(next);
    persist({ powderRes: next });
  };

  const genLadder = async () => {
    const s = num(start), e = num(end);
    const st = num(step);
    if (s == null || e == null) { toast.error("Indica carga inicial y final"); return; }
    if (st == null || st <= 0) { toast.error("Indica un diferencial válido"); return; }
    const res = await api.chargeLadder({ start: s, end: e, step: st });
    setCharges(res.charges);
    const nv = { ...vels };
    res.charges.forEach((c) => { if (!nv[c]) nv[c] = ["", "", ""]; });
    setVels(nv);
    persist({ charges: res.charges, vels: nv });
    toast.success(`${res.charges.length} cargas generadas`);
  };

  const setVel = (charge, idx, val) => {
    const arr = [...(vels[charge] || ["", "", ""])];
    arr[idx] = val;
    const nv = { ...vels, [charge]: arr };
    setVels(nv);
    persist({ vels: nv });
  };

  const setGroupSize = (charge, val) => {
    const ng = { ...groupSizes, [charge]: val };
    setGroupSizes(ng);
    persist({ groupSizes: ng });
  };

  const recommend = async () => {
    const norm = (arr) => (arr || []).map((p) => (typeof p === "number" ? { x: 0, y: p } : p)).filter((p) => p && p.x != null && p.y != null);
    const centroid = (arr) => (arr.length ? { x: arr.reduce((a, b) => a + b.x, 0) / arr.length, y: arr.reduce((a, b) => a + b.y, 0) / arr.length } : null);
    const entries = charges.map((c) => {
      const st = stats(vels[c] || []);
      const ce = ocwEnabled ? centroid(norm(ocw[c])) : null;
      const g = ocwEnabled ? num(groupSizes[c]) : null;
      return { charge: c, es: st.es, sd: st.sd, ocw_x: ce ? ce.x : null, ocw_y: ce ? ce.y : null, ocw_group: g };
    });
    const res = await api.recommend({ mode, entries });
    setRec(res);
    persist({ rec: res, mode });
  };

  return (
    <div>
      <Section title="Salto inicial punta → estría" subtitle="Salto inicial de pruebas (típico 0.020&quot;). Se guarda para futuras sesiones." testId="jump-section">
        <div className="flex items-end gap-3 max-w-md">
          <Field label='Salto inicial (")' testId="jump-input" value={jump} onChange={(v) => { setJump(v); }} placeholder="0.020" />
          <button className="fc-btn" data-testid="save-jump-btn" onClick={() => { persist({ jump }); toast.success("Salto guardado"); }}>Guardar</button>
        </div>
      </Section>

      <Section title="Datos de carga (pólvora)" subtitle="La app genera carga mínima/máxima según punta y pólvora. Máximo +10% solo bajo tu responsabilidad." testId="powder-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Field label="Marca punta" testId="bullet-brand" value={powder.bullet_brand} onChange={(v) => updatePowder("bullet_brand", v)} placeholder="Berger" />
          <Field label="Peso punta" testId="bullet-weight" value={powder.bullet_weight} onChange={(v) => updatePowder("bullet_weight", v)} placeholder="200gr" />
          <Field label="Marca pólvora" testId="powder-brand" value={powder.powder_brand} onChange={(v) => updatePowder("powder_brand", v)} placeholder="Hodgdon" />
          <Field label="Modelo pólvora" testId="powder-model" value={powder.powder_model} onChange={(v) => updatePowder("powder_model", v)} placeholder="H4350" />
          <Field label="Lote de la pólvora" testId="powder-lot" value={powder.powder_lot} onChange={(v) => updatePowder("powder_lot", v)} placeholder="Nº de lote" />
        </div>
        <button className="fc-btn flex items-center gap-2" data-testid="fetch-powder-btn" onClick={fetchPowder} disabled={loadingPowder}>
          <Flame size={16} /> {loadingPowder ? "Generando..." : "Generar datos con IA (online)"}
        </button>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end" data-testid="powder-result">
          <Field label="Carga mínima (gr)" testId="powder-min" value={powderRes?.min_grains ?? ""} onChange={(v) => setPowderField("min_grains", v)} placeholder="42.0" />
          <Field label="Carga máxima (gr)" testId="powder-max" value={powderRes?.max_grains ?? ""} onChange={(v) => setPowderField("max_grains", v)} placeholder="44.0" />
          <div className="p-3 rounded-sm" style={{ background: "#1A2E50" }}>
            <p className="fc-label">Máxima +10%</p>
            <p className="text-lg" style={{ color: "#F87171", fontFamily: "monospace", fontWeight: 700 }}>{powderRes?.max_plus_10 != null ? gr(powderRes.max_plus_10) : "—"}</p>
          </div>
          <p className="text-xs sm:col-span-1" style={{ color: "#94A3B8" }}>
            Puedes generarlas con IA (requiere internet) o introducirlas a mano desde tu manual para trabajar offline.
          </p>
        </div>
        {powderRes?.notes && <p className="mt-2 text-xs" style={{ color: "#FBBF24" }}>⚠ {powderRes.notes}</p>}
      </Section>

      <Section title="Escalera de carga" subtitle="Genera la escalera con el diferencial que elijas (por defecto 0.3 gr). Tres disparos por carga; la app calcula ES y SD del grupo." testId="ladder-section">
        <AtmoData value={atmo} onChange={(a) => { setAtmo(a); persist({ atmo: a }); }} testId="ladder-atmo" />
        <div className="flex flex-wrap items-end gap-3 mb-5">
          <Field label="Carga inicial (gr)" testId="ladder-start" value={start} onChange={setStart} placeholder="42.00" />
          <Field label="Carga final (gr)" testId="ladder-end" value={end} onChange={setEnd} placeholder="44.40" />
          <Field label="Diferencial (gr)" testId="ladder-step" value={step} onChange={(v) => { setStep(v); persist({ step: v }); }} placeholder="0.3" />
          <button className="fc-btn flex items-center gap-2" data-testid="gen-ladder-btn" onClick={genLadder}><ListOrdered size={16} /> Generar escalera</button>
        </div>

        <p className="flex items-start gap-2 text-xs mb-5" style={{ color: "#F87171" }} data-testid="ladder-overpressure-warning">
          <AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Vigila los signos de sobrepresión en cada disparo (culote aplanado, cráter en el pistón, extracción dura, expulsión del pistón). <b>Bajo su responsabilidad.</b></span>
        </p>

        {charges.length > 0 && (
          <div className="overflow-auto">
            <table className="fc-table">
              <thead>
                <tr><th>Carga (gr)</th><th>Disparo 1</th><th>Disparo 2</th><th>Disparo 3</th><th>ES (m/s)</th><th>SD (m/s)</th><th>Grupo c-c (mm)</th></tr>
              </thead>
              <tbody>
                {charges.map((c) => {
                  const st = stats(vels[c] || []);
                  return (
                    <tr key={c} data-testid={`ladder-row-${c}`}>
                      <td style={{ color: "#D4AF37" }}>{c.toFixed(2)}</td>
                      {[0, 1, 2].map((i) => (
                        <td key={i}><input className="fc-input" data-testid={`vel-${c}-${i}`} value={(vels[c] || [])[i] ?? ""} onChange={(e) => setVel(c, i, e.target.value)} placeholder="m/s" /></td>
                      ))}
                      <td className="fc-result">{st.es ?? "—"}</td>
                      <td className="fc-result">{st.sd ?? "—"}</td>
                      <td><input className="fc-input" style={{ minWidth: 90 }} data-testid={`group-cc-${c}`} value={groupSizes[c] ?? ""} onChange={(e) => setGroupSize(c, e.target.value)} placeholder="mm c-c" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {charges.length > 0 && (
        <Section title="Método OCW (opcional)" subtitle="Marca la zona de impacto de cada carga para localizar el nodo más estable." testId="ocw-section">
          <label className="flex items-center gap-2 mb-4 cursor-pointer" style={{ color: "#E2E8F0" }}>
            <input type="checkbox" data-testid="ocw-toggle" checked={ocwEnabled} onChange={(e) => { setOcwEnabled(e.target.checked); persist({ ocwEnabled: e.target.checked }); }} />
            <span className="text-sm">Realizo prueba por método OCW</span>
          </label>
          {ocwEnabled && (
            <OCWChart
              charges={charges}
              values={ocw}
              recommended={rec?.recommended_charges || []}
              onChange={(charge, mm) => { const no = { ...ocw, [charge]: mm }; setOcw(no); persist({ ocw: no }); }}
            />
          )}
        </Section>
      )}

      {charges.length > 0 && (
        <Section title="Carga recomendada" subtitle="Elige el criterio para que la app decida la mejor carga." testId="recommend-section">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="fc-label">Criterio</label>
              <select className="fc-input" data-testid="rec-mode" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="velocity">Velocidad (ES + SD)</option>
                <option value="ocw">OCW (impactos)</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <button className="fc-btn flex items-center gap-2" data-testid="recommend-btn" onClick={recommend}><Sparkles size={16} /> Recomendar carga</button>
          </div>
          {rec && (
            <div className="p-5 rounded-sm" style={{ background: "#1A2E50" }} data-testid="recommend-result">
              <div className="flex items-center gap-2 mb-2"><Target size={18} color="#4ADE80" /><span className="fc-subtitle font-bold">Mejor(es) carga(s)</span></div>
              {rec.recommended_charges.length ? (
                <p className="font-mono-data text-2xl fc-good">{rec.recommended_charges.map((c) => c.toFixed(2)).join("  ·  ")} gr</p>
              ) : (
                <p style={{ color: "#94A3B8" }}>Datos insuficientes para recomendar.</p>
              )}
              <p className="text-sm mt-2" style={{ color: "#94A3B8" }}>{rec.explanation}</p>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
