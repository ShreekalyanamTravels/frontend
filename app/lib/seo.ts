import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";
import pool from "@/app/lib/db";

// Site-wide defaults — used both as the base for every page's Metadata object and as the
// fallback when a page's row hasn't been seeded into seo_pages yet.
export const SITE = {
  name: "Shree Kalyanam",
  baseUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  defaultTitle: "Shree Kalyanam | Corporate Travel Management Company in India",
  defaultDescription: "India's trusted corporate travel management partner — flight bookings, hotels, visas, and ground transport with 24/7 support and negotiated corporate fares.",
  defaultOgImage: "/og-default.png",
  twitterHandle: "@ShreeKalyanam",
  locale: "en_IN",
};

export interface SeoPageRow extends RowDataPacket {
  page_key: string;
  route: string;
  seo_title: string;
  meta_description: string;
  meta_keywords: string | null;
  canonical_url: string | null;
  robots_index: number;
  robots_follow: number;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  schema_type: string;
  breadcrumb_title: string | null;
  page_priority: string;
  change_frequency: string;
  include_in_sitemap: number;
  published_at: string | null;
  updated_at: string;
}

const TTL_MS = 5 * 60 * 1000;
declare global {
  // eslint-disable-next-line no-var
  var _seoPageCache: Map<string, { row: SeoPageRow | null; expires: number }> | undefined;
}
function cache(): Map<string, { row: SeoPageRow | null; expires: number }> {
  if (!global._seoPageCache) global._seoPageCache = new Map();
  return global._seoPageCache;
}

/* Looks up a page's editable SEO fields by its stable page_key (not the URL — keys don't change
 * even if a route is renamed). Returns null if the page hasn't been seeded yet, so callers can
 * fall back to site defaults rather than failing to render. */
export async function getPageSeo(pageKey: string): Promise<SeoPageRow | null> {
  const cached = cache().get(pageKey);
  if (cached && cached.expires > Date.now()) return cached.row;

  const [rows] = await pool.query<SeoPageRow[]>(
    "SELECT * FROM seo_pages WHERE page_key = ? LIMIT 1",
    [pageKey]
  );
  const row = rows[0] ?? null;
  cache().set(pageKey, { row, expires: Date.now() + TTL_MS });
  return row;
}

/* Every row that should appear in /sitemap.xml, ordered by priority. */
export async function getSitemapRows(): Promise<SeoPageRow[]> {
  const [rows] = await pool.query<SeoPageRow[]>(
    "SELECT * FROM seo_pages WHERE include_in_sitemap = 1 ORDER BY page_priority DESC"
  );
  return rows;
}

/* Builds a Next.js Metadata object for a page from its seo_pages row (or site defaults if the
 * row is null/unseeded). `route` is the page's path (e.g. "/about") used for the canonical URL
 * and og:url when the row doesn't specify its own canonical_url. */
export function buildMetadata(row: SeoPageRow | null, route: string): Metadata {
  const title = row?.seo_title || SITE.defaultTitle;
  const description = row?.meta_description || SITE.defaultDescription;
  const canonical = row?.canonical_url || `${SITE.baseUrl}${route}`;
  const ogImage = row?.og_image || SITE.defaultOgImage;
  const index = row ? !!row.robots_index : true;
  const follow = row ? !!row.robots_follow : true;

  return {
    // Absolute: every seo_pages.seo_title is a CMS-authored, already-complete title (it already
    // includes the brand name where wanted) — it must not also get the root layout's "%s | Site"
    // template appended, or the site name ends up duplicated.
    title: { absolute: title },
    description,
    keywords: row?.meta_keywords || undefined,
    authors: [{ name: SITE.name }],
    alternates: { canonical },
    robots: {
      index, follow,
      googleBot: { index, follow, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      title: row?.og_title || title,
      description: row?.og_description || description,
      url: canonical,
      siteName: SITE.name,
      images: [{ url: ogImage }],
      locale: SITE.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: row?.twitter_title || title,
      description: row?.twitter_description || description,
      images: [row?.twitter_image || ogImage],
      site: SITE.twitterHandle,
    },
  };
}

/* Convenience wrapper for the common case: fetch-then-build in one call. */
export async function getMetadataFor(pageKey: string, route: string): Promise<Metadata> {
  const row = await getPageSeo(pageKey);
  return buildMetadata(row, route);
}
