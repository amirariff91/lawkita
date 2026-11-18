import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Direct storage uploads are disabled; upload through /api/storage" },
    { status: 410 }
  );
}
