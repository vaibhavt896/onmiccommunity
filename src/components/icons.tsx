type P = { className?: string; size?: number };

export const Arrow = ({ className = "", size = 26 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Lock = ({ className = "", size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="3" fill="currentColor" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" />
  </svg>
);

export const Plus = ({ className = "", size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

export const Chevron = ({ className = "", size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Close = ({ className = "", size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

export const Instagram = ({ className = "", size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <circle cx="17.5" cy="6.5" r="1.4" fill="currentColor" />
  </svg>
);

export const WhatsApp = ({ className = "", size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M9 8.5c0 3 2.5 6.5 6.5 6.5l1-1.6-2-1-1 1c-1.2-.5-2.4-1.7-2.9-2.9l1-1-1-2L9 8.5z" fill="currentColor" />
  </svg>
);
