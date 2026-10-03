import type { Metadata } from "next";
import { chipDate, timeOf } from "./format";
import { SITE_URL } from "./public-config";
import type { PublicJam } from "./types";

export function jamMetadata(jam: PublicJam | null, path = "/"): Metadata {
  const when = jam ? `${chipDate(jam.startsAt)} · ${timeOf(jam.startsAt)}` : "Next jam soon";
  const title = jam ? `${jam.title}, ${when} · Kanpur` : "On Mic Community · Open mic + jam nights, Kanpur";
  const description = jam
    ? `Open mic + jam night in Kanpur, ${when}. Rs ${jam.price} for entry plus a mocktail. Only ${jam.capacity} seats, prepaid. Venue revealed after booking.`
    : "Open mic and jam nights in Kanpur for everyone who has something to say (or sing, or spit).";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", url: `${SITE_URL}${path}`, siteName: "On Mic Community", title, description, locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Event structured data. Deliberately has no venue: it's secret. */
export function EventJsonLd({ jam }: { jam: PublicJam | null }) {
  if (!jam) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${jam.title} · On Mic Community`,
    description: "Open mic + jam night: sing, rap, poetry, stand-up, or just vibe. Venue revealed to ticket holders.",
    startDate: jam.startsAt,
    endDate: new Date(new Date(jam.startsAt).getTime() + 3 * 3600_000).toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Secret venue in Kanpur (revealed after booking)",
      address: { "@type": "PostalAddress", addressLocality: "Kanpur", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
    },
    image: [`${SITE_URL}/opengraph-image`],
    organizer: { "@type": "Organization", name: "On Mic Community", url: SITE_URL },
    offers: {
      "@type": "Offer",
      price: jam.price,
      priceCurrency: "INR",
      availability: jam.sale === "open" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      validThrough: jam.cutoffAt,
      url: `${SITE_URL}/book`,
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
