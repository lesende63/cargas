// Schematic cartridge side-view with measurement callouts A–F.
export default function CartridgeDiagram({ values, units }) {
  const v = values || {};
  const L = (k) => {
    const val = v[k];
    if (val === undefined || val === "" || val === null) return "—";
    const u = (units && units[k]) || "in";
    return u === "mm" ? `${Number(val).toFixed(2)} mm` : `${Number(val).toFixed(3)}"`;
  };
  const gold = "#D4AF37", line = "#1A2E50", txt = "#94A3B8";

  return (
    <svg viewBox="0 0 440 300" className="w-full" data-testid="cartridge-svg">
      {/* ---- cartridge body (horizontal, bullet to the right) ---- */}
      {/* rim + base */}
      <rect x="34" y="150" width="10" height="70" fill="#0F1E38" stroke={gold} strokeWidth="1.5" />
      {/* case body */}
      <rect x="44" y="156" width="180" height="58" fill="#0F1E38" stroke={gold} strokeWidth="1.5" />
      {/* shoulder */}
      <polygon points="224,156 262,168 262,202 224,214" fill="#0F1E38" stroke={gold} strokeWidth="1.5" />
      {/* neck */}
      <rect x="262" y="168" width="42" height="34" fill="#0F1E38" stroke={gold} strokeWidth="1.5" />
      {/* bullet (in neck + ogive) */}
      <path d="M304,168 L320,168 Q392,168 420,185 Q392,202 320,202 L304,202 Z" fill="#16294a" stroke={gold} strokeWidth="1.5" />
      {/* primer pocket */}
      <rect x="36" y="176" width="6" height="18" fill={gold} opacity="0.5" />

      {/* ---- callouts ---- */}
      {/* A: base->ogive (full) top bracket */}
      <line x1="44" y1="60" x2="360" y2="60" stroke={gold} strokeWidth="1" />
      <line x1="44" y1="60" x2="44" y2="150" stroke={line} strokeWidth="1" strokeDasharray="3 3" />
      <line x1="360" y1="60" x2="360" y2="178" stroke={line} strokeWidth="1" strokeDasharray="3 3" />
      <text x="200" y="52" fill={gold} fontSize="13" fontFamily="monospace" textAnchor="middle" fontWeight="700">A = {L("a")}</text>

      {/* B: base->neck mouth */}
      <line x1="44" y1="92" x2="304" y2="92" stroke={gold} strokeWidth="1" />
      <line x1="304" y1="92" x2="304" y2="166" stroke={line} strokeWidth="1" strokeDasharray="3 3" />
      <text x="174" y="86" fill={gold} fontSize="12" fontFamily="monospace" textAnchor="middle" fontWeight="700">B = {L("b")}</text>

      {/* C: fired neck diameter (vertical) */}
      <line x1="283" y1="168" x2="283" y2="202" stroke={gold} strokeWidth="1" />
      <text x="283" y="240" fill={gold} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="700">C = {L("c")}</text>
      <line x1="283" y1="202" x2="283" y2="232" stroke={line} strokeWidth="1" strokeDasharray="3 3" />

      {/* C1: neck w/ bullet diameter */}
      <text x="335" y="240" fill={gold} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="700">C1 = {L("c1")}</text>
      <line x1="320" y1="202" x2="320" y2="232" stroke={line} strokeWidth="1" strokeDasharray="3 3" />

      {/* D: bullet drag/seating into neck */}
      <text x="312" y="150" fill={gold} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="700">D = {L("d")}</text>
      <line x1="304" y1="168" x2="304" y2="154" stroke={line} strokeWidth="1" strokeDasharray="3 3" />

      {/* E: primer pocket depth */}
      <text x="18" y="270" fill={gold} fontSize="11" fontFamily="monospace" textAnchor="start" fontWeight="700">E = {L("e")}</text>
      <line x1="39" y1="194" x2="39" y2="258" stroke={line} strokeWidth="1" strokeDasharray="3 3" />

      {/* F: headspace base->datum */}
      <line x1="44" y1="270" x2="243" y2="270" stroke={gold} strokeWidth="1" />
      <line x1="243" y1="214" x2="243" y2="278" stroke={line} strokeWidth="1" strokeDasharray="3 3" />
      <text x="150" y="288" fill={gold} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="700">F = {L("f")}</text>
    </svg>
  );
}
