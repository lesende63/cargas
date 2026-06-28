import { Thermometer } from "lucide-react";

export function Section({ title, subtitle, children, testId }) {
  return (
    <div className="fc-card p-6 mb-6" data-testid={testId}>
      <div className="border-b pb-3 mb-5" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
        <h2 className="fc-subtitle text-lg sm:text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, testId, type = "text" }) {
  return (
    <div>
      <label className="fc-label">{label}</label>
      <input
        className="fc-input"
        data-testid={testId}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ResultRow({ label, value, good }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b" style={{ borderColor: "#1A2E50" }}>
      <span className="text-sm" style={{ color: "#94A3B8" }}>{label}</span>
      <span className={`text-lg ${good ? "fc-good" : "fc-result"}`}>{value}</span>
    </div>
  );
}

export function AtmoData({ value, onChange, testId }) {
  const v = value || {};
  const set = (f, val) => onChange({ ...v, [f]: val });
  return (
    <div className="mb-5 p-4 rounded-sm" style={{ background: "#0F1E38", border: "1px solid rgba(212,175,55,0.15)" }} data-testid={testId}>
      <div className="flex items-center gap-2 mb-3">
        <Thermometer size={16} color="#D4AF37" />
        <span className="fc-subtitle text-sm font-bold uppercase tracking-wider">Condiciones atmosféricas de la prueba</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Temperatura ambiente (°C)" testId={`${testId}-temp`} value={v.temp} onChange={(x) => set("temp", x)} placeholder="20" />
        <Field label="Humedad (%)" testId={`${testId}-humidity`} value={v.humidity} onChange={(x) => set("humidity", x)} placeholder="50" />
        <Field label="Densidad de altitud (ft)" testId={`${testId}-density`} value={v.density_altitude} onChange={(x) => set("density_altitude", x)} placeholder="2500" />
      </div>
    </div>
  );
}
