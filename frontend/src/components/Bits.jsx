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
