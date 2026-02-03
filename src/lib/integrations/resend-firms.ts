/**
 * Resend Email Integration for Firm-related Notifications
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
// Firm Claim Notifications
// ============================================================================

interface FirmClaimSubmittedData {
  firmName: string;
  userEmail: string;
  userName: string;
  claimId: string;
  position: string;
}

export async function sendFirmClaimSubmittedNotification(
  data: FirmClaimSubmittedData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header">
      <h1>Firm Claim Submitted</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>
      <p>Your claim for <strong>${data.firmName}</strong> has been submitted successfully.</p>

      <div class="info-box">
        <p><span class="label">Claim ID:</span> ${data.claimId}</p>
        <p><span class="label">Position:</span> ${data.position}</p>
        <p><span class="label">Status:</span> Under Review</p>
      </div>

      <p>Our team will verify your documentation within 1-3 business days.</p>

      <p><strong>What happens next:</strong></p>
      <ol>
        <li>We'll review your verification documents</li>
        <li>If approved, you'll receive access to manage your firm profile</li>
        <li>You can then update firm information and manage lawyer listings</li>
      </ol>

      <p style="color: #64748b; font-size: 14px;">
        If you did not submit this claim, please contact us immediately at support@lawkita.my
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: data.userEmail, name: data.userName },
    subject: `Firm Claim Submitted - ${data.firmName}`,
    html,
  });
}

interface FirmClaimStatusData {
  firmName: string;
  firmSlug: string;
  userEmail: string;
  userName: string;
  status: "verified" | "rejected";
  reason?: string;
}

export async function sendFirmClaimStatusNotification(
  data: FirmClaimStatusData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const isVerified = data.status === "verified";

  const html = wrapTemplate(`
    <div class="header" style="background: ${isVerified ? "#16a34a" : "#dc2626"};">
      <h1>Firm Claim ${isVerified ? "Approved" : "Rejected"}</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>

      ${isVerified ? `
        <p>Great news! Your claim for <strong>${data.firmName}</strong> has been verified.</p>
        <p>You now have full access to manage your firm profile on LawKita.</p>

        <a href="https://lawkita.my/firm-dashboard" class="button">Go to Firm Dashboard</a>

        <p><strong>What you can do now:</strong></p>
        <ul>
          <li>Update your firm's description and contact information</li>
          <li>Add your firm's logo</li>
          <li>View lawyers associated with your firm</li>
          <li>Upgrade to Premium for enhanced visibility</li>
        </ul>
      ` : `
        <p>Unfortunately, we were unable to verify your claim for <strong>${data.firmName}</strong>.</p>

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

        <a href="https://lawkita.my/firms/${data.firmSlug}" class="button">View Firm Profile</a>
      `}
    </div>
  `);

  return sendEmail({
    to: { email: data.userEmail, name: data.userName },
    subject: `Firm Claim ${isVerified ? "Approved" : "Rejected"} - ${data.firmName}`,
    html,
  });
}

interface AdminFirmClaimNotificationData {
  firmName: string;
  firmSlug: string;
  claimId: string;
  userName: string;
  position: string;
}

export async function sendAdminFirmClaimNotification(
  data: AdminFirmClaimNotificationData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lawkita.my";

  const html = wrapTemplate(`
    <div class="header">
      <h1>New Firm Claim to Review</h1>
    </div>
    <div class="content">
      <div class="info-box">
        <p><span class="label">Firm:</span> ${data.firmName}</p>
        <p><span class="label">Claimant:</span> ${data.userName}</p>
        <p><span class="label">Position:</span> ${data.position}</p>
        <p><span class="label">Claim ID:</span> ${data.claimId}</p>
      </div>

      <a href="https://lawkita.my/admin/firm-claims/${data.claimId}" class="button">Review Claim</a>
    </div>
  `);

  return sendEmail({
    to: { email: adminEmail },
    subject: `[Admin] New Firm Claim - ${data.firmName}`,
    html,
  });
}

// ============================================================================
// Firm Subscription Notifications
// ============================================================================

interface FirmSubscriptionData {
  firmName: string;
  userEmail: string;
  userName: string;
  plan: string;
  billingPeriod: "monthly" | "annual";
  expiresAt: Date;
}

export async function sendFirmSubscriptionConfirmation(
  data: FirmSubscriptionData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header" style="background: #16a34a;">
      <h1>Subscription Activated</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>
      <p>Your ${data.plan} subscription for <strong>${data.firmName}</strong> has been activated!</p>

      <div class="info-box">
        <p><span class="label">Plan:</span> ${data.plan}</p>
        <p><span class="label">Billing:</span> ${data.billingPeriod === "annual" ? "Annual" : "Monthly"}</p>
        <p><span class="label">Next billing date:</span> ${data.expiresAt.toLocaleDateString()}</p>
      </div>

      <p><strong>Your premium benefits:</strong></p>
      <ul>
        <li>Featured placement in search results</li>
        <li>Firm logo displayed on profile</li>
        <li>Analytics dashboard</li>
        <li>Priority support</li>
      </ul>

      <a href="https://lawkita.my/firm-dashboard" class="button">Go to Firm Dashboard</a>
    </div>
  `);

  return sendEmail({
    to: { email: data.userEmail, name: data.userName },
    subject: `Subscription Activated - ${data.firmName}`,
    html,
  });
}

export async function sendFirmSubscriptionExpiring(
  data: FirmSubscriptionData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const html = wrapTemplate(`
    <div class="header" style="background: #ea580c;">
      <h1>Subscription Expiring Soon</h1>
    </div>
    <div class="content">
      <p>Hi ${data.userName},</p>
      <p>Your ${data.plan} subscription for <strong>${data.firmName}</strong> will expire on ${data.expiresAt.toLocaleDateString()}.</p>

      <p>Renew now to keep your premium benefits:</p>
      <ul>
        <li>Featured placement in search results</li>
        <li>Firm logo displayed on profile</li>
        <li>Analytics dashboard</li>
        <li>Priority support</li>
      </ul>

      <a href="https://lawkita.my/firm-dashboard/subscription" class="button">Renew Subscription</a>

      <p style="color: #64748b; font-size: 14px;">
        If you have automatic renewal enabled, your subscription will renew automatically.
      </p>
    </div>
  `);

  return sendEmail({
    to: { email: data.userEmail, name: data.userName },
    subject: `Subscription Expiring - ${data.firmName}`,
    html,
  });
}
