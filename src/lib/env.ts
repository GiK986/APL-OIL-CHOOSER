import "server-only";

export function getOlyslagerConfig(): {
  baseUrl: string;
  dataset: string;
  subscriptionKey: string;
} {
  const subscriptionKey = process.env.OLYSLAGER_SUBSCRIPTION_KEY;
  if (!subscriptionKey) {
    throw new Error("OLYSLAGER_SUBSCRIPTION_KEY is not set");
  }
  return {
    baseUrl: process.env.OLYSLAGER_BASE_URL ?? "https://api.olyslager.com/rest/",
    dataset: process.env.OLYSLAGER_DATASET ?? "fuchs_eu",
    subscriptionKey,
  };
}
