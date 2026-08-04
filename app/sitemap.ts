import type { MetadataRoute } from "next";
import { SITE, getSitemapRows } from "@/app/lib/seo";

const FREQ: Record<string, MetadataRoute.Sitemap[number]["changeFrequency"]> = {
  always: "always", hourly: "hourly", daily: "daily", weekly: "weekly",
  monthly: "monthly", yearly: "yearly", never: "never",
};

/* Served at /sitemap.xml — driven entirely by seo_pages (include_in_sitemap = 1). Only public
 * marketing routes are ever seeded there; the authenticated corporate app is never included. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await getSitemapRows();
  return rows.map(row => ({
    url: `${SITE.baseUrl}${row.route}`,
    lastModified: new Date(row.updated_at),
    changeFrequency: FREQ[row.change_frequency] ?? "monthly",
    priority: Number(row.page_priority),
  }));
}
