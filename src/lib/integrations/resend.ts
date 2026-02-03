/**
 * Resend Email Integration
 * Handles all email notifications for LawKita
 */

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface ResendResponse {
  id: string;
}

interface ResendError {
  statusCode: number;
  message: string;
  name: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@lawkita.my";

  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const toEmails = recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email));

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `LawKita <${fromEmail}>`,
        to: toEmails,
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as ResendError;
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }

    const data = (await response.json()) as ResendResponse;
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// ============================================================================
// Email Templates
// ============================================================================

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #0f172a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
  .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
  .button { display: inline-block; background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .info-box { background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 16px 0; }
  .label { font-weight: 600; color: #475569; }
  .urgency-urgent { color: #dc2626; font-weight: 600; }
  .urgency-high { color: #ea580c; font-weight: 600; }
  .urgency-medium { color: #ca8a04; }
  .urgency-low { color: #16a34a; }
`;

function wrapTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        ${content}
        <div class="footer">
          <p>LawKita - Malaysia's Trusted Lawyer Directory</p>
          <p><a href="https://lawkita.my">lawkita.my</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Password Reset Email
// ============================================================================

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hi,</p>
      <p>You requested to reset your password for your LawKita account.</p>

      <p>Click the button below to set a new password:</p>

      <a href="${resetUrl}" class="button">Reset Password</a>

      <div class="info-box">
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>

      <p style="color: #64748b; font-size: 14px;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${resetUrl}" style="word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
  `);

  return sendEmail({
    to: { email },
    subject: "Reset Your Password - LawKita",
    html,
    text: `Reset your LawKita password by visiting this link: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  });
}

// ============================================================================
// Enquiry Notifications
// ============================================================================

interface EnquiryNotificationData {
  lawyerName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string | null;
  caseType: string;
  urgency: "low" | "medium" | "high" | "urgent";
  description: string;
  enquiryId: string;
}

export async function sendEnquiryNotification(
  lawyerEmail: string,
  data: EnquiryNotificationData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const urgencyLabels = {
    urgent: "Urgent",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
  };

  const html = wrapTemplate(`
    <div class="header">
      <h1>New Client Enquiry</h1>
    </div>
    <div class="content">
      <p>Hi ${data.lawyerName},</p>
      <p>You have received a new enquiry through LawKita:</p>

      <div class="info-box">
        <p><span class="label">From:</span> ${data.senderName}</p>
        <p><span class="label">Email:</span> ${data.senderEmail}</p>
        ${data.senderPhone ? `<p><span class="label">Phone:</span> ${data.senderPhone}</p>` : ""}
        <p><span class="label">Case Type:</span> ${data.caseType}</p>
        <p><span class="label">Urgency:</span> <span class="urgency-${data.urgency}">${urgencyLabels[data.urgency]}</span></p>
      </div>

      <p><strong>Message:</strong></p>
      <div class="info-box">
        ${data.description.replace(/\n/g, "<br>")}
      </div>

      <a href="https://lawkita.my/dashboard/enquiries" class="button">View in Dashboard</a>

      <p style="color: #64748b; font-size: 14px;">
        Responding quickly improves your profile visibility. Aim to respond within 24 hours.
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: lawyerEmail, name: data.lawyerName },
    subject: `New Enquiry: ${data.caseType} from ${data.senderName}`,
    html,
    replyTo: data.senderEmail,
  });
}

// ============================================================================
// Claim Notifications
// ============================================================================

interface ClaimSubmittedData {
  lawyerName: string;
  userEmail: string;
  userName: string;
  claimId: string;
  verificationMethod: string;
}

export async function sendClaimSubmittedNotification(
  data: ClaimSubmittedData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header">
      <h1>Profile Claim Submitted</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>
      <p>Your claim for the profile of <strong>${data.lawyerName}</strong> has been submitted successfully.</p>

      <div class="info-box">
        <p><span class="label">Claim ID:</span> ${data.claimId}</p>
        <p><span class="label">Verification Method:</span> ${data.verificationMethod}</p>
        <p><span class="label">Status:</span> Under Review</p>
      </div>

      <p>Our team will verify your claim within 24-48 hours. You'll receive a WhatsApp message or phone call to confirm your identity.</p>

      <p><strong>What happens next:</strong></p>
      <ol>
        <li>We'll verify your bar certificate</li>
        <li>You'll receive a verification message via WhatsApp</li>
        <li>Once verified, you'll have full access to your profile</li>
      </ol>

      <p style="color: #64748b; font-size: 14px;">
        If you did not submit this claim, please contact us immediately at support@lawkita.my
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: data.userEmail, name: data.userName },
    subject: `Claim Submitted for ${data.lawyerName} - LawKita`,
    html,
  });
}

interface ClaimStatusUpdateData {
  lawyerName: string;
  userEmail: string;
  userName: string;
  status: "verified" | "rejected";
  reason?: string;
}

export async function sendClaimStatusNotification(
  data: ClaimStatusUpdateData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const isVerified = data.status === "verified";

  const html = wrapTemplate(`
    <div class="header" style="background: ${isVerified ? "#16a34a" : "#dc2626"};">
      <h1>Profile Claim ${isVerified ? "Approved" : "Rejected"}</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>

      ${isVerified ? `
        <p>🎉 Great news! Your claim for the profile of <strong>${data.lawyerName}</strong> has been verified.</p>
        <p>You now have full access to manage your profile on LawKita.</p>

        <a href="https://lawkita.my/dashboard" class="button">Go to Dashboard</a>

        <p><strong>What you can do now:</strong></p>
        <ul>
          <li>Update your bio and contact information</li>
          <li>Add your education and qualifications</li>
          <li>Respond to client enquiries</li>
          <li>Upgrade to Premium for enhanced visibility</li>
        </ul>
      ` : `
        <p>Unfortunately, we were unable to verify your claim for the profile of <strong>${data.lawyerName}</strong>.</p>

        ${data.reason ? `
          <div class="info-box">
            <p><span class="label">Reason:</span> ${data.reason}</p>
          </div>
        ` : ""}

        <p>If you believe this is an error, you can:</p>
        <ul>
          <li>Submit a new claim with additional documentation</li>
          <li>Contact us at support@lawkita.my for assistance</li>
        </ul>
      `}
    </div>
  `);

  return sendEmail({
    to: { email: data.userEmail, name: data.userName },
    subject: `Profile Claim ${isVerified ? "Approved" : "Rejected"} - ${data.lawyerName}`,
    html,
  });
}

// ============================================================================
// Review Notifications
// ============================================================================

interface ReviewSubmittedData {
  reviewerEmail: string;
  reviewerName: string;
  lawyerName: string;
  reviewId: string;
}

export async function sendReviewSubmittedNotification(
  data: ReviewSubmittedData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header">
      <h1>Review Submitted</h1>
    </div>
    <div class="content">
      <p>Hi ${data.reviewerName || "there"},</p>
      <p>Thank you for submitting your review for <strong>${data.lawyerName}</strong>.</p>

      <div class="info-box">
        <p><span class="label">Status:</span> Under Review</p>
        <p>We'll verify your invoice/receipt and publish your review shortly.</p>
      </div>

      <p>Reviews with valid documentation are typically published within 24 hours.</p>

      <p style="color: #64748b; font-size: 14px;">
        Your feedback helps other Malaysians find the right legal representation.
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: data.reviewerEmail, name: data.reviewerName },
    subject: `Review Submitted for ${data.lawyerName} - LawKita`,
    html,
  });
}

interface ReviewPublishedData {
  reviewerEmail: string;
  reviewerName: string;
  lawyerName: string;
  lawyerSlug: string;
}

export async function sendReviewPublishedNotification(
  data: ReviewPublishedData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header" style="background: #16a34a;">
      <h1>Review Published</h1>
    </div>
    <div class="content">
      <p>Hi ${data.reviewerName || "there"},</p>
      <p>Your review for <strong>${data.lawyerName}</strong> has been verified and published!</p>

      <a href="https://lawkita.my/lawyers/${data.lawyerSlug}" class="button">View Review</a>

      <p style="color: #64748b; font-size: 14px;">
        Thank you for contributing to Malaysia's most trusted lawyer directory.
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: data.reviewerEmail, name: data.reviewerName },
    subject: `Your Review is Live - ${data.lawyerName}`,
    html,
  });
}

// ============================================================================
// Contact Form Notifications
// ============================================================================

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactFormNotification(
  data: ContactFormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || "support@lawkita.my";

  const html = wrapTemplate(`
    <div class="header">
      <h1>New Contact Form Submission</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <p><span class="label">Name:</span> ${data.name}</p>
        <p><span class="label">Email:</span> ${data.email}</p>
        <p><span class="label">Subject:</span> ${data.subject}</p>
      </div>

      <p><strong>Message:</strong></p>
      <div class="info-box">
        ${data.message.replace(/\n/g, "<br>")}
      </div>

      <p style="color: #64748b; font-size: 14px;">
        Reply directly to this email to respond to the sender.
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: adminEmail },
    subject: `Contact Form: ${data.subject}`,
    html,
    replyTo: data.email,
  });
}

export async function sendContactFormConfirmation(
  data: ContactFormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header">
      <h1>We've Received Your Message</h1>
    </div>
    <div class="content">
      <p>Hi ${data.name},</p>
      <p>Thank you for contacting LawKita. We've received your message and will get back to you as soon as possible.</p>

      <div class="info-box">
        <p><span class="label">Subject:</span> ${data.subject}</p>
        <p><span class="label">Your message:</span></p>
        <p>${data.message.replace(/\n/g, "<br>")}</p>
      </div>

      <p>Our team typically responds within 24-48 hours during business days.</p>

      <p style="color: #64748b; font-size: 14px;">
        If you have an urgent matter, please note this is an automated response and we'll attend to your query shortly.
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: data.email, name: data.name },
    subject: "We've Received Your Message - LawKita",
    html,
  });
}

// ============================================================================
// Admin Notifications
// ============================================================================

interface AdminNotificationData {
  type: "claim" | "review" | "report";
  entityId: string;
  summary: string;
}

export async function sendAdminNotification(
  data: AdminNotificationData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lawkita.my";

  const typeLabels = {
    claim: "New Claim to Review",
    review: "Review Needs Moderation",
    report: "Content Report",
  };

  const html = wrapTemplate(`
    <div class="header">
      <h1>${typeLabels[data.type]}</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <p><span class="label">Type:</span> ${data.type}</p>
        <p><span class="label">ID:</span> ${data.entityId}</p>
        <p>${data.summary}</p>
      </div>

      <a href="https://lawkita.my/admin/${data.type}s/${data.entityId}" class="button">Review Now</a>
    </div>
  `);

  return sendEmail({
    to: { email: adminEmail },
    subject: `[Admin] ${typeLabels[data.type]} - LawKita`,
    html,
  });
}
