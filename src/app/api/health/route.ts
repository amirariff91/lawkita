import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getStorageConfigurationStatus } from "@/lib/storage/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: {
    database: "ok" | "error";
    storage: "ok" | "error";
  } = {
    database: "error",
    storage: "error",
  };

  try {
    await db.execute(sql`select 1`);
    checks.database = "ok";
  } catch (error) {
    console.error("Health check database failure:", error);
  }

  const storage = getStorageConfigurationStatus();
  checks.storage = storage.configured ? "ok" : "error";

  const healthy = checks.database === "ok" && checks.storage === "ok";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "lawkita",
      timestamp: new Date().toISOString(),
      backend: {
        database: "self-hosted-postgres",
        storage: storage.backend,
      },
      checks,
      storage: {
        backend: storage.backend,
        configured: storage.configured,
        ...(storage.configured ? {} : { missing: storage.missing }),
      },
    },
    { status: healthy ? 200 : 503 }
  );
}
