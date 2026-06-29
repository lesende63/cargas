import { FileText } from "lucide-react";

// PDF help guides per phase. Add the file path/URL as each guide is provided.
// Files live in /app/frontend/public/help/ and are served at /help/<file>.pdf
const PHASE_PDFS = {
  1: "/help/fase1.pdf",
  2: "",
  3: "",
  4: "",
  5: "",
};

export default function HelpLink({ phase }) {
  const url = PHASE_PDFS[phase];
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" data-testid={`help-pdf-${phase}`}
        className="fc-btn-outline inline-flex items-center gap-2 mt-4">
        <FileText size={16} /> Guía de ayuda (PDF) · Fase {phase}
      </a>
    );
  }
  return (
    <button disabled data-testid={`help-pdf-${phase}`} className="fc-btn-outline inline-flex items-center gap-2 mt-4" style={{ opacity: 0.5, cursor: "not-allowed" }}>
      <FileText size={16} /> Guía de ayuda (PDF) · en preparación
    </button>
  );
}
