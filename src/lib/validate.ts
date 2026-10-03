export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const n = raw.trim().replace(/\s+/g, " ");
  return n.length >= 2 && n.length <= 40 ? n : null;
}

/** Indian mobile, stored as bare 10 digits (+91 is implied). */
export function cleanPhone(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export function cleanInstagram(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return "";
  if (typeof raw !== "string") return null;
  const h = raw.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  if (h === "") return "";
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : null;
}

/** UPI reference (UTR / RRN) is 12 digits. */
export function cleanUtr(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const d = String(raw).replace(/\s/g, "");
  return /^\d{12}$/.test(d) ? d : null;
}

export function cleanText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

export function cleanUtm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase().slice(0, 60);
  return /^[a-z0-9._\-]+$/.test(v) ? v : null;
}

export const ACTS = ["SING", "RAP", "POETRY", "STAND-UP", "GUITAR / KEYS", "BEATBOX", "JUST VIBE"] as const;
