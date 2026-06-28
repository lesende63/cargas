import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crosshair, ListOrdered } from "lucide-react";
import { api } from "../lib/api";
import { inch, num } from "../lib/format";
import { Section, Field, AtmoData } from "../components/Bits";

export default function Phase3({ project, saveData }) {
  const d = project.data || {};
  const [bulletType, setBulletType] = useState(d.seating?.bulletType || "hybrid");
  const [maxCbto, setMaxCbto] = useState(d.seating?.maxCbto ?? "");
  const [entries, setEntries] = useState(d.seating?.entries || []);
  const [groups, setGroups] = useState(d.seating?.groups || {}); // cbto -> group size (mm)
  const [atmo, setAtmo] = useState(d.seating?.atmo || {});

  useEffect(() => {
    const nd = project.data || {};
    setBulletType(nd.seating?.bulletType || "hybrid");
    setMaxCbto(nd.seating?.maxCbto ?? "");
    setEntries(nd.seating?.entries || []);
    setGroups(nd.seating?.groups || {});
    setAtmo(nd.seating?.atmo || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const persist = (patch) => saveData({ seating: { bulletType, maxCbto, entries, groups, atmo, ...patch } });

  const gen = async () => {
    const m = num(maxCbto);
    if (m == null) { toast.error("Indica la medida base-ojiva máxima"); return; }
    const res = await api.seatingLadder({ max_cbto: m, bullet_type: bulletType, step: 0.003, max_jump: 0.030 });
    setEntries(res.entries);
    persist({ entries: res.entries });
    toast.success(`${res.entries.length} medidas generadas`);
  };

  const setGroup = (cbto, val) => {
    const ng = { ...groups, [cbto]: val };
    setGroups(ng);
    persist({ groups: ng });
  };

  let best = null;
  entries.forEach((e) => {
    const g = num(groups[e.cbto]);
    if (g != null && (best == null || g < best.size)) best = { cbto: e.cbto, label: e.label, size: g };
  });

  return (
    <div>
      <Section title="Ajuste del seating de la punta" subtitle="Grupos de 5 cartuchos, escalonando 0.003&quot; hasta 0.030&quot; de salto. Anota el tamaño de grupo a 100 m." testId="seating-section">
        <AtmoData value={atmo} onChange={(a) => { setAtmo(a); persist({ atmo: a }); }} testId="seating-atmo" />
        <div className="flex flex-wrap items-end gap-4 mb-5">
          <div>
            <label className="fc-label">Tipo de punta</label>
            <select className="fc-input" data-testid="bullet-type" value={bulletType} onChange={(e) => { setBulletType(e.target.value); persist({ bulletType: e.target.value }); }}>
              <option value="hybrid">Híbrida (solo salto positivo)</option>
              <option value="vld">Berger VLD (permite entrar en estría)</option>
            </select>
          </div>
          <Field label='Medida base-ojiva máxima (")' testId="max-cbto" value={maxCbto} onChange={setMaxCbto} placeholder="2.250" />
          <button className="fc-btn flex items-center gap-2" data-testid="gen-seating-btn" onClick={gen}><ListOrdered size={16} /> Generar escalera</button>
        </div>

        {entries.length > 0 && (
          <div className="overflow-auto" style={{ maxHeight: 480 }}>
            <table className="fc-table">
              <thead>
                <tr><th>Salto</th><th>Medida base-ojiva (")</th><th>Tamaño de grupo (mm)</th></tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.cbto} data-testid={`seating-row-${e.cbto}`}>
                    <td style={{ color: e.offset > 0 ? "#F87171" : "#D4AF37" }}>{e.label}</td>
                    <td className="fc-result">{Number(e.cbto).toFixed(3)}</td>
                    <td><input className="fc-input" data-testid={`group-${e.cbto}`} value={groups[e.cbto] ?? ""} onChange={(ev) => setGroup(e.cbto, ev.target.value)} placeholder="mm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {best && (
          <div className="mt-5 p-5 rounded-sm" style={{ background: "#1A2E50" }} data-testid="seating-recommend">
            <div className="flex items-center gap-2 mb-2"><Crosshair size={18} color="#4ADE80" /><span className="fc-subtitle font-bold">Mejor seating</span></div>
            <p className="font-mono-data text-xl fc-good">{inch(best.cbto)} · {best.label}</p>
            <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Grupo más pequeño: {best.size} mm</p>
          </div>
        )}
      </Section>
    </div>
  );
}
