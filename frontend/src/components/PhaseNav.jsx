const PHASES = [
  { n: 1, label: "Preparación vainas" },
  { n: 2, label: "Carga adecuada" },
  { n: 3, label: "Seating punta" },
  { n: 4, label: "Seating pistón" },
];

export default function PhaseNav({ phase, setPhase }) {
  return (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {PHASES.map((p) => {
        const active = phase === p.n;
        return (
          <button
            key={p.n}
            data-testid={`phase-tab-${p.n}`}
            onClick={() => setPhase(p.n)}
            className="text-left p-3 rounded-sm transition-colors"
            style={{
              border: `1px solid ${active ? "#D4AF37" : "#1A2E50"}`,
              background: active ? "rgba(212,175,55,0.1)" : "#112240",
              boxShadow: active ? "0 0 10px rgba(212,175,55,0.25)" : "none",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold font-mono-data"
                style={{ border: `2px solid ${active ? "#D4AF37" : "#1A2E50"}`, color: active ? "#D4AF37" : "#94A3B8" }}
              >
                {p.n}
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: active ? "#D4AF37" : "#94A3B8" }}>
                Fase {p.n}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{p.label}</div>
          </button>
        );
      })}
    </div>
  );
}
