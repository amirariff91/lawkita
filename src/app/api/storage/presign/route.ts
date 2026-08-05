import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { firms, lawyers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createStorageProvider } from "@/lib/storage/backend";
import {
  assertStorageRequest,
  buildStorageKey,
  STORAGE_BUCKETS,
  STORAGE_PURPOSES,
} from "@/lib/storage/validation";

export const runtime = "nodejs";

const requestSchema = z.object({
  bucket: z.enum(STORAGE_BUCKETS),
  purpose: z.enum(STORAGE_PURPOSES),
  resourceId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
  upsert: z.boolean().optional(),
});

async function requireSessionForProtectedUpload(
  purpose: z.infer<typeof requestSchema>["purpose"],
  resourceId: string
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (purpose === "review-document") {
    return session;
  }

  if (!session?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (purpose === "firm-logo") {
    const firm = await db.query.firms.findFirst({
      where: eq(firms.id, resourceId),
      columns: { ownerId: true },
    });

    if (!firm || firm.ownerId !== session.user.id) {
      throw new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (purpose === "claim-document") {
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, resourceId),
      columns: { id: true },
    });

    if (!lawyer) {
      throw new Response(JSON.stringify({ error: "Lawyer not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (purpose === "firm-claim-document") {
    const firm = await db.query.firms.findFirst({
      where: eq(firms.id, resourceId),
      columns: { id: true },
    });

    if (!firm) {
      throw new Response(JSON.stringify({ error: "Firm not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return session;
}
export async function POST(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid upload request" },
        { status: 400 }
      );
    }

    const input = parsed.data;
    if (input.purpose === "review-document") {
      return NextResponse.json(
        { error: "Review documents must be uploaded through the verified upload endpoint" },
        { status: 400 }
      );
    }

    await requireSessionForProtectedUpload(input.purpose, input.resourceId);
    assertStorageRequest(input);

    const key = buildStorageKey(input);
    const upload = await createStorageProvider().createPresignedUpload({
      bucket: input.bucket,
      key,
      contentType: input.contentType,
      upsert: input.upsert,
    });

    return NextResponse.json({
      ...upload,
      bucket: input.bucket,
      key,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("Failed to create storage upload URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Storage is unavailable" },
      { status: 500 }
    );
  }
}
