import { useState } from "react";
import { AlertTriangle } from "lucide-react";

const KEY = "fclass_disclaimer_accepted";

const TEXT = "Esta aplicación es una herramienta de apoyo para el desarrollo de cargas y NO sustituye los manuales oficiales de los fabricantes de pólvora, punta y vaina. La recarga de munición conlleva riesgos graves de lesión, daño material o muerte. El usuario es el único responsable de verificar todos los datos, respetar las cargas máximas del fabricante y vigilar los signos de sobrepresión en cada disparo. Los datos generados por IA son estimaciones y pueden contener errores. Usted utiliza esta aplicación bajo su exclusiva responsabilidad.";

export default function Disclaimer() {
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });

  const accept = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setAccepted(true);
  };

  // First use: blocking modal that must be accepted.
  if (!accepted) {
    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" style={{ background: "rgba(10,21,38,0.92)" }} data-testid="disclaimer-modal">
        <div className="fc-card p-7 max-w-lg w-full" style={{ borderColor: "#F87171" }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={22} color="#F87171" />
            <h3 className="fc-subtitle text-lg font-bold" style={{ color: "#F87171" }}>Descargo de responsabilidad</h3>
          </div>
          <p className="text-sm mb-6" style={{ color: "#E2E8F0", lineHeight: 1.6 }}>{TEXT}</p>
          <button className="fc-btn w-full" data-testid="disclaimer-accept" onClick={accept}>
            Acepto y entiendo los riesgos
          </button>
        </div>
      </div>
    );
  }

  // After acceptance: persistent, non-blocking notice always visible.
  return (
    <div className="border-b" style={{ background: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.3)" }} data-testid="disclaimer-banner">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-start gap-2">
        <AlertTriangle size={14} color="#F87171" style={{ marginTop: 3, flexShrink: 0 }} />
        <p className="text-xs" style={{ color: "#FCA5A5", lineHeight: 1.5 }}>
          <b>Descargo de responsabilidad:</b> {TEXT}
        </p>
      </div>
    </div>
  );
}
