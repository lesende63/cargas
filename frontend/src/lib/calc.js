// All ballistic calculations run locally in the browser (offline-capable).
const SPRING_BACK = 0.001;
const HEADSPACE_REDUCTION = 0.002;

const r3 = (x) => Math.round(x * 1000) / 1000;
const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;
const n = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const x = Number(v);
  return isNaN(x) ? null : x;
};

export function bushing({ neck_fired, neck_wall_thickness, bullet_diameter, neck_tension = 0.002 }) {
  const nf = n(neck_fired), w = n(neck_wall_thickness), bd = n(bullet_diameter), t = n(neck_tension) ?? 0.002;
  const chamber_neck = r3(nf + SPRING_BACK);
  const loaded_neck = r3(bd + 2 * w);
  const clearance = r3(chamber_neck - loaded_neck);
  const bushing_ideal = r3(loaded_neck - t);
  const bushing_recommended = r3(bushing_ideal - SPRING_BACK);
  const expander_recommended = bushing_ideal;
  const estimated_tension = r3(bd - (expander_recommended - 2 * w));
  return { chamber_neck, loaded_neck, clearance, bushing_recommended, expander_recommended, estimated_tension, spring_back: SPRING_BACK };
}

export function headspace({ fired_measurement, datum }) {
  const fm = n(fired_measurement);
  return { datum: n(datum), fired_measurement: r3(fm), reduction: HEADSPACE_REDUCTION, optimal_headspace: r3(fm - HEADSPACE_REDUCTION) };
}

export function groupStats(velocities) {
  const v = (velocities || []).map(n).filter((x) => x != null);
  if (v.length === 0) return { avg: null, es: null, sd: null, count: 0 };
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  const es = Math.max(...v) - Math.min(...v);
  let sd = null;
  if (v.length >= 2) sd = Math.sqrt(v.reduce((a, b) => a + (b - avg) ** 2, 0) / (v.length - 1));
  return { avg: r1(avg), es: r1(es), sd: sd != null ? r1(sd) : null, count: v.length };
}

export function volumeGroups({ cases, max_spread = 0.5 }) {
  const measured = [];
  (cases || []).forEach((c) => {
    const e = n(c.empty), f = n(c.full);
    if (e != null && f != null) measured.push({ case_number: c.case_number, volume: r2(f - e) });
  });
  measured.sort((a, b) => a.volume - b.volume);
  const groups = [];
  let current = [];
  measured.forEach((m) => {
    if (current.length === 0) { current = [m]; return; }
    if (r3(m.volume - current[0].volume) <= max_spread) current.push(m);
    else { groups.push(current); current = [m]; }
  });
  if (current.length) groups.push(current);
  const result = groups.map((g, i) => {
    const vols = g.map((x) => x.volume);
    return {
      group: i + 1,
      case_numbers: g.map((x) => x.case_number),
      count: g.length,
      min_volume: Math.min(...vols),
      max_volume: Math.max(...vols),
      avg_volume: r2(vols.reduce((a, b) => a + b, 0) / vols.length),
      spread: r2(Math.max(...vols) - Math.min(...vols)),
    };
  });
  return { groups: result, total_cases: measured.length };
}

export function chargeLadder({ start, end, step = 0.3 }) {
  const s = n(start), e = n(end);
  const charges = [];
  if (s == null) return { charges: [] };
  if (e == null || e < s) return { charges: [r3(s)] };
  const count = Math.round((e - s) / step) + 1;
  for (let i = 0; i < count; i++) charges.push(r3(s + i * step));
  return { charges };
}

export function seatingLadder({ max_cbto, bullet_type = "hybrid", step = 0.003, max_jump = 0.030 }) {
  const m = n(max_cbto);
  const steps = Math.round(max_jump / step);
  const jam = [];
  if ((bullet_type || "").toLowerCase() === "vld") {
    const jamSteps = Math.round(0.015 / step);
    for (let i = jamSteps; i >= 1; i--) {
      const offset = r3(i * step);
      jam.push({ offset, cbto: r3(m + offset), label: `+${offset.toFixed(3)} (en estría)` });
    }
  }
  const entries = [];
  for (let i = 0; i <= steps; i++) {
    const offset = r3(-i * step);
    const label = i === 0 ? "0.000 (toque)" : `${offset.toFixed(3)} (salto)`;
    entries.push({ offset, cbto: r3(m + offset), label });
  }
  return { entries: [...jam, ...entries] };
}

export function primerLadder({ pocket_depth, primer_height, step = 0.002, groups = 6 }) {
  const base = r3(n(pocket_depth) - n(primer_height));
  const entries = [];
  for (let i = 0; i < groups; i++) {
    const pretension = i === 0 ? 0 : r3(i * step);
    entries.push({ group: i + 1, pretension, seating_depth: r3(base + pretension) });
  }
  return { base_depth: base, entries };
}

export function recommend({ mode = "both", entries }) {
  const explanation = [];
  const velocityBest = () => {
    const scored = entries.filter((e) => e.es != null && e.sd != null).map((e) => [e.charge, e.es + e.sd]);
    if (!scored.length) return [];
    scored.sort((a, b) => a[1] - b[1]);
    const best = scored[0][1];
    return scored.filter(([, s]) => s <= best + 0.01).map(([c]) => c);
  };
  const ocwWindow = () => {
    const pts = entries.filter((e) => e.ocw_y != null).map((e) => [e.charge, e.ocw_y]);
    if (pts.length < 3) return [[], null];
    let best = null;
    for (let i = 0; i < pts.length - 2; i++) {
      const w = pts.slice(i, i + 3);
      const ys = w.map((x) => x[1]);
      const rng = Math.max(...ys) - Math.min(...ys);
      if (best == null || rng < best.rng) best = { rng, w };
    }
    return [best.w.map((x) => x[0]), r2(best.rng)];
  };

  let recommended = [];
  if (mode === "velocity") {
    recommended = velocityBest();
    explanation.push("Cargas con menor ES + SD combinados.");
  } else if (mode === "ocw") {
    const [win, rng] = ocwWindow();
    recommended = win;
    explanation.push(`Nodo OCW con menor variación vertical de impactos (${rng} mm).`);
  } else {
    const [win, rng] = ocwWindow();
    const vel = velocityBest();
    if (win.length) {
      const inter = vel.length ? win.filter((c) => vel.includes(c)) : win;
      recommended = inter.length ? inter : win;
      explanation.push(`Nodo OCW (variación ${rng} mm)` + (inter.length ? " cruzado con mejor ES/SD." : "."));
    } else {
      recommended = vel;
      explanation.push("Sin datos OCW suficientes; se usó ES + SD.");
    }
  }
  return { recommended_charges: recommended, explanation: explanation.join(" ") };
}
