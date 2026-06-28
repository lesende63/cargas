export const inch = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(3) + '"');
export const gr = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(2) + " gr");
export const ms = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(1));
export const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
