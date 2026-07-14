import { NextResponse } from "next/server";
import { olyslager, OlyslagerApiError } from "@/lib/olyslager/client";

export async function GET() {
  try {
    const categories = await olyslager.getCategories();
    return NextResponse.json(categories);
  } catch (err) {
    if (err instanceof OlyslagerApiError) {
      const status = err.status >= 400 && err.status < 500 ? err.status : 502;
      return NextResponse.json({ error: "Failed to load categories" }, { status });
    }
    throw err;
  }
}
