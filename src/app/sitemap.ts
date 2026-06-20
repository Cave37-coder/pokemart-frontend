import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.pokebulk.co.za";
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app";

// Generate this on request (cached per REVALIDATE_SECONDS below), not at build time.
// The product catalog is large enough that paginating it synchronously during
// `vercel --prod` exceeds the build's per-route time budget and fails the deploy.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 500; // upper bound we ask the API for; harmless if the API ignores it
const CONCURRENCY = 10; // how many page requests to run in parallel
const REVALIDATE_SECONDS = 3600; // cache each page fetch for an hour

interface ProductListItem {
  id: number;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductListItem[];
}

async function fetchPage(url: string): Promise<PaginatedResponse | null> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.error(`sitemap: ${url} returned ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`sitemap: failed to fetch ${url}`, err);
    return null;
  }
}

async function getAllProductIds(): Promise<number[]> {
  const firstUrl = `${API_URL}/api/products/?page_size=${PAGE_SIZE}`;
  const firstPage = await fetchPage(firstUrl);

  if (!firstPage) return [];

  const ids: number[] = firstPage.results.map((p) => p.id);

  if (!firstPage.next) {
    return ids; // everything fit on one page
  }

  const effectivePageSize = firstPage.results.length || PAGE_SIZE;
  const totalPages = Math.ceil(firstPage.count / effectivePageSize);

  // Try to build remaining page URLs directly by swapping the page number,
  // so we can fetch them all in parallel batches instead of waiting on
  // `next` one response at a time.
  const pageParamMatch = firstPage.next.match(/([?&]page=)(\d+)/);

  if (pageParamMatch && totalPages > 1) {
    const remainingUrls: string[] = [];
    for (let page = 2; page <= totalPages; page++) {
      remainingUrls.push(firstPage.next.replace(/([?&]page=)\d+/, `$1${page}`));
    }

    for (let i = 0; i < remainingUrls.length; i += CONCURRENCY) {
      const batch = remainingUrls.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(fetchPage));
      for (const page of results) {
        if (page) {
          ids.push(...page.results.map((p) => p.id));
        }
      }
    }

    return ids;
  }

  // Fallback: pagination isn't simple numbered `page=`, e.g. cursor-based.
  // Follow `next` sequentially since we can't predict future URLs.
  let next: string | null = firstPage.next;
  while (next) {
    const page = await fetchPage(next);
    if (!page) break;
    ids.push(...page.results.map((p) => p.id));
    next = page.next;
  }

  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/cards`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/bundles`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/checklists`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/decklist`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/sell`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const productIds = await getAllProductIds();

  const productRoutes: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${SITE_URL}/cards/${id}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
