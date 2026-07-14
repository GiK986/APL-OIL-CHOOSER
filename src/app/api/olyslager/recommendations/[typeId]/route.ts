import { NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ typeId: string }> },
) {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    return NextResponse.json({ error: "typeId must be a positive integer" }, { status: 400 });
  }

  try {
    const recommendation = await olyslager.getRecommendations(typeId);
    return NextResponse.json(recommendation);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load recommendations" }, { status });
    }
    throw err;
  }
}
