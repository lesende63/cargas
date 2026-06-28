import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

export const api = {
  presets: () => http.get("/caliber-presets").then((r) => r.data),
  listProjects: () => http.get("/projects").then((r) => r.data),
  getProject: (id) => http.get(`/projects/${id}`).then((r) => r.data),
  createProject: (body) => http.post("/projects", body).then((r) => r.data),
  updateProject: (id, body) => http.put(`/projects/${id}`, body).then((r) => r.data),
  deleteProject: (id) => http.delete(`/projects/${id}`).then((r) => r.data),
  bushing: (body) => http.post("/calc/bushing", body).then((r) => r.data),
  headspace: (body) => http.post("/calc/headspace", body).then((r) => r.data),
  volumeGroups: (body) => http.post("/calc/volume-groups", body).then((r) => r.data),
  groupStats: (body) => http.post("/calc/group-stats", body).then((r) => r.data),
  chargeLadder: (body) => http.post("/calc/charge-ladder", body).then((r) => r.data),
  seatingLadder: (body) => http.post("/calc/seating-ladder", body).then((r) => r.data),
  primerLadder: (body) => http.post("/calc/primer-ladder", body).then((r) => r.data),
  recommend: (body) => http.post("/calc/recommend-charge", body).then((r) => r.data),
  powderData: (body) => http.post("/powder-data", body).then((r) => r.data),
};
