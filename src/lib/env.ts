import "server-only";
import type { Brand } from "@/lib/olyslager/brand";
import { resolveOlyslagerConfig, type OlyslagerConfig } from "@/lib/olyslager/brand-config";

export function getOlyslagerConfig(brand: Brand): OlyslagerConfig {
  return resolveOlyslagerConfig(brand, process.env);
}
