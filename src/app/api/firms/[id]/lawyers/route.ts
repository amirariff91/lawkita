import { NextRequest, NextResponse } from "next/server";
import { getFirmById } from "@/lib/db/queries/firms";

interface RouteParams {
  params: Promise<{ id: string }>;
}
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const firm = await getFirmById(id);
    if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

    return NextResponse.json({
      firmName: firm.name,
      lawyers: firm.lawyers,
      total: firm.lawyers.length,
    });
  } catch (error) {
    console.error("Error in firm lawyers API:", error);
    return NextResponse.json({ error: "Failed to fetch lawyers" }, { status: 500 });
  }
}
