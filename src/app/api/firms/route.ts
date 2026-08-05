import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchFirms } from "@/lib/db/queries/firms";

const searchSchema = z.object({
  query: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  practiceArea: z.string().optional(),
  sort: z.enum(["lawyers", "experience", "name"]).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = searchSchema.parse({
      query: searchParams.get("query") || undefined,
      state: searchParams.get("state") || undefined,
      city: searchParams.get("city") || undefined,
      practiceArea: searchParams.get("practiceArea") || undefined,
      sort: searchParams.get("sort") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    return NextResponse.json(await searchFirms(params));
  } catch (error) {
    console.error("Error in firms API:", error);
    return NextResponse.json({ error: "Failed to fetch firms" }, { status: 500 });
  }
}
