/**
 * WhatsApp Business API Integration
 * Handles verification callbacks for lawyer claim verification
 */

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  return { phoneNumberId, accessToken };
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle Malaysian numbers
  if (cleaned.startsWith("0")) {
    // Convert 01x to 601x
    cleaned = "6" + cleaned;
  } else if (!cleaned.startsWith("6") && cleaned.length <= 10) {
    // Assume Malaysian if no country code
    cleaned = "60" + cleaned;
  }

  return cleaned;
}

async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phoneNumberId, accessToken } = getConfig();

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp Business API not configured");
    return { success: false, error: "WhatsApp not configured" };
  }

  const formattedPhone = formatPhoneNumber(to);

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppError;
      console.error("WhatsApp API error:", error);
      return { success: false, error: error.error?.message || "Failed to send message" };
    }

    const data = (await response.json()) as WhatsAppMessageResponse;
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return { success: false, error: "Failed to send WhatsApp message" };
  }
}

async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: Array<{
    type: "header" | "body" | "button";
    parameters: Array<{ type: string; text?: string; image?: { link: string } }>;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { phoneNumberId, accessToken } = getConfig();

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp Business API not configured");
    return { success: false, error: "WhatsApp not configured" };
  }

  const formattedPhone = formatPhoneNumber(to);

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as WhatsAppError;
      console.error("WhatsApp API error:", error);
      return { success: false, error: error.error?.message || "Failed to send template" };
    }

    const data = (await response.json()) as WhatsAppMessageResponse;
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error("Failed to send WhatsApp template:", error);
    return { success: false, error: "Failed to send WhatsApp template" };
  }
}

// ============================================================================
// Claim Verification Messages
// ============================================================================

interface ClaimVerificationData {
  lawyerName: string;
  verificationCode: string;
  claimId: string;
}

export async function sendClaimVerificationWhatsApp(
  phoneNumber: string,
  data: ClaimVerificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = `*LawKita Profile Verification*

Hi, we received a claim request for the profile of *${data.lawyerName}* on LawKita.

To verify your identity, please reply with:
*VERIFY ${data.verificationCode}*

This code expires in 24 hours.

If you did not request this verification, please reply CANCEL or ignore this message.

---
LawKita - Malaysia's Trusted Lawyer Directory
lawkita.my`;

  return sendWhatsAppMessage(phoneNumber, message);
}

export async function sendClaimApprovedWhatsApp(
  phoneNumber: string,
  lawyerName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = `*LawKita Profile Verified* ✅

Congratulations! Your profile for *${lawyerName}* has been successfully verified on LawKita.

You can now:
• Update your profile information
• Respond to client enquiries
• View your analytics

Log in at: lawkita.my/dashboard

---
LawKita - Malaysia's Trusted Lawyer Directory`;

  return sendWhatsAppMessage(phoneNumber, message);
}

export async function sendClaimRejectedWhatsApp(
  phoneNumber: string,
  lawyerName: string,
  reason: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = `*LawKita Profile Verification Update*

We were unable to verify your claim for the profile of *${lawyerName}*.

Reason: ${reason}

To resolve this:
1. Submit a new claim with correct documentation
2. Contact support@lawkita.my

---
LawKita - Malaysia's Trusted Lawyer Directory`;

  return sendWhatsAppMessage(phoneNumber, message);
}

// ============================================================================
// Enquiry Notifications (Optional - for premium lawyers)
// ============================================================================

interface EnquiryWhatsAppData {
  lawyerName: string;
  senderName: string;
  caseType: string;
  urgency: string;
}

export async function sendEnquiryWhatsApp(
  phoneNumber: string,
  data: EnquiryWhatsAppData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const urgencyEmoji =
    data.urgency === "urgent" ? "🔴" : data.urgency === "high" ? "🟠" : data.urgency === "medium" ? "🟡" : "🟢";

  const message = `*New Client Enquiry* ${urgencyEmoji}

Hi ${data.lawyerName},

You have a new enquiry on LawKita:
• From: ${data.senderName}
• Case Type: ${data.caseType}
• Urgency: ${data.urgency}

View details: lawkita.my/dashboard/enquiries

---
LawKita`;

  return sendWhatsAppMessage(phoneNumber, message);
}

// ============================================================================
// Webhook Handler for Incoming Messages
// ============================================================================

interface WhatsAppWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppWebhookMessage[];
        statuses?: Array<{ id: string; status: string; timestamp: string }>;
      };
      field: string;
    }>;
  }>;
}

export function parseVerificationResponse(message: string): { isVerification: boolean; code?: string; isCancel?: boolean } {
  const trimmed = message.trim().toUpperCase();

  // Check for VERIFY <code> pattern
  const verifyMatch = trimmed.match(/^VERIFY\s+([A-Z0-9]{6})$/);
  if (verifyMatch) {
    return { isVerification: true, code: verifyMatch[1] };
  }

  // Check for CANCEL
  if (trimmed === "CANCEL") {
    return { isVerification: false, isCancel: true };
  }

  return { isVerification: false };
}

export function extractMessagesFromWebhook(payload: WhatsAppWebhookPayload): Array<{
  from: string;
  messageId: string;
  text: string;
  timestamp: Date;
}> {
  const messages: Array<{
    from: string;
    messageId: string;
    text: string;
    timestamp: Date;
  }> = [];

  if (payload.object !== "whatsapp_business_account") {
    return messages;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages" || !change.value.messages) {
        continue;
      }

      for (const msg of change.value.messages) {
        if (msg.type === "text" && msg.text?.body) {
          messages.push({
            from: msg.from,
            messageId: msg.id,
            text: msg.text.body,
            timestamp: new Date(parseInt(msg.timestamp) * 1000),
          });
        }
      }
    }
  }

  return messages;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function generateVerificationCode(): string {
  // Generate 6-character alphanumeric code (uppercase)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing characters
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function isWhatsAppConfigured(): boolean {
  const { phoneNumberId, accessToken } = getConfig();
  return Boolean(phoneNumberId && accessToken);
}
