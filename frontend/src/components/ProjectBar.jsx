import { useState } from "react";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { num } from "../lib/format";

export default function ProjectBar({ projects, project, presets, onSelect, onCreate, onDelete }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ caliber: "", case_brand: "", case_lot: "", bullet_diameter: "", headspace_datum: "" });

  const presetNames = Object.keys(presets);

  const onCaliberChange = (val) => {
    const preset = presets[val];
    setForm((f) => ({
      ...f,
      caliber: val,
      bullet_diameter: preset ? preset.bullet_diameter : f.bullet_diameter,
      headspace_datum: preset ? preset.headspace_datum : f.headspace_datum,
    }));
  };

  const submit = () => {
    if (!form.caliber || !form.case_brand || !form.case_lot) return;
    onCreate({
      caliber: form.caliber,
      case_brand: form.case_brand,
      case_lot: form.case_lot,
      bullet_diameter: num(form.bullet_diameter),
      headspace_datum: num(form.headspace_datum),
    });
    setCreating(false);
    setForm({ caliber: "", case_brand: "", case_lot: "", bullet_diameter: "", headspace_datum: "" });
  };

  return (
    <div className="fc-card p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[220px]">
          <label className="fc-label">Proyecto</label>
          <select
            data-testid="project-select"
            className="fc-input"
            value={project?.id || ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">— Seleccionar proyecto —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.caliber} · {p.case_brand} · Lote {p.case_lot}
              </option>
            ))}
          </select>
        </div>
        <button className="fc-btn flex items-center gap-2" data-testid="new-project-btn" onClick={() => setCreating((c) => !c)}>
          <Plus size={16} /> Nuevo
        </button>
        {project && (
          <button className="fc-btn-outline flex items-center gap-2" data-testid="delete-project-btn" onClick={() => onDelete(project.id)}>
            <Trash2 size={16} /> Eliminar
          </button>
        )}
      </div>

      {project && !creating && (
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm font-mono-data" data-testid="project-info">
          <span style={{ color: "#94A3B8" }}>Calibre: <b style={{ color: "#E2E8F0" }}>{project.caliber}</b></span>
          <span style={{ color: "#94A3B8" }}>Ø Bala: <b style={{ color: "#E2E8F0" }}>{project.bullet_diameter ?? "—"}"</b></span>
          <span style={{ color: "#94A3B8" }}>Datum HS: <b style={{ color: "#E2E8F0" }}>{project.headspace_datum != null ? `${Number(project.headspace_datum).toFixed(3)}"` : "—"}</b></span>
        </div>
      )}

      {creating && (
        <div className="mt-5 border-t pt-5" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
          <h3 className="fc-subtitle text-lg font-bold mb-4 flex items-center gap-2"><FolderOpen size={18} /> Nuevo proyecto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="fc-label">Calibre</label>
              <select className="fc-input" data-testid="new-caliber" value={form.caliber} onChange={(e) => onCaliberChange(e.target.value)}>
                <option value="">— Selecciona —</option>
                {presetNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="fc-label">Marca de vainas</label>
              <input className="fc-input" data-testid="new-brand" value={form.case_brand} onChange={(e) => setForm({ ...form, case_brand: e.target.value })} placeholder="Lapua, Peterson..." />
            </div>
            <div>
              <label className="fc-label">Lote</label>
              <input className="fc-input" data-testid="new-lot" value={form.case_lot} onChange={(e) => setForm({ ...form, case_lot: e.target.value })} placeholder="Nº de lote" />
            </div>
            <div>
              <label className="fc-label">Ø Bala (pulgadas)</label>
              <input className="fc-input" data-testid="new-bullet-dia" value={form.bullet_diameter} onChange={(e) => setForm({ ...form, bullet_diameter: e.target.value })} placeholder="0.308" />
            </div>
            <div>
              <label className="fc-label">Datum Headspace (pulgadas)</label>
              <input className="fc-input" data-testid="new-headspace-datum" value={form.headspace_datum} onChange={(e) => setForm({ ...form, headspace_datum: e.target.value })} placeholder="0.400" />
            </div>
            <div className="flex items-end">
              <button className="fc-btn w-full" data-testid="create-project-btn" onClick={submit}>Crear proyecto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
