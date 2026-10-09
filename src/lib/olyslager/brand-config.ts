import type { Brand } from "./brand";

export interface OlyslagerConfig {
  baseUrl: string;
  dataset: string;
  subscriptionKey: string;
}

export const DEFAULT_BASE_URL = "https://api.olyslager.com/rest/";

// Kept free of `server-only` so it can be unit-tested under plain Node;
// `getOlyslagerConfig` in `@/lib/env` is the server-only entry point.
// Each brand must name its own dataset explicitly — falling back to another
// brand's dataset would silently show the wrong manufacturer's products.
export function resolveOlyslagerConfig(
  brand: Brand,
  env: Record<string, string | undefined>,
): OlyslagerConfig {
  const prefix = `OLYSLAGER_${brand.toUpperCase()}`;
  return {
    baseUrl: env.OLYSLAGER_BASE_URL || DEFAULT_BASE_URL,
    dataset: required(env, `${prefix}_DATASET`),
    subscriptionKey: required(env, `${prefix}_SUBSCRIPTION_KEY`),
  };
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}
