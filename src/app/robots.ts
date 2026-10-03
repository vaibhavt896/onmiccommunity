import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/door", "/counter", "/login", "/pass/", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
