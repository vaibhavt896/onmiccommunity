const TZ = "Asia/Kolkata";

/** "SAT 10 OCT" */
export function chipDate(iso: string): string {
  const d = new Date(iso);
  const wd = d.toLocaleDateString("en-IN", { weekday: "short", timeZone: TZ });
  const day = d.toLocaleDateString("en-IN", { day: "numeric", timeZone: TZ });
  const mon = d.toLocaleDateString("en-IN", { month: "short", timeZone: TZ });
  return `${wd} ${day} ${mon}`.toUpperCase();
}

/** "6:00 PM" */
export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).toUpperCase();
}

/** "Sat, 10 Oct, 6:00 PM" */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ,
  });
}

/** ISO → "2026-10-10T18:00" in IST, for <input type="datetime-local">. */
export function toIstInput(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

/** "2026-10-10T18:00" typed in IST → ISO. */
export function fromIstInput(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function passLabel(passNo: string): string {
  return `OM-${passNo}`;
}
