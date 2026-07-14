import { NextRequest, NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";

export async function GET(request: NextRequest) {
  const makeIdParam = request.nextUrl.searchParams.get("makeId");
  const makeId = Number(makeIdParam);
  if (!makeIdParam || !Number.isInteger(makeId) || makeId <= 0) {
    return NextResponse.json({ error: "makeId must be a positive integer" }, { status: 400 });
  }

  try {
    const models = await olyslager.getModels(makeId);
    return NextResponse.json(models);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load models" }, { status });
    }
    throw err;
  }
}
