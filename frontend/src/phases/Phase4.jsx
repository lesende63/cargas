import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gauge, ListOrdered } from "lucide-react";
import { api } from "../lib/api";
import { inch, num } from "../lib/format";
import { Section, Field, AtmoData } from "../components/Bits";

const stats = (vels) => {
  const v = vels.map(num).filter((x) => x != null);
  if (v.length === 0) return { es: null, sd: null };
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  const es = Math.max(...v) - Math.min(...v);
  let sd = null;
  if (v.length >= 2) sd = Math.sqrt(v.reduce((a, b) => a + (b - avg) ** 2, 0) / (v.length - 1));
  return { es: Math.round(es * 10) / 10, sd: sd != null ? Math.round(sd * 10) / 10 : null };
};

export default function Phase4({ project, saveData }) {
  const d = project.data || {};
  const [pocket, setPocket] = useState(d.primer?.pocket ?? "");
  const [height, setHeight] = useState(d.primer?.height ?? "");
  const [groupCount, setGroupCount] = useState(d.primer?.groupCount || 6);
  const [entries, setEntries] = useState(d.primer?.entries || []);
  const [vels, setVels] = useState(d.primer?.vels || {}); // group -> [5 velocities]
  const [atmo, setAtmo] = useState(d.primer?.atmo || {});

  useEffect(() => {
    const nd = project.data || {};
    setPocket(nd.primer?.pocket ?? "");
    setHeight(nd.primer?.height ?? "");
    setGroupCount(nd.primer?.groupCount || 6);
    setEntries(nd.primer?.entries || []);
    setVels(nd.primer?.vels || {});
    setAtmo(nd.primer?.atmo || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const persist = (patch) => saveData({ primer: { pocket, height, groupCount, entries, vels, atmo, ...patch } });

  const gen = async () => {
    const p = num(pocket), h = num(height);
    if (p == null || h == null) { toast.error("Indica medida del bolsillo y del pistón"); return; }
    const res = await api.primerLadder({ pocket_depth: p, primer_height: h, step: 0.002, groups: Number(groupCount) });
    setEntries(res.entries);
    persist({ entries: res.entries });
    toast.success(`${res.entries.length} grupos generados`);
  };

  const setVel = (group, idx, val) => {
    const arr = [...(vels[group] || ["", "", "", "", ""])];
    arr[idx] = val;
    const nv = { ...vels, [group]: arr };
    setVels(nv);
    persist({ vels: nv });
  };

  let best = null;
  entries.forEach((e) => {
    const st = stats(vels[e.group] || []);
    if (st.es != null && st.sd != null) {
      const score = st.es + st.sd;
      if (best == null || score < best.score) best = { ...e, ...st, score };
    }
  });

  return (
    <div>
      <Section title="Escalera de seating del pistón" subtitle="Grupos de 5 cartuchos. Pretensión en pasos de 0.002&quot; (el primero a cero). La app calcula ES y SD." testId="primer-section">
        <AtmoData value={atmo} onChange={(a) => { setAtmo(a); persist({ atmo: a }); }} testId="primer-atmo" />
        <div className="flex flex-wrap items-end gap-4 mb-5">
          <Field label='Medida bolsillo del pistón (")' testId="pocket-depth" value={pocket} onChange={(v) => { setPocket(v); persist({ pocket: v }); }} placeholder="0.129" />
          <Field label='Medida del pistón (")' testId="primer-height" value={height} onChange={(v) => { setHeight(v); persist({ height: v }); }} placeholder="0.124" />
          <div>
            <label className="fc-label">Nº de grupos</label>
            <input className="fc-input" style={{ width: 110 }} data-testid="primer-groups" type="number" min="2" max="12" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} />
          </div>
          <button className="fc-btn flex items-center gap-2" data-testid="gen-primer-btn" onClick={gen}><ListOrdered size={16} /> Generar escalera</button>
        </div>

        {entries.length > 0 && (
          <div className="overflow-auto">
            <table className="fc-table">
              <thead>
                <tr><th>Grupo</th><th>Pretensión (")</th><th>Profundidad (")</th><th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th><th>ES</th><th>SD</th></tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const st = stats(vels[e.group] || []);
                  return (
                    <tr key={e.group} data-testid={`primer-row-${e.group}`}>
                      <td style={{ color: "#D4AF37" }}>{e.group}</td>
                      <td>{Number(e.pretension).toFixed(3)}</td>
                      <td className="fc-result">{Number(e.seating_depth).toFixed(3)}</td>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <td key={i}><input className="fc-input" style={{ minWidth: 70 }} data-testid={`pvel-${e.group}-${i}`} value={(vels[e.group] || [])[i] ?? ""} onChange={(ev) => setVel(e.group, i, ev.target.value)} placeholder="m/s" /></td>
                      ))}
                      <td className="fc-result">{st.es ?? "—"}</td>
                      <td className="fc-result">{st.sd ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {best && (
          <div className="mt-5 p-5 rounded-sm" style={{ background: "#1A2E50" }} data-testid="primer-recommend">
            <div className="flex items-center gap-2 mb-2"><Gauge size={18} color="#4ADE80" /><span className="fc-subtitle font-bold">Mejor pretensión</span></div>
            <p className="font-mono-data text-xl fc-good">Grupo {best.group} · pretensión {inch(best.pretension)}</p>
            <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>ES {best.es} m/s · SD {best.sd} m/s (menor ES + SD)</p>
          </div>
        )}
      </Section>
    </div>
  );
}
