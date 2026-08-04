import { SITE } from "@/app/lib/seo";

/* Renders a JSON-LD <script> block. `data` is JSON.stringify'd directly — callers must only pass
 * trusted/generated schema objects, never raw user input, since this is not HTML-escaped. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.baseUrl,
    logo: `${SITE.baseUrl}/favicon.ico`,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.baseUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE.baseUrl}${item.path}`,
    })),
  };
}

export function webPageJsonLd(opts: { name: string; description: string; path: string; schemaType?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": opts.schemaType || "WebPage",
    name: opts.name,
    description: opts.description,
    url: `${SITE.baseUrl}${opts.path}`,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.baseUrl },
  };
}
