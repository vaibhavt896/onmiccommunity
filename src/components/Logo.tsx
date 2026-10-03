/**
 * PLACEHOLDER mark drawn from the brief's description: a grey circular
 * vinyl badge, the "O" as a record, music notes forming the "M", and
 * "Community" in script. Swap for Vaibhav's final SVG when it arrives.
 */
export function Logo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} role="img" aria-label="On Mic Community">
      <circle cx="60" cy="60" r="57" fill="#a19fab" stroke="#0d0616" strokeWidth="4" />
      <circle cx="60" cy="60" r="49" fill="none" stroke="#0d0616" strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* O = record */}
      <circle cx="38" cy="50" r="19" fill="#0d0616" />
      <circle cx="38" cy="50" r="15" fill="none" stroke="#3b3346" strokeWidth="1.2" />
      <circle cx="38" cy="50" r="11" fill="none" stroke="#3b3346" strokeWidth="1.2" />
      <circle cx="38" cy="50" r="6" fill="#c6ff3d" />
      <circle cx="38" cy="50" r="1.6" fill="#0d0616" />
      {/* M = two notes joined by a V */}
      <path d="M66 64 V33 L78 50 L90 33 V64" fill="none" stroke="#0d0616" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="62" cy="66" rx="6.5" ry="5" transform="rotate(-22 62 66)" fill="#0d0616" />
      <ellipse cx="86" cy="66" rx="6.5" ry="5" transform="rotate(-22 86 66)" fill="#0d0616" />
      <text x="60" y="96" textAnchor="middle" fontSize="19" fill="#0d0616" style={{ fontFamily: "var(--font-instrument), Georgia, serif", fontStyle: "italic" }}>
        Community
      </text>
    </svg>
  );
}
