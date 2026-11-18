import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getFirmById,
  updateFirmProfile,
} from "@/lib/db/queries/firms";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const firm = await getFirmById(id);
    if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });

    return NextResponse.json({
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        description: firm.description ?? null,
        logo: firm.logo ?? null,
        address: firm.address,
        state: firm.state,
        city: firm.city,
        phone: firm.phone ?? null,
        email: firm.email ?? null,
        website: firm.website ?? null,
        isClaimed: firm.isClaimed ?? false,
        subscriptionTier: firm.subscriptionTier ?? "free",
        lawyerCount: firm.lawyerCount,
        avgYearsExperience: firm.avgYearsExperience,
      },
      lawyers: firm.lawyers,
    });
  } catch (error) {
    console.error("Error fetching firm:", error);
    return NextResponse.json({ error: "Failed to fetch firm" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(200).optional(),
  website: z.string().url().max(500).optional(),
  logo: z.string().url().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const validationResult = updateSchema.safeParse(await request.json());
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const result = await updateFirmProfile(id, session.user.id, validationResult.data);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update firm" },
        {
          status:
            result.error === "Not authorized"
              ? 403
              : result.error === "Firm not found"
                ? 404
                : 500,
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating firm:", error);
    return NextResponse.json({ error: "Failed to update firm" }, { status: 500 });
  }
}
