import { NextRequest, NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";

export async function GET(request: NextRequest) {
  const modelIdParam = request.nextUrl.searchParams.get("modelId");
  const modelId = Number(modelIdParam);
  if (!modelIdParam || !Number.isInteger(modelId) || modelId <= 0) {
    return NextResponse.json({ error: "modelId must be a positive integer" }, { status: 400 });
  }

  try {
    const types = await olyslager.getTypes(modelId);
    return NextResponse.json(types);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load types" }, { status });
    }
    throw err;
  }
}
