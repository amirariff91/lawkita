/**
 * OpenAI Integration
 * Handles document verification (OCR) and content moderation
 */

const OPENAI_API_URL = "https://api.openai.com/v1";

interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// ============================================================================
// Document Verification (Bar Certificate OCR)
// ============================================================================

interface BarCertificateVerificationResult {
  isValid: boolean;
  confidence: number; // 0-100
  extractedData: {
    lawyerName?: string;
    barMembershipNumber?: string;
    admissionDate?: string;
    issuingAuthority?: string;
  };
  issues: string[];
  rawResponse?: string;
}

export async function verifyBarCertificate(
  imageUrl: string,
  expectedName: string,
  expectedBarNumber?: string
): Promise<BarCertificateVerificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY not configured");
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      issues: ["Document verification service not configured"],
    };
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a document verification assistant for LawKita, a Malaysian lawyer directory.
Your task is to analyze bar certificates from the Malaysian Bar Council and extract relevant information.

Respond in JSON format only with this structure:
{
  "isValid": boolean (true if this appears to be a legitimate Malaysian Bar certificate),
  "confidence": number (0-100, your confidence in the extraction),
  "extractedData": {
    "lawyerName": string or null,
    "barMembershipNumber": string or null,
    "admissionDate": string or null (in YYYY-MM-DD format if possible),
    "issuingAuthority": string or null
  },
  "issues": string[] (list any concerns or discrepancies)
}

Be strict about verification:
- Look for official Malaysian Bar Council markers
- Check for tampering signs
- Extract the exact name and membership number as shown
- Note any quality issues with the document`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please verify this Malaysian Bar certificate.
Expected lawyer name: "${expectedName}"
${expectedBarNumber ? `Expected bar membership number: "${expectedBarNumber}"` : ""}

Check if the document is legitimate and extract the information.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as OpenAIError;
      console.error("OpenAI API error:", error);
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: [`API error: ${error.error?.message || "Unknown error"}`],
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: ["No response from verification service"],
      };
    }

    // Parse JSON response
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const result = JSON.parse(jsonStr);

      // Validate name match
      const issues: string[] = result.issues || [];
      if (result.extractedData?.lawyerName) {
        const extractedName = result.extractedData.lawyerName.toLowerCase();
        const expected = expectedName.toLowerCase();
        if (!extractedName.includes(expected) && !expected.includes(extractedName)) {
          issues.push(`Name mismatch: document shows "${result.extractedData.lawyerName}", expected "${expectedName}"`);
          result.confidence = Math.min(result.confidence, 50);
        }
      }

      // Validate bar number match if provided
      if (expectedBarNumber && result.extractedData?.barMembershipNumber) {
        const extractedNumber = result.extractedData.barMembershipNumber.replace(/\D/g, "");
        const expected = expectedBarNumber.replace(/\D/g, "");
        if (extractedNumber !== expected) {
          issues.push(
            `Bar number mismatch: document shows "${result.extractedData.barMembershipNumber}", expected "${expectedBarNumber}"`
          );
          result.confidence = Math.min(result.confidence, 40);
        }
      }

      return {
        isValid: result.isValid && result.confidence >= 70,
        confidence: result.confidence || 0,
        extractedData: result.extractedData || {},
        issues,
        rawResponse: content,
      };
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: ["Failed to parse verification response"],
        rawResponse: content,
      };
    }
  } catch (error) {
    console.error("Failed to verify document:", error);
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      issues: ["Verification service error"],
    };
  }
}

// ============================================================================
// Invoice/Receipt Verification (for reviews)
// ============================================================================

interface InvoiceVerificationResult {
  isValid: boolean;
  confidence: number;
  extractedData: {
    lawyerName?: string;
    firmName?: string;
    serviceDate?: string;
    amount?: string;
    serviceType?: string;
  };
  issues: string[];
}

export async function verifyInvoiceReceipt(
  imageUrl: string,
  expectedLawyerName: string
): Promise<InvoiceVerificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      issues: ["Document verification service not configured"],
    };
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a document verification assistant for LawKita.
Your task is to verify invoices/receipts from Malaysian law firms to confirm that a person engaged legal services.

Respond in JSON format only:
{
  "isValid": boolean (true if this appears to be a legitimate legal invoice/receipt),
  "confidence": number (0-100),
  "extractedData": {
    "lawyerName": string or null (the lawyer who provided services),
    "firmName": string or null,
    "serviceDate": string or null (YYYY-MM-DD),
    "amount": string or null,
    "serviceType": string or null (e.g., "Legal consultation", "Court representation")
  },
  "issues": string[] (list any concerns)
}

Valid documents include:
- Law firm invoices
- Legal service receipts
- Payment confirmations
- Official letters on firm letterhead mentioning services rendered

Be strict:
- Document must clearly show legal services were provided
- Lawyer or firm name must be visible
- Reject unclear or suspicious documents`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please verify this invoice/receipt for legal services.
Expected lawyer: "${expectedLawyerName}"

Verify this shows legitimate legal services from this lawyer.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as OpenAIError;
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: [`API error: ${error.error?.message}`],
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: ["No response from verification service"],
      };
    }

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      const result = JSON.parse(jsonStr);

      const issues: string[] = result.issues || [];

      // Check lawyer name match
      const extractedLawyer = result.extractedData?.lawyerName?.toLowerCase() || "";
      const extractedFirm = result.extractedData?.firmName?.toLowerCase() || "";
      const expected = expectedLawyerName.toLowerCase();

      const nameMatch =
        extractedLawyer.includes(expected) ||
        expected.includes(extractedLawyer) ||
        extractedFirm.includes(expected) ||
        expected.includes(extractedFirm);

      if (!nameMatch && extractedLawyer) {
        issues.push(`Lawyer name may not match: found "${result.extractedData.lawyerName}"`);
        result.confidence = Math.min(result.confidence, 60);
      }

      return {
        isValid: result.isValid && result.confidence >= 70,
        confidence: result.confidence || 0,
        extractedData: result.extractedData || {},
        issues,
      };
    } catch {
      return {
        isValid: false,
        confidence: 0,
        extractedData: {},
        issues: ["Failed to parse verification response"],
      };
    }
  } catch (error) {
    console.error("Failed to verify invoice:", error);
    return {
      isValid: false,
      confidence: 0,
      extractedData: {},
      issues: ["Verification service error"],
    };
  }
}

// ============================================================================
// Content Moderation
// ============================================================================

interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: boolean;
    harassment: boolean;
    selfHarm: boolean;
    sexual: boolean;
    violence: boolean;
  };
  scores: {
    hate: number;
    harassment: number;
    selfHarm: number;
    sexual: number;
    violence: number;
  };
}

export async function moderateContent(content: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Default to not flagged if moderation is not configured
    return {
      flagged: false,
      categories: { hate: false, harassment: false, selfHarm: false, sexual: false, violence: false },
      scores: { hate: 0, harassment: 0, selfHarm: 0, sexual: 0, violence: 0 },
    };
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/moderations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: content,
      }),
    });

    if (!response.ok) {
      console.error("Moderation API error");
      return {
        flagged: false,
        categories: { hate: false, harassment: false, selfHarm: false, sexual: false, violence: false },
        scores: { hate: 0, harassment: 0, selfHarm: 0, sexual: 0, violence: 0 },
      };
    }

    const data = await response.json();
    const result = data.results?.[0];

    if (!result) {
      return {
        flagged: false,
        categories: { hate: false, harassment: false, selfHarm: false, sexual: false, violence: false },
        scores: { hate: 0, harassment: 0, selfHarm: 0, sexual: 0, violence: 0 },
      };
    }

    return {
      flagged: result.flagged,
      categories: {
        hate: result.categories?.hate || result.categories?.["hate/threatening"] || false,
        harassment: result.categories?.harassment || result.categories?.["harassment/threatening"] || false,
        selfHarm: result.categories?.["self-harm"] || result.categories?.["self-harm/intent"] || false,
        sexual: result.categories?.sexual || result.categories?.["sexual/minors"] || false,
        violence: result.categories?.violence || result.categories?.["violence/graphic"] || false,
      },
      scores: {
        hate: result.category_scores?.hate || 0,
        harassment: result.category_scores?.harassment || 0,
        selfHarm: result.category_scores?.["self-harm"] || 0,
        sexual: result.category_scores?.sexual || 0,
        violence: result.category_scores?.violence || 0,
      },
    };
  } catch (error) {
    console.error("Moderation error:", error);
    return {
      flagged: false,
      categories: { hate: false, harassment: false, selfHarm: false, sexual: false, violence: false },
      scores: { hate: 0, harassment: 0, selfHarm: 0, sexual: 0, violence: 0 },
    };
  }
}

// ============================================================================
// Review Quality Analysis
// ============================================================================

interface ReviewQualityResult {
  isGenuine: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

export async function analyzeReviewQuality(review: {
  content: string;
  pros?: string;
  cons?: string;
  rating: number;
}): Promise<ReviewQualityResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      isGenuine: true,
      confidence: 50,
      issues: [],
      suggestions: [],
    };
  }

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You analyze lawyer reviews for quality and authenticity.
Respond in JSON:
{
  "isGenuine": boolean,
  "confidence": number (0-100),
  "issues": string[] (concerns like "generic content", "copy-pasted", "promotional"),
  "suggestions": string[] (optional improvements)
}

Red flags:
- Generic phrases without specifics
- Promotional language
- Inconsistent rating with content
- Very short with extreme rating
- Copy-pasted templates`,
          },
          {
            role: "user",
            content: `Analyze this lawyer review (rating: ${review.rating}/5):

Review: ${review.content || "No content"}
Pros: ${review.pros || "None listed"}
Cons: ${review.cons || "None listed"}`,
          },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      return { isGenuine: true, confidence: 50, issues: [], suggestions: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { isGenuine: true, confidence: 50, issues: [], suggestions: [] };
    }

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      return JSON.parse(jsonStr);
    } catch {
      return { isGenuine: true, confidence: 50, issues: [], suggestions: [] };
    }
  } catch {
    return { isGenuine: true, confidence: 50, issues: [], suggestions: [] };
  }
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
