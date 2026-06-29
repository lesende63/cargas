import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { num } from "../lib/format";
import { Section } from "../components/Bits";
import CartridgeDiagram from "../components/CartridgeDiagram";

export default function Phase5({ project, saveData }) {
  const d = project.data || {};
  const [cart, setCart] = useState(d.cartridge || {});

  useEffect(() => {
    setCart((project.data || {}).cartridge || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // ---- auto-derived cartridge measurements from other phases ----
  const seatingBest = () => {
    const ent = d.seating?.entries || [];
    const grp = d.seating?.groups || {};
    let best = null;
    ent.forEach((e) => { const g = num(grp[e.cbto]); if (g != null && (best == null || g < best.size)) best = { cbto: e.cbto, size: g }; });
    return best ? best.cbto : null;
  };
  const caseTrim = () => {
    const cl = d.case_length;
    if (!cl || !cl.lengths || !cl.lengths.length) return null;
    let m = Math.min(...cl.lengths.map(Number));
    return cl.unit === "mm" ? Math.round(m * 100) / 100 : Math.round(m * 1000) / 1000;
  };
  const lenUnit = d.case_length?.unit || "in";
  const auto = {
    a: seatingBest(),
    b: caseTrim(),
    c: num(d.bushing?.neck_fired),
    c1: d.bushing?.result?.loaded_neck ?? null,
    e: num(d.primer?.pocket),
    f: d.headspace?.result?.optimal_headspace ?? null,
  };
  const cartVal = (k) => (cart[k] !== undefined && cart[k] !== "" ? cart[k] : (auto[k] != null ? auto[k] : ""));
  const setCartField = (k, val) => { const next = { ...cart, [k]: val }; setCart(next); saveData({ cartridge: next }); };
  const collectFromPhases = () => {
    const next = { ...cart };
    ["a", "b", "c", "c1", "e", "f"].forEach((k) => { if (auto[k] != null) next[k] = auto[k]; });
    setCart(next);
    saveData({ cartridge: next });
    toast.success("Medidas recogidas de las fases");
  };
  const cartRows = [
    { k: "a", label: "A · Base → ojiva de la punta", src: "Fase 3 (mejor grupo)" },
    { k: "b", label: "B · Vaina base → boca de cuello", src: `Fase 1 (recorte, ${lenUnit === "mm" ? "mm" : "pulgadas"})` },
    { k: "c", label: "C · Ø cuello vaina disparada", src: "Fase 1" },
    { k: "c1", label: "C1 · Ø cuello con bala montada", src: "Fase 1" },
    { k: "d", label: "D · Arrastre de la punta", src: "Manual" },
    { k: "e", label: "E · Bolsillo del pistón", src: "Fase 4" },
    { k: "f", label: "F · Headspace óptimo", src: "Fase 1" },
  ];

  return (
    <div>
      <Section title="Datos del cartucho" subtitle="Resumen de medidas recogido de las fases. Puedes modificar cualquier valor manualmente." testId="cartridge-section">
        <button className="fc-btn-outline flex items-center gap-2 mb-5" data-testid="collect-cartridge-btn" onClick={collectFromPhases}>
          <RefreshCw size={16} /> Recoger medidas de las fases
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="rounded-sm p-3" style={{ background: "#0A1526", border: "1px solid #1A2E50" }}>
            <CartridgeDiagram values={{ a: cartVal("a"), b: cartVal("b"), c: cartVal("c"), c1: cartVal("c1"), d: cartVal("d"), e: cartVal("e"), f: cartVal("f") }} units={{ b: lenUnit }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cartRows.map((r) => (
              <div key={r.k}>
                <label className="fc-label">{r.label}</label>
                <input className="fc-input" data-testid={`cart-${r.k}`} value={cartVal(r.k)} onChange={(e) => setCartField(r.k, e.target.value)} placeholder={r.src} />
                <span className="text-[11px]" style={{ color: "#94A3B8" }}>{r.src}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
