import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lawyers, reviews } from "@/lib/db/schema";

export async function recalculateLawyerReviewMetrics(lawyerId: string): Promise<void> {
  await db
    .update(lawyers)
    .set({
      reviewCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${reviews}
        WHERE ${reviews.lawyerId} = ${lawyers.id}
          AND ${reviews.isPublished} = true
      )`,
      averageRating: sql<string | null>`(
        SELECT ROUND(AVG(${reviews.overallRating})::numeric, 1)
        FROM ${reviews}
        WHERE ${reviews.lawyerId} = ${lawyers.id}
          AND ${reviews.isPublished} = true
      )`,
      updatedAt: new Date(),
    })
    .where(eq(lawyers.id, lawyerId));
}
