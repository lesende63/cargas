import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calculator, Ruler, Scale, Plus } from "lucide-react";
import { api } from "../lib/api";
import { inch, gr, num } from "../lib/format";
import { Section, Field, ResultRow } from "../components/Bits";

export default function Phase1({ project, saveData, presets }) {
  const d = project.data || {};

  // --- Bushing ---
  const [bush, setBush] = useState({
    neck_fired: d.bushing?.neck_fired ?? "",
    neck_wall_thickness: d.bushing?.neck_wall_thickness ?? "",
    bullet_diameter: d.bushing?.bullet_diameter ?? project.bullet_diameter ?? "",
    neck_tension: d.bushing?.neck_tension ?? "0.002",
  });
  const [bushRes, setBushRes] = useState(d.bushing?.result || null);

  // --- Headspace ---
  const [hs, setHs] = useState({
    datum: d.headspace?.datum ?? project.headspace_datum ?? "",
    fired_measurement: d.headspace?.fired_measurement ?? "",
  });
  const [hsRes, setHsRes] = useState(d.headspace?.result || null);

  // --- Case length ---
  const [lengths, setLengths] = useState(d.case_length?.lengths || []);
  const [lenInput, setLenInput] = useState("");

  // --- Volume ---
  const [caseCount, setCaseCount] = useState(d.volume?.count || 20);
  const [rows, setRows] = useState(d.volume?.rows || {});
  const [vGroups, setVGroups] = useState(d.volume?.groups || null);

  useEffect(() => {
    const nd = project.data || {};
    setBush({
      neck_fired: nd.bushing?.neck_fired ?? "",
      neck_wall_thickness: nd.bushing?.neck_wall_thickness ?? "",
      bullet_diameter: nd.bushing?.bullet_diameter ?? project.bullet_diameter ?? "",
      neck_tension: nd.bushing?.neck_tension ?? "0.002",
    });
    setBushRes(nd.bushing?.result || null);
    setHs({ datum: nd.headspace?.datum ?? project.headspace_datum ?? "", fired_measurement: nd.headspace?.fired_measurement ?? "" });
    setHsRes(nd.headspace?.result || null);
    setLengths(nd.case_length?.lengths || []);
    setCaseCount(nd.volume?.count || 20);
    setRows(nd.volume?.rows || {});
    setVGroups(nd.volume?.groups || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const calcBushing = async () => {
    const body = {
      neck_fired: num(bush.neck_fired),
      neck_wall_thickness: num(bush.neck_wall_thickness),
      bullet_diameter: num(bush.bullet_diameter),
      neck_tension: num(bush.neck_tension) ?? 0.002,
    };
    if (body.neck_fired == null || body.neck_wall_thickness == null || body.bullet_diameter == null) {
      toast.error("Completa todas las medidas");
      return;
    }
    const res = await api.bushing(body);
    setBushRes(res);
    saveData({ bushing: { ...bush, result: res } });
  };

  const calcHeadspace = async () => {
    const body = { fired_measurement: num(hs.fired_measurement), datum: num(hs.datum) };
    if (body.fired_measurement == null) { toast.error("Indica la medida de la vaina disparada"); return; }
    const res = await api.headspace(body);
    setHsRes(res);
    saveData({ headspace: { ...hs, result: res } });
  };

  const addLength = () => {
    const v = num(lenInput);
    if (v == null) return;
    const next = [...lengths, v];
    setLengths(next);
    setLenInput("");
    saveData({ case_length: { lengths: next } });
  };
  const trimLength = lengths.length ? Math.min(...lengths) : null;

  const setRow = (n, field, val) => {
    const next = { ...rows, [n]: { ...(rows[n] || {}), [field]: val } };
    setRows(next);
    saveData({ volume: { count: caseCount, rows: next, groups: vGroups } });
  };

  const calcVolume = async () => {
    const cases = [];
    for (let i = 1; i <= caseCount; i++) {
      const r = rows[i] || {};
      cases.push({ case_number: i, empty: num(r.empty), full: num(r.full) });
    }
    const res = await api.volumeGroups({ cases, max_spread: 0.5 });
    setVGroups(res);
    saveData({ volume: { count: caseCount, rows, groups: res } });
    toast.success(`${res.groups.length} grupo(s) generados`);
  };

  return (
    <div>
      {/* 1. BUSHING */}
      <Section title="1 · Bushing y Expander" subtitle="Determina el bushing y el expander según la tensión de cuello deseada." testId="bushing-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Field label='Cuello vaina disparada (")' testId="bush-neck-fired" value={bush.neck_fired} onChange={(v) => setBush({ ...bush, neck_fired: v })} placeholder="0.343" />
          <Field label='Grosor pared cuello (")' testId="bush-wall" value={bush.neck_wall_thickness} onChange={(v) => setBush({ ...bush, neck_wall_thickness: v })} placeholder="0.015" />
          <Field label='Ø Bala (")' testId="bush-bullet" value={bush.bullet_diameter} onChange={(v) => setBush({ ...bush, bullet_diameter: v })} placeholder="0.308" />
          <Field label='Tensión deseada (")' testId="bush-tension" value={bush.neck_tension} onChange={(v) => setBush({ ...bush, neck_tension: v })} placeholder="0.002" />
        </div>
        <button className="fc-btn flex items-center gap-2" data-testid="calc-bushing-btn" onClick={calcBushing}><Calculator size={16} /> Calcular bushing</button>
        {bushRes && (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10" data-testid="bushing-result">
            <div>
              <ResultRow label="Recámara cuello (con SpringBack)" value={inch(bushRes.chamber_neck)} />
              <ResultRow label="Ø cuello con bala montada" value={inch(bushRes.loaded_neck)} />
              <ResultRow label="Clearance de recámara" value={inch(bushRes.clearance)} />
            </div>
            <div>
              <ResultRow label="Bushing recomendado" value={inch(bushRes.bushing_recommended)} good />
              <ResultRow label="Expander recomendado" value={inch(bushRes.expander_recommended)} good />
              <ResultRow label="Tensión estimada resultante" value={inch(bushRes.estimated_tension)} good />
            </div>
          </div>
        )}
      </Section>

      {/* 2. HEADSPACE */}
      <Section title="2 · Headspace" subtitle="Medida óptima de casquillo para rifles de cerrojo (vaina disparada − 0.002&quot;)." testId="headspace-section">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <Field label='Datum del casquillo (")' testId="hs-datum" value={hs.datum} onChange={(v) => setHs({ ...hs, datum: v })} placeholder="0.400" />
          <Field label='Medida vaina disparada (")' testId="hs-fired" value={hs.fired_measurement} onChange={(v) => setHs({ ...hs, fired_measurement: v })} placeholder="1.630" />
          <div className="flex items-end">
            <button className="fc-btn w-full flex items-center justify-center gap-2" data-testid="calc-headspace-btn" onClick={calcHeadspace}><Ruler size={16} /> Calcular</button>
          </div>
        </div>
        {hsRes && (
          <div data-testid="headspace-result" className="max-w-md">
            <ResultRow label="Reducción aplicada" value={inch(hsRes.reduction)} />
            <ResultRow label="Headspace óptimo (cerrojo)" value={inch(hsRes.optimal_headspace)} good />
          </div>
        )}
      </Section>

      {/* 3. CASE LENGTH */}
      <Section title="3 · Largo de vaina (recorte)" subtitle="Mide de culote a boca; la app indica la más corta para igualar todas." testId="caselength-section">
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Field label='Medida de vaina (")' testId="len-input" value={lenInput} onChange={setLenInput} placeholder="2.005" />
          </div>
          <button className="fc-btn flex items-center gap-2" data-testid="add-length-btn" onClick={addLength}><Plus size={16} /> Añadir</button>
        </div>
        {lengths.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {lengths.map((l, i) => (
                <span key={i} className="font-mono-data text-sm px-2 py-1 rounded-sm" style={{ background: "#1A2E50", color: "#E2E8F0" }}>{Number(l).toFixed(3)}"</span>
              ))}
            </div>
            <div className="max-w-md">
              <ResultRow label="Vainas medidas" value={lengths.length} />
              <ResultRow label="Recortar todas a (más corta)" value={inch(trimLength)} good />
            </div>
          </div>
        )}
      </Section>

      {/* 4. VOLUME */}
      <Section title="4 · Volumen interno (lotes)" subtitle="Pesa vacía y llena; la app agrupa por volumen con diferencia máx. de 0.5 gr." testId="volume-section">
        <div className="flex items-end gap-3 mb-4">
          <div>
            <label className="fc-label">Nº de vainas (máx 100)</label>
            <input className="fc-input" style={{ width: 120 }} data-testid="volume-count" type="number" min="1" max="100" value={caseCount}
              onChange={(e) => { const c = Math.min(100, Math.max(1, Number(e.target.value) || 1)); setCaseCount(c); saveData({ volume: { count: c, rows, groups: vGroups } }); }} />
          </div>
          <button className="fc-btn flex items-center gap-2" data-testid="calc-volume-btn" onClick={calcVolume}><Scale size={16} /> Calcular lotes</button>
        </div>

        <div className="overflow-auto" style={{ maxHeight: 420 }}>
          <table className="fc-table">
            <thead>
              <tr>
                <th>Vaina</th>
                <th>Peso vacío (gr)</th>
                <th>Peso lleno (gr)</th>
                <th>Volumen (gr)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: caseCount }, (_, i) => i + 1).map((n) => {
                const r = rows[n] || {};
                const vol = num(r.empty) != null && num(r.full) != null ? (num(r.full) - num(r.empty)).toFixed(2) : "—";
                return (
                  <tr key={n}>
                    <td style={{ color: "#D4AF37" }}>#{n}</td>
                    <td><input className="fc-input" data-testid={`vol-empty-${n}`} value={r.empty ?? ""} onChange={(e) => setRow(n, "empty", e.target.value)} placeholder="0.00" /></td>
                    <td><input className="fc-input" data-testid={`vol-full-${n}`} value={r.full ?? ""} onChange={(e) => setRow(n, "full", e.target.value)} placeholder="0.00" /></td>
                    <td className="fc-result">{vol}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {vGroups && (
          <div className="mt-6" data-testid="volume-groups-result">
            <h3 className="fc-subtitle text-base font-bold mb-3">Lotes por volumen ({vGroups.total_cases} vainas medidas)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vGroups.groups.map((g) => (
                <div key={g.group} className="p-4 rounded-sm" style={{ background: "#1A2E50" }} data-testid={`vol-group-${g.group}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="fc-subtitle font-bold">Lote {g.group}</span>
                    <span className="fc-good font-mono-data">{g.count} vainas</span>
                  </div>
                  <p className="text-xs font-mono-data mb-2" style={{ color: "#94A3B8" }}>
                    {gr(g.avg_volume)} · spread {g.spread} gr
                  </p>
                  <p className="text-xs font-mono-data" style={{ color: "#E2E8F0" }}>
                    Vainas: {g.case_numbers.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
