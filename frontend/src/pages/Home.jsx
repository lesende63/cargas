import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Crosshair } from "lucide-react";
import { api } from "../lib/api";
import ProjectBar from "../components/ProjectBar";
import PhaseNav from "../components/PhaseNav";
import Phase1 from "../phases/Phase1";
import Phase2 from "../phases/Phase2";
import Phase3 from "../phases/Phase3";
import Phase4 from "../phases/Phase4";

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [presets, setPresets] = useState({});
  const [phase, setPhase] = useState(1);
  const saveTimer = useRef(null);
  const pendingPatch = useRef({});

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

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1526" }}>
      <header className="border-b" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <Crosshair size={30} color="#D4AF37" />
          <div>
            <h1 className="fc-title text-2xl sm:text-3xl font-black uppercase leading-none" data-testid="app-title">
              F-Class Reload Lab
            </h1>
            <p className="text-xs uppercase tracking-[0.25em] mt-1" style={{ color: "#94A3B8" }}>
              Desarrollo de cargas de precisión
            </p>
          </div>
        </div>
      </header>

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
            <div className="mt-6">
              {phase === 1 && <Phase1 project={project} saveData={saveData} updateMeta={updateMeta} presets={presets} />}
              {phase === 2 && <Phase2 project={project} saveData={saveData} />}
              {phase === 3 && <Phase3 project={project} saveData={saveData} />}
              {phase === 4 && <Phase4 project={project} saveData={saveData} />}
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
    </div>
  );
}
