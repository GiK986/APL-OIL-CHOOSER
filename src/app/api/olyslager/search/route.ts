import { NextRequest, NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";

export async function GET(request: NextRequest) {
  const searchText = request.nextUrl.searchParams.get("q")?.trim();
  if (!searchText) {
    return NextResponse.json({ error: "q must be a non-empty search string" }, { status: 400 });
  }

  try {
    const results = await olyslager.search(searchText);
    return NextResponse.json(results);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to search" }, { status });
    }
    throw err;
  }
}
