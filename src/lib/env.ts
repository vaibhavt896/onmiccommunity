import "server-only";

function need(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`[env] Missing ${name}. See .env.example.`);
  return v;
}

export const env = {
  get DATABASE_URL() { return need("DATABASE_URL"); },
  get TOKEN_SECRET() {
    const s = need("TOKEN_SECRET");
    if (s.length < 32) throw new Error("[env] TOKEN_SECRET must be at least 32 characters");
    return s;
  },
  get STAFF_PIN_SALT() { return need("STAFF_PIN_SALT"); },
  get SITE_URL() { return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, ""); },
};
