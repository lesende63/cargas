import { FileText } from "lucide-react";

// PDF help guides per phase. Add the file path/URL as each guide is provided.
// Files live in /app/frontend/public/help/ and are served at /help/<file>.pdf
const PHASE_PDFS = {
  1: "/help/fase1.pdf",
  2: "/help/fase2.pdf",
  3: "",
  4: "",
  5: "",
};

export default function HelpLink({ phase }) {
  const url = PHASE_PDFS[phase];
  // Same responsive grid as PhaseNav so the help button aligns under its phase
  // tab and matches its horizontal width exactly.
  const spacers = Array.from({ length: Math.max(phase - 1, 0) });
  const inner = url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" data-testid={`help-pdf-${phase}`}
      className="fc-btn-outline w-full inline-flex items-center justify-center gap-2 text-center" style={{ padding: "8px 6px" }}>
      <FileText size={16} /> Ayuda PDF
    </a>
  ) : (
    <button disabled data-testid={`help-pdf-${phase}`} className="fc-btn-outline w-full inline-flex items-center justify-center gap-2" style={{ opacity: 0.5, cursor: "not-allowed", padding: "8px 6px" }}>
      <FileText size={16} /> Ayuda PDF
    </button>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
      {spacers.map((_, i) => <div key={i} />)}
      {inner}
    </div>
  );
}
