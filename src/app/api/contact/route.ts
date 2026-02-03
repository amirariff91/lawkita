import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sendContactFormNotification,
  sendContactFormConfirmation,
} from "@/lib/integrations/resend";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    // Send notification to admin
    const adminResult = await sendContactFormNotification(validatedData);
    if (!adminResult.success) {
      console.error("Failed to send contact form notification:", adminResult.error);
    }

    // Send confirmation to user
    const userResult = await sendContactFormConfirmation(validatedData);
    if (!userResult.success) {
      console.error("Failed to send contact form confirmation:", userResult.error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Failed to submit contact form" },
      { status: 500 }
    );
  }
}
