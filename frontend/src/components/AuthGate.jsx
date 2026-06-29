import { useState } from "react";
import { Lock } from "lucide-react";

const PASSWORD = "63-G1";

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [denied, setDenied] = useState(false);

  if (authed) return children;

  const submit = (e) => {
    e.preventDefault();
    if (pwd === PASSWORD) {
      setAuthed(true);
    } else {
      setDenied(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#0A1526" }}>
      {denied && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(10,21,38,0.85)" }} data-testid="auth-denied-modal">
          <div className="fc-card p-6 max-w-md w-full text-center" style={{ borderColor: "#F87171" }}>
            <p className="text-lg font-bold mb-5" style={{ color: "#F87171" }}>No está usted autorizado a usar esta aplicación</p>
            <button className="fc-btn" data-testid="auth-denied-ok" onClick={() => { setDenied(false); setPwd(""); }}>Cerrar</button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="fc-card p-8 max-w-sm w-full" style={{ borderColor: "rgba(212,175,55,0.3)" }}>
        <div className="flex flex-col items-center mb-6">
          <img src="/icon-192.png" alt="F-Class Reload Lab" width="64" height="64" className="rounded-sm" />
          <h1 className="fc-title text-2xl font-black uppercase mt-3 text-center leading-tight">F-Class Reload Lab</h1>
          <p className="text-xs uppercase tracking-[0.25em] mt-2" style={{ color: "#94A3B8" }}>Acceso restringido</p>
        </div>
        <label className="fc-label flex items-center gap-2"><Lock size={14} /> Contraseña</label>
        <input
          className="fc-input"
          type="password"
          data-testid="auth-input"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Introduce la contraseña"
          autoFocus
        />
        <button type="submit" className="fc-btn w-full mt-5" data-testid="auth-submit">Entrar</button>
      </form>
    </div>
  );
}
