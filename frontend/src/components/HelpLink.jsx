import { useState } from "react";
import { FileText, X } from "lucide-react";

// PDF help guides per phase. Files live in /app/frontend/public/help/
// and are served at /help/<file>.pdf
const PHASE_PDFS = {
  1: "/help/fase1.pdf",
  2: "/help/fase2.pdf",
  3: "/help/fase3.pdf",
  4: "/help/fase4.pdf",
  5: "/help/fase5.pdf",
};

export default function HelpLink({ phase }) {
  const url = PHASE_PDFS[phase];
  const [open, setOpen] = useState(false);
  // Same responsive grid as PhaseNav so the help button aligns under its phase tab.
  const spacers = Array.from({ length: Math.max(phase - 1, 0) });

  const inner = url ? (
    <button onClick={() => setOpen(true)} data-testid={`help-pdf-${phase}`}
      className="fc-btn-outline w-full inline-flex items-center justify-center gap-2 text-center" style={{ padding: "8px 6px" }}>
      <FileText size={16} /> Ayuda PDF
    </button>
  ) : (
    <button disabled data-testid={`help-pdf-${phase}`} className="fc-btn-outline w-full inline-flex items-center justify-center gap-2" style={{ opacity: 0.5, cursor: "not-allowed", padding: "8px 6px" }}>
      <FileText size={16} /> Ayuda PDF
    </button>
  );

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
        {spacers.map((_, i) => <div key={i} />)}
        {inner}
      </div>

      {open && url && (
        <div className="fixed inset-0 z-[1100] flex flex-col" style={{ background: "rgba(10,21,38,0.97)" }} data-testid={`help-viewer-${phase}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(212,175,55,0.25)" }}>
            <span className="fc-subtitle text-base font-bold flex items-center gap-2"><FileText size={18} /> Ayuda · Fase {phase}</span>
            <button onClick={() => setOpen(false)} data-testid={`help-close-${phase}`}
              className="fc-btn flex items-center gap-2 px-4 py-2">
              <X size={16} /> Volver a la app
            </button>
          </div>
          <iframe src={url} title={`Ayuda Fase ${phase}`} className="flex-1 w-full" style={{ border: "none", background: "#fff" }} />
        </div>
      )}
    </>
  );
}
