/**
 * Landing-page copy and media. Items marked PLACEHOLDER must be replaced
 * with real content before launch (brief §10).
 */

export const STATS = [
  { value: 60, prefix: "", suffix: "+", label: "humans on a normal jam night", bg: "bg-orange", r: -2.5 },
  { value: 10, prefix: "", suffix: "K", label: "average reel views", bg: "bg-sky", r: 2 },
  // The price card reads the live jam price; `value` here is overwritten.
  { value: 0, prefix: "Rs ", suffix: "", label: "for entry plus a mocktail", bg: "bg-lime", r: -1.5 },
] as const;

export const STEPS = [
  { n: "01", icon: "/steps/book.svg", title: "Book your seat", sub: "UPI, no app.", color: "text-lime" },
  { n: "02", icon: "/steps/pass.svg", title: "Get your QR pass", sub: "Venue revealed inside.", color: "text-magenta" },
  { n: "03", icon: "/steps/scan.svg", title: "Scan. Sip. Shine.", sub: "One scan at the door. Mocktail included.", color: "text-sky" },
] as const;

/**
 * The vibes wall. Each tile takes a still (`image`, with its pixel `size`) or a muted
 * loop (`video` + `poster`, under 1.5 MB). The gradient is the fallback underneath.
 * Stills are generated promotional scenes inspired by the community, not event records.
 */
export type VibeTile = { key: string; label: string; cls: string; gradient: string; image?: string; size?: [number, number]; video?: string; poster?: string; live?: boolean };
export const VIBES: VibeTile[] = [
  { key: "crowd", image: "/vibes/crowd.webp", size: [1600, 1280], label: "The crowd", cls: "t-crowd", live: true,
    gradient: "radial-gradient(60% 50% at 30% 30%, #ff2e93 0%, transparent 70%), radial-gradient(50% 60% at 80% 80%, #6b2cff 0%, transparent 70%), linear-gradient(160deg, #3a12a8, #0d0616)" },
  { key: "drop", image: "/vibes/drop.webp", size: [1200, 1200], label: "Mic drop", cls: "t-drop",
    gradient: "radial-gradient(70% 60% at 70% 20%, #ff7a2f 0%, transparent 70%), linear-gradient(200deg, #ff2e93, #3a12a8)" },
  { key: "jam", image: "/vibes/jam.webp", size: [1200, 1200], label: "Live jam", cls: "t-jam",
    gradient: "radial-gradient(70% 60% at 20% 80%, #47d7ff 0%, transparent 70%), linear-gradient(20deg, #6b2cff, #0d0616)" },
  { key: "open", image: "/vibes/open.webp", size: [2000, 1000], label: "Open stage. Open hearts.", cls: "t-open",
    gradient: "radial-gradient(50% 80% at 85% 50%, #c6ff3d 0%, transparent 65%), linear-gradient(90deg, #3a12a8, #ff2e93)" },
];

export const ACT_ROTATIONS = [-3, 2, -1.5, 3, -2, 1.5, -2.5];

/** PLACEHOLDER: invented quotes. Replace with real ones (with permission). */
export const QUOTES = [
  { text: "Came to watch. Ended up singing. No regrets.", who: "Riya, first-timer", bg: "bg-lime", r: -3 },
  { text: "The only room in Kanpur where my poetry gets a standing ovation.", who: "Aman, poet", bg: "bg-sky", r: 2.5 },
  { text: "Walked in alone, walked out with 20 new friends.", who: "Sneha, regular", bg: "bg-orange", r: -1.5 },
];

export const FAQS = [
  {
    q: "Where is the venue?",
    a: "It's a secret until you book. Once your payment is verified, the venue name and a maps link appear inside your QR pass. It's always somewhere in Kanpur, always a good cafe.",
  },
  {
    q: "Can I bring a friend?",
    a: "Yes, but every friend books their own seat. One seat is one person, and each WhatsApp number can hold one seat, so your friend grabs theirs with their own number.",
  },
  {
    q: "How do I pay?",
    a: "Straight UPI to the community account: scan the QR or tap Open UPI app, then paste your 12-digit UPI reference (UTR). No app to install, no gateway fees. It's prepay only and bookings close before the jam, so there's no paying at the venue.",
  },
  {
    q: "Do I have to perform?",
    a: "Not at all. Half the room comes to listen, cheer and vibe. Want the mic? Claim a stage slot and we'll line you up.",
  },
];

/** PLACEHOLDER wording: refund and cancellation line (brief §10, needs the core team). */
export const REFUND_LINE =
  "Seats are non-refundable once your pass is confirmed. If we cancel the jam, you get a full refund.";
