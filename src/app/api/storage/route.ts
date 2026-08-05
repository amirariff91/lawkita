import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { claims, firmClaims, firms, lawyers, user } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createStorageProvider } from "@/lib/storage/backend";
import {
  STORAGE_BUCKETS,
  isStorageKeyForPurpose,
  type StoragePurpose,
} from "@/lib/storage/validation";

export const runtime = "nodejs";

const deleteSchema = z.object({
  bucket: z.enum(STORAGE_BUCKETS),
  key: z.string().min(1).max(500),
});

function getKeyParts(key: string): {
  purpose: StoragePurpose;
  prefix: string;
  resourceId: string;
} | null {
  const match = key.match(/^(reviews|claims|firm-claims|firms)\/([0-9a-f-]{36})\//i);
  if (!match?.[1] || !match[2]) return null;

  const purposeByPrefix: Record<string, StoragePurpose> = {
    reviews: "review-document",
    claims: "claim-document",
    "firm-claims": "firm-claim-document",
    firms: "firm-logo",
  };
  const purpose = purposeByPrefix[match[1].toLowerCase()];
  return purpose ? { purpose, prefix: match[1], resourceId: match[2] } : null;
}

async function canDeleteObject(key: string, userId: string, role: string | null): Promise<boolean> {
  if (role === "admin") return true;

  const parts = getKeyParts(key);
  if (!parts) return false;

  if (parts.prefix === "firms") {
    const firm = await db.query.firms.findFirst({
      where: eq(firms.id, parts.resourceId),
      columns: { ownerId: true },
    });
    return firm?.ownerId === userId;
  }

  if (parts.prefix === "claims" || parts.prefix === "reviews") {
    const lawyer = await db.query.lawyers.findFirst({
      where: eq(lawyers.id, parts.resourceId),
      columns: { userId: true },
    });
    if (lawyer?.userId === userId) return true;

    if (parts.prefix === "claims") {
      const claim = await db.query.claims.findFirst({
        where: and(eq(claims.lawyerId, parts.resourceId), eq(claims.userId, userId)),
        columns: { id: true },
      });
      return Boolean(claim);
    }

    return false;
  }

  if (parts.prefix === "firm-claims") {
    const claim = await db.query.firmClaims.findFirst({
      where: and(eq(firmClaims.firmId, parts.resourceId), eq(firmClaims.userId, userId)),
      columns: { id: true },
    });
    return Boolean(claim);
  }

  return false;
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid delete request" },
        { status: 400 }
      );
    }

    const { bucket, key } = parsed.data;
    const parts = getKeyParts(key);
    const validKey = Boolean(
      parts &&
        ((bucket === "images" && parts.purpose === "firm-logo") ||
          (bucket === "documents" && parts.purpose !== "firm-logo")) &&
        isStorageKeyForPurpose(key, parts.purpose, parts.resourceId)
    );

    if (!validKey) {
      return NextResponse.json({ error: "Invalid storage object key" }, { status: 400 });
    }

    const role = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { role: true },
    });

    if (!(await canDeleteObject(key, session.user.id, role?.role ?? null))) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await createStorageProvider().deleteObject({ bucket, key });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete storage object:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Storage is unavailable" },
      { status: 500 }
    );
  }
}
