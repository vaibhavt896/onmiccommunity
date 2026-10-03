import { ImageResponse } from "next/og";
import { currentPublicJam } from "@/lib/jam";
import { chipDate, timeOf } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "On Mic Community: open mic + jam nights, Kanpur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Open Graph / Twitter card with the logo and the live jam date. */
export default async function OgImage() {
  const jam = await currentPublicJam().catch(() => null);
  const date = jam ? `${chipDate(jam.startsAt)} · ${timeOf(jam.startsAt)}` : "NEXT JAM SOON";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64,
        background: "linear-gradient(180deg,#4a16d6,#2a0c7a 60%,#0d0616)", color: "#fff3e2", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 110, height: 110, borderRadius: 999, background: "#a19fab", border: "6px solid #0d0616", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "#0d0616", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: 999, background: "#c6ff3d" }} />
            </div>
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>ON MIC COMMUNITY</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 128, fontWeight: 900, lineHeight: 0.9, letterSpacing: -2 }}>
          <span>GET ON THE MIC.</span>
          <span style={{ color: "#ff2e93" }}>YOUR TURN.</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ background: "#c6ff3d", color: "#0d0616", border: "5px solid #0d0616", borderRadius: 999, padding: "14px 32px", fontSize: 38, fontWeight: 900 }}>{date}</div>
          <div style={{ background: "#fff3e2", color: "#0d0616", border: "5px solid #0d0616", borderRadius: 999, padding: "14px 32px", fontSize: 38, fontWeight: 900 }}>{`KANPUR · ${jam?.capacity ?? 50} SEATS`}</div>
        </div>
      </div>
    ),
    size,
  );
}
