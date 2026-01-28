import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getLawyerBySlug } from "@/lib/db/queries/lawyers";
import { ReviewForm } from "@/components/reviews";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ReviewPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lawyer = await getLawyerBySlug(slug);

  if (!lawyer) {
    return {
      title: "Lawyer Not Found | LawKita",
    };
  }

  return {
    title: `Write a Review for ${lawyer.name} | LawKita`,
    description: `Share your experience working with ${lawyer.name}. Your review helps others make informed decisions.`,
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const lawyer = await getLawyerBySlug(slug);

  if (!lawyer) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/lawyers/${slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {lawyer.name}'s profile
          </Link>
        </Button>

        {/* Lawyer Info */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Write a Review</h1>
          <p className="text-muted-foreground">
            Share your experience with <span className="font-medium">{lawyer.name}</span>
            {lawyer.firmName && ` at ${lawyer.firmName}`}
          </p>
        </div>

        {/* Review Form */}
        <ReviewForm lawyerId={lawyer.id} lawyerName={lawyer.name} />
      </div>
    </div>
  );
}
