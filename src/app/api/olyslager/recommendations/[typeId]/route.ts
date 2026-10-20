import { NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";
import { DEFAULT_BRAND, ENABLED_BRANDS, parseBrand } from "@/lib/olyslager/brand";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ typeId: string }> },
) {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    return NextResponse.json({ error: "typeId must be a positive integer" }, { status: 400 });
  }

  // Absent → DEFAULT_BRAND, so pre-existing callers keep working; present but unknown or disabled → 400.
  const brandParam = new URL(request.url).searchParams.get("brand");
  const brand = brandParam === null ? DEFAULT_BRAND : parseBrand(brandParam);
  if (!brand) {
    return NextResponse.json({ error: `brand must be one of: ${ENABLED_BRANDS.join(", ")}` }, { status: 400 });
  }

  try {
    const recommendation = await olyslager.getRecommendations(typeId, brand);
    return NextResponse.json(recommendation);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load recommendations" }, { status });
    }
    throw err;
  }
}
