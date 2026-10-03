import { reducedMotion } from "@/lib/track";

const COLORS = ["#c6ff3d", "#ff2e93", "#47d7ff", "#ff7a2f", "#6b2cff", "#fff3e2"];

/** ~34 pieces over 1.4s, transform + opacity only. Skipped for reduced motion. */
export function confetti(count = 34, duration = 1400) {
  if (reducedMotion() || typeof document === "undefined") return;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:80;overflow:hidden";
  document.body.appendChild(layer);
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    const w = 7 + Math.random() * 8;
    p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:${w}px;height:${w * (Math.random() > 0.5 ? 0.45 : 1)}px;` +
      `background:${COLORS[i % COLORS.length]};border:2px solid #0d0616;border-radius:${Math.random() > 0.6 ? "99px" : "2px"}`;
    layer.appendChild(p);
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 220;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 120;
    p.animate(
      [
        { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.1}px,${dy + 260}px) rotate(${Math.random() * 900}deg)`, opacity: 0 },
      ],
      { duration: duration * (0.8 + Math.random() * 0.2), easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" },
    );
  }
  setTimeout(() => layer.remove(), duration + 200);
}
