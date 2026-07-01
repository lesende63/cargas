import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Upload, Power } from "lucide-react";import { api } from "../lib/api";
import ProjectBar from "../components/ProjectBar";
import PhaseNav from "../components/PhaseNav";
import Phase1 from "../phases/Phase1";
import Phase2 from "../phases/Phase2";
import Phase3 from "../phases/Phase3";
import Phase4 from "../phases/Phase4";
import Phase5 from "../phases/Phase5";
import HelpLink from "../components/HelpLink";
import Disclaimer from "../components/Disclaimer";

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [presets, setPresets] = useState({});
  const [phase, setPhase] = useState(1);
  const saveTimer = useRef(null);
  const pendingPatch = useRef({});
  const importInput = useRef(null);
  const [decimalWarn, setDecimalWarn] = useState(false);

  // Warn (popup) when a numeric field uses a comma instead of a point as decimal separator.
  useEffect(() => {
    const handler = (e) => {
      const t = e.target;
      if (t && t.tagName === "INPUT") {
        const v = t.value || "";
        if (v.includes(",") && /^[+-]?[\d.,\s]*$/.test(v) && /\d/.test(v)) {
          setDecimalWarn(true);
        }
      }
    };
    document.addEventListener("input", handler, true);
    return () => document.removeEventListener("input", handler, true);
  }, []);

  const exportProjects = () => {
    const data = api.exportProjects();
    if (!data.length) { toast.error("No hay proyectos para exportar"); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `f-class-proyectos-${new Date().toISOString().slice(0, 10)}.json`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    toast.success(`${data.length} proyecto(s) exportado(s)`);
  };

  const closeApp = () => {
    // Flush any pending (debounced) save before shutting down.
    if (project && Object.keys(pendingPatch.current).length) {
      const toSend = pendingPatch.current;
      pendingPatch.current = {};
      api.updateProject(project.id, { data: toSend });
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // Try to close the tab/window (works for installed PWA / script-opened windows).
    try { window.open("", "_self"); window.close(); } catch (e) {}
    // If the browser blocked the close, fully reset: this unmounts the whole app
    // (stops all timers/processes) and returns to the password gate.
    setTimeout(() => { window.location.reload(); }, 300);
  };

  const importProjects = (e) => {    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const res = api.importProjects(parsed);
        await loadProjects();
        toast.success(`Importado: ${res.added} nuevo(s), ${res.updated} actualizado(s)`);
      } catch (err) {
        toast.error("Archivo JSON inválido");
      }
    };
    reader.readAsText(file);
  };

  const loadProjects = useCallback(async () => {
    const list = await api.listProjects();
    setProjects(list);
    return list;
  }, []);

  useEffect(() => {
    api.presets().then((d) => setPresets(d.presets || {}));
    loadProjects();
  }, [loadProjects]);

  const selectProject = async (id) => {
    if (!id) { setProject(null); return; }
    const p = await api.getProject(id);
    setProject(p);
    setPhase(1);
  };

  const createProject = async (body) => {
    const p = await api.createProject(body);
    await loadProjects();
    setProject(p);
    setPhase(1);
    toast.success("Proyecto creado");
  };

  const removeProject = async (id) => {
    await api.deleteProject(id);
    if (project?.id === id) setProject(null);
    await loadProjects();
    toast.success("Proyecto eliminado");
  };

  // Merge a patch into project.data and persist (debounced, accumulates patches)
  const saveData = useCallback((patch) => {
    setProject((prev) => {
      if (!prev) return prev;
      const next = { ...prev, data: { ...prev.data, ...patch } };
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const toSend = pendingPatch.current;
        pendingPatch.current = {};
        api.updateProject(next.id, { data: toSend }).catch(() => toast.error("Error al guardar"));
      }, 700);
      return next;
    });
  }, []);

  const updateMeta = async (body) => {
    const p = await api.updateProject(project.id, body);
    setProject(p);
    await loadProjects();
    toast.success("Datos del proyecto actualizados");
  };

  // Flush any pending (debounced) edits immediately when the tab is hidden/closed.
  useEffect(() => {
    const flush = () => {
      if (project && Object.keys(pendingPatch.current).length) {
        const toSend = pendingPatch.current;
        pendingPatch.current = {};
        if (saveTimer.current) clearTimeout(saveTimer.current);
        api.updateProject(project.id, { data: toSend });
      }
    };
    window.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [project]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1526" }}>
      {decimalWarn && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(10,21,38,0.8)" }} data-testid="decimal-warning-modal">
          <div className="fc-card p-6 max-w-md w-full" style={{ borderColor: "#D4AF37" }}>
            <h3 className="fc-subtitle text-lg font-bold mb-2">Separador decimal incorrecto</h3>
            <p className="text-sm mb-5" style={{ color: "#E2E8F0" }}>
              Usa el <b>punto (.)</b> como separador decimal, no la coma (,). Por ejemplo: <span className="font-mono-data" style={{ color: "#D4AF37" }}>0.343</span>, no 0,343.
            </p>
            <div className="flex justify-end">
              <button className="fc-btn" data-testid="decimal-warning-ok" onClick={() => setDecimalWarn(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
      <header className="border-b" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <button className="fc-btn-outline flex items-center gap-2 px-4 py-2" data-testid="close-app-btn" onClick={closeApp} title="Cerrar aplicación">
            <Power size={16} /> <span className="hidden sm:inline">Cerrar</span>
          </button>
          <img src="/logo-mark.png?v=3" alt="Reload Lab" width="60" height="60" data-testid="app-logo" />
          <div>
            <h1 className="fc-title text-3xl sm:text-4xl font-black uppercase leading-none" data-testid="app-title">
              RELOAD LAB
            </h1>
            <p className="text-xs uppercase tracking-[0.25em] mt-1" style={{ color: "#94A3B8" }}>
              Desarrollo de cargas de precisión
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="fc-btn-outline flex items-center gap-2 px-4 py-2" data-testid="export-projects-btn" onClick={exportProjects} title="Exportar proyectos a JSON">
              <Download size={16} /> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button className="fc-btn-outline flex items-center gap-2 px-4 py-2" data-testid="import-projects-btn" onClick={() => importInput.current?.click()} title="Importar proyectos desde JSON">
              <Upload size={16} /> <span className="hidden sm:inline">Importar</span>
            </button>
            <input ref={importInput} type="file" accept="application/json,.json" className="hidden" data-testid="import-file-input" onChange={importProjects} />
          </div>
        </div>
      </header>

      <Disclaimer />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <ProjectBar
          projects={projects}
          project={project}
          presets={presets}
          onSelect={selectProject}
          onCreate={createProject}
          onDelete={removeProject}
        />

        {project && (
          <>
            <PhaseNav phase={phase} setPhase={setPhase} />
            <HelpLink phase={phase} />
            <div className="mt-6">
              {phase === 1 && <Phase1 project={project} saveData={saveData} updateMeta={updateMeta} presets={presets} />}
              {phase === 2 && <Phase2 project={project} saveData={saveData} />}
              {phase === 3 && <Phase3 project={project} saveData={saveData} />}
              {phase === 4 && <Phase4 project={project} saveData={saveData} />}
              {phase === 5 && <Phase5 project={project} saveData={saveData} />}
            </div>
          </>
        )}

        {!project && (
          <div className="fc-card p-10 mt-6 text-center" data-testid="no-project-msg">
            <p style={{ color: "#94A3B8" }}>
              Selecciona un proyecto existente o crea uno nuevo indicando el calibre, la marca y el lote de las vainas.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t mt-6 py-5 text-center" style={{ borderColor: "rgba(212,175,55,0.2)" }} data-testid="app-footer">
        <p className="text-xs" style={{ color: "#94A3B8" }}>© Fco. Javier Lesende Sieira 2026</p>
      </footer>
    </div>
  );
}
