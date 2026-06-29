// Local-first API. Calculations + persistence run offline in the browser.
// Only powder-data (AI) requires the network; UI offers a manual fallback.
import { CALIBER_PRESETS } from "./presets";
import * as calc from "./calc";
import * as store from "./store";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const ok = (v) => Promise.resolve(v);

export const api = {
  presets: () => ok({ presets: CALIBER_PRESETS }),
  listProjects: () => ok(store.listProjects()),
  getProject: (id) => ok(store.getProject(id)),
  createProject: (b) => ok(store.createProject(b)),
  updateProject: (id, b) => ok(store.updateProject(id, b)),
  deleteProject: (id) => ok(store.deleteProject(id)),
  exportProjects: () => store.exportProjects(),
  importProjects: (arr) => store.importProjects(arr),

  bushing: (b) => ok(calc.bushing(b)),
  headspace: (b) => ok(calc.headspace(b)),
  volumeGroups: (b) => ok(calc.volumeGroups(b)),
  groupStats: (b) => ok(calc.groupStats(b.velocities)),
  chargeLadder: (b) => ok(calc.chargeLadder(b)),
  seatingLadder: (b) => ok(calc.seatingLadder(b)),
  primerLadder: (b) => ok(calc.primerLadder(b)),
  recommend: (b) => ok(calc.recommend(b)),

  // Requires internet (AI). We do NOT trust navigator.onLine (unreliable in PWA);
  // we attempt the request and only fail if the network call itself fails.
  powderData: async (b) => {
    const resp = await fetch(`${API}/powder-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    if (!resp.ok) throw new Error("powder-data failed");
    return resp.json();
  },
};
