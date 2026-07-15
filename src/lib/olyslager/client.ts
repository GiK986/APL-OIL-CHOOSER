import "server-only";
import { getOlyslagerConfig } from "@/lib/env";
import type {
  Category,
  Make,
  Model,
  VehicleType,
  Recommendation,
  SearchResponse,
  OlyslagerEnvelope,
} from "./types";

export class OlyslagerApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public url: string,
  ) {
    super(`Olyslager API error ${status} for ${url}`);
  }
}

type FetchOpts = { revalidate?: number; cache?: RequestCache };

async function olyFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  opts: FetchOpts = {},
): Promise<T> {
  const { baseUrl, dataset, subscriptionKey } = getOlyslagerConfig();
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-oly-dataset": dataset,
      "x-oly-subscription": subscriptionKey,
    },
    next: opts.revalidate !== undefined ? { revalidate: opts.revalidate } : undefined,
    cache: opts.cache,
  });

  // Olyslager sometimes returns a non-2xx transport status (e.g. 400) while
  // still encoding the semantically meaningful status (e.g. 404 for an
  // unknown id) inside the JSON envelope, so we always try to parse the body
  // first and prefer its `statusCode` before falling back to the raw HTTP status.
  const envelope = (await res.json().catch(() => null)) as OlyslagerEnvelope<T> | null;

  if (!res.ok || !envelope || !envelope.success) {
    const status = envelope?.statusCode ?? res.status;
    const message = envelope?.message ?? res.statusText;
    throw new OlyslagerApiError(status, message, url.toString());
  }

  return envelope.resultData;
}

// Olyslager has no Bulgarian locale (verified: language=bg returns an empty
// result set). Every call below hardcodes 'en' regardless of UI locale.
const DATA_LANGUAGE = "en";

const REFERENCE_DATA_REVALIDATE = 60 * 60 * 24; // 24h
const RECOMMENDATION_REVALIDATE = 60 * 60; // 1h

// Olyslager does not guarantee components/products/capacities/intervals are
// returned in display order — each carries its own `appOrder` (or
// `productAppOrder`) field that reflects the intended order instead.
function sortRecommendation(rec: Recommendation): Recommendation {
  return {
    ...rec,
    components: [...rec.components]
      .sort((a, b) => a.appOrder - b.appOrder)
      .map((component) => ({
        ...component,
        productRecommendations: [...component.productRecommendations]
          .sort((a, b) => a.productAppOrder - b.productAppOrder)
          .map((product) => ({
            ...product,
            intervals: [...product.intervals].sort((a, b) => a.appOrder - b.appOrder),
          })),
        capacities: [...component.capacities].sort((a, b) => a.appOrder - b.appOrder),
      })),
  };
}

export const olyslager = {
  getCategories: () =>
    olyFetch<Category[]>("categories", { language: DATA_LANGUAGE }, { revalidate: REFERENCE_DATA_REVALIDATE }),

  getMakes: (categoryId: number) =>
    olyFetch<Make[]>(
      "makes",
      { language: DATA_LANGUAGE, categoryId },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getModels: (makeId: number) =>
    olyFetch<Model[]>(
      "models",
      { language: DATA_LANGUAGE, makeId },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getTypes: (modelId: number) =>
    olyFetch<VehicleType[]>(
      "types",
      { language: DATA_LANGUAGE, modelId },
      { revalidate: REFERENCE_DATA_REVALIDATE },
    ),

  getRecommendations: (typeId: number) =>
    olyFetch<Recommendation>(
      `recommendations/${typeId}`,
      { language: DATA_LANGUAGE },
      { revalidate: RECOMMENDATION_REVALIDATE },
    ).then(sortRecommendation),

  search: (searchText: string, searchCount = 20, facetCount = 10) =>
    olyFetch<SearchResponse>(
      "search",
      { language: DATA_LANGUAGE, searchText, searchCount, facetCount },
      { cache: "no-store" },
    ),
};
