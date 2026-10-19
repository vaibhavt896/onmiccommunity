/**
 * The official On Mic Community logo (transparent, white lettering), so it
 * only belongs on dark or violet surfaces. 3:2 artwork with built-in clear
 * space: `size` is the rendered height in px, the width follows the ratio.
 */
export function Logo({ size = 48, className = "", priority = false }: { size?: number; className?: string; priority?: boolean }) {
  const width = Math.round(size * 1.5);
  const sizes = `${width}px`;
  const set = (ext: string) => [240, 480, 768, 1024].map((w) => `/brand/onmic-logo-${w}.${ext} ${w}w`).join(", ");
  return (
    <picture>
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src="/brand/onmic-logo-480.png"
        srcSet={set("png")}
        sizes={sizes}
        width={width}
        height={size}
        alt="On Mic Community"
        className={`block max-w-none ${className}`}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </picture>
  );
}
