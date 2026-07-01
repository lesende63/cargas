export const inch = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(3) + '"');
// Shows up to 4 decimals when needed, keeping at least 3 (trailing zeros trimmed after the 3rd).
export const inch4 = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  let s = Number(v).toFixed(4).replace(/(\.\d{3}\d*?)0+$/, "$1");
  return s + '"';
};
export const gr = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(2) + " gr");
export const ms = (v) => (v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(1));
export const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
