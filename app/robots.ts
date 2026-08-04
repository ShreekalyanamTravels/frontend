import type { MetadataRoute } from "next";
import { SITE } from "@/app/lib/seo";

/* Served at /robots.txt. The corporate app is disallowed outright — it's an authenticated
 * booking dashboard holding customer/financial data, never meant to be publicly indexed. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/corporate/", "/api/"],
      },
    ],
    sitemap: `${SITE.baseUrl}/sitemap.xml`,
  };
}
