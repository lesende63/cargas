// All ballistic calculations run locally in the browser (offline-capable).
const SPRING_BACK = 0.001;
const HEADSPACE_REDUCTION = 0.002;

const r3 = (x) => Math.round(x * 1000) / 1000;
const r4 = (x) => Math.round(x * 10000) / 10000;
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
  const raw_expander = bushing_recommended + t / 2;
  const raw_expander_3dp = r3(raw_expander);
  const has_fourth_decimal = Math.abs(raw_expander - raw_expander_3dp) > 1e-9;
  // Only when the result needs a 4th decimal do we snap to 0.0005 steps;
  // otherwise it is simply the bushing plus half the desired tension.
  const expander_recommended = has_fourth_decimal
    ? r4(Math.round(raw_expander / 0.0005) * 0.0005)
    : raw_expander_3dp;
  const estimated_tension = r4(expander_recommended - bushing_recommended);
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
    const rows = entries.map((e) => ({
      charge: e.charge,
      x: e.ocw_x, y: e.ocw_y, g: e.ocw_group,
      has: (e.ocw_x != null && e.ocw_y != null) || e.ocw_group != null,
    }));
    let best = null;
    for (let i = 0; i < rows.length - 2; i++) {
      const w = rows.slice(i, i + 3);
      if (!w.every((r) => r.has)) continue;
      const xs = w.filter((r) => r.x != null).map((r) => r.x);
      const ys = w.filter((r) => r.y != null).map((r) => r.y);
      const gs = w.filter((r) => r.g != null).map((r) => r.g);
      const h = xs.length ? Math.max(...xs) - Math.min(...xs) : null;
      const v = ys.length ? Math.max(...ys) - Math.min(...ys) : null;
      const avgG = gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null;
      const score = (h || 0) + (v || 0) + (avgG || 0);
      if (best == null || score < best.score) {
        best = { score, h: h != null ? r2(h) : null, v: v != null ? r2(v) : null, g: avgG != null ? r2(avgG) : null, w };
      }
    }
    if (best == null) return [[], null];
    return [best.w.map((r) => r.charge), { h: best.h, v: best.v, g: best.g }];
  };

  const ocwDesc = (m) => {
    const parts = [];
    if (m.h != null) parts.push(`H ${m.h} mm`);
    if (m.v != null) parts.push(`V ${m.v} mm`);
    if (m.g != null) parts.push(`grupo ${m.g} mm c-c`);
    return parts.join(" / ");
  };

  let recommended = [];
  if (mode === "velocity") {
    recommended = velocityBest();
    explanation.push("Cargas con menor ES + SD combinados.");
  } else if (mode === "ocw") {
    const [win, m] = ocwWindow();
    recommended = win;
    if (m) explanation.push(`Nodo OCW: menor dispersión (${ocwDesc(m)}).`);
    else explanation.push("Marca impactos o anota el tamaño de grupo c-c en al menos 3 cargas consecutivas.");
  } else {
    const [win, m] = ocwWindow();
    const vel = velocityBest();
    if (win.length) {
      const inter = vel.length ? win.filter((c) => vel.includes(c)) : win;
      recommended = inter.length ? inter : win;
      explanation.push(`Nodo OCW (${ocwDesc(m)})` + (inter.length ? " cruzado con mejor ES/SD." : "."));
    } else {
      recommended = vel;
      explanation.push("Sin datos OCW suficientes; se usó ES + SD.");
    }
  }
  return { recommended_charges: recommended, explanation: explanation.join(" ") };
}
