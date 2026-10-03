import QRCode from "qrcode";
import type { PassView } from "@/lib/types";
import { chipDate, longDate, passLabel, timeOf } from "@/lib/format";
import { TIER_LABEL } from "@/lib/types";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** "Add to calendar": an .ics with the venue in the description. */
export function downloadIcs(v: PassView, passUrl: string) {
  const start = new Date(v.jam.startsAt);
  const end = new Date(start.getTime() + 3 * 3600_000);
  const desc = [
    `Pass ${passLabel(v.passNo)} for ${v.name}.`,
    v.venue ? `Venue: ${v.venue.name}` : "Venue: revealed in your pass once payment is verified.",
    v.venue?.mapUrl ? `Maps: ${v.venue.mapUrl}` : "",
    `Your pass: ${passUrl}`,
    "Show the QR at the door. 1 mocktail token included.",
  ].filter(Boolean).join("\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//On Mic Community//Pass//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${v.passNo}-${start.getTime()}@onmic`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(v.jam.title)} · On Mic Community`,
    `LOCATION:${icsEscape(v.venue ? v.venue.name : "Kanpur (venue in your pass)")}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `URL:${passUrl}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  download(new Blob([ics], { type: "text/calendar;charset=utf-8" }), `onmic-${v.passNo}.ics`);
}

function font(varName: string, fallback: string) {
  const f = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return f || fallback;
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** "Save to phone": draws the pass card to a PNG (no screenshot library). */
export async function downloadPng(v: PassView, token: string) {
  await document.fonts?.ready;
  const W = 720, H = 1180;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d")!;
  const anton = font("--font-anton", "Impact");
  const mono = font("--font-spacemono", "monospace");
  const body = font("--font-dmsans", "sans-serif");

  c.fillStyle = "#6b2cff";
  c.fillRect(0, 0, W, H);
  c.fillStyle = "#0d0616";
  roundRect(c, 52, 52, W - 88, H - 88, 36);
  c.fill();
  c.fillStyle = "#fff3e2";
  c.strokeStyle = "#0d0616";
  c.lineWidth = 6;
  roundRect(c, 36, 36, W - 88, H - 88, 36);
  c.fill();
  c.stroke();

  c.fillStyle = "#0d0616";
  c.font = `700 22px ${mono}`;
  c.fillText("ON MIC COMMUNITY · PASS", 76, 100);
  c.font = `400 92px ${anton}`;
  c.fillText(passLabel(v.passNo), 76, 196);
  c.font = `700 30px ${body}`;
  c.fillText(v.name, 76, 246);
  c.font = `700 22px ${mono}`;
  c.fillText(`${TIER_LABEL[v.tier].toUpperCase()} · 1 SEAT · + MOCKTAIL`, 76, 286);

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, token, { width: 420, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0d0616", light: "#ffffff" } });
  c.fillStyle = "#fff";
  roundRect(c, 150, 320, 420, 420, 20);
  c.fill();
  c.drawImage(qr, 150, 320, 420, 420);
  c.lineWidth = 5;
  roundRect(c, 150, 320, 420, 420, 20);
  c.stroke();

  c.setLineDash([14, 10]);
  c.beginPath();
  c.moveTo(70, 790);
  c.lineTo(W - 122, 790);
  c.stroke();
  c.setLineDash([]);

  c.font = `400 76px ${anton}`;
  c.fillText(`${chipDate(v.jam.startsAt)} · ${timeOf(v.jam.startsAt)}`, 76, 880);
  c.font = `700 22px ${mono}`;
  c.fillText("VENUE", 76, 940);
  c.font = `700 32px ${body}`;
  c.fillText(v.venue?.name ?? "Unlocks after payment check", 76, 982, W - 200);
  c.font = `400 22px ${body}`;
  c.fillText(longDate(v.jam.startsAt), 76, 1024);
  c.font = `700 20px ${mono}`;
  c.fillText("SHOW THIS QR AT THE DOOR · ONE-TIME ENTRY", 76, 1080);

  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/png"));
  if (blob) download(blob, `onmic-pass-${v.passNo}.png`);
}
