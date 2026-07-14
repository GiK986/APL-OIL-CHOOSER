import { NextRequest, NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";

export async function GET(request: NextRequest) {
  const categoryIdParam = request.nextUrl.searchParams.get("categoryId");
  const categoryId = Number(categoryIdParam);
  if (!categoryIdParam || !Number.isInteger(categoryId) || categoryId <= 0) {
    return NextResponse.json({ error: "categoryId must be a positive integer" }, { status: 400 });
  }

  try {
    const makes = await olyslager.getMakes(categoryId);
    return NextResponse.json(makes);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load makes" }, { status });
    }
    throw err;
  }
}
