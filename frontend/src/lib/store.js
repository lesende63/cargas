// Local-first project store (localStorage). Works fully offline.
import { CALIBER_PRESETS } from "./presets";

const KEY = "fclass_projects";

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
};
const write = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "p_" + Date.now() + "_" + Math.random().toString(36).slice(2));

export function listProjects() {
  return read().sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
}

export function getProject(id) {
  return read().find((p) => p.id === id) || null;
}

export function createProject(body) {
  const preset = CALIBER_PRESETS[body.caliber] || {};
  const now = new Date().toISOString();
  const project = {
    id: uid(),
    caliber: body.caliber,
    case_brand: body.case_brand,
    case_lot: body.case_lot,
    bullet_diameter: body.bullet_diameter != null ? body.bullet_diameter : (preset.bullet_diameter ?? null),
    headspace_datum: body.headspace_datum != null ? body.headspace_datum : (preset.headspace_datum ?? null),
    data: {},
    created_at: now,
    updated_at: now,
  };
  const arr = read();
  arr.push(project);
  write(arr);
  return project;
}

export function updateProject(id, body) {
  const arr = read();
  const idx = arr.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const cur = arr[idx];
  const next = { ...cur };
  ["caliber", "case_brand", "case_lot", "bullet_diameter", "headspace_datum"].forEach((k) => {
    if (body[k] !== undefined && body[k] !== null) next[k] = body[k];
  });
  if (body.data) next.data = { ...cur.data, ...body.data };
  next.updated_at = new Date().toISOString();
  arr[idx] = next;
  write(arr);
  return next;
}

export function deleteProject(id) {
  write(read().filter((p) => p.id !== id));
  return { deleted: true };
}
