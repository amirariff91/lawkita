/**
 * Malaysian Bar Council Legal Directory Scraper
 * https://legaldirectory.malaysianbar.org.my/
 *
 * Scrapes lawyer profiles from the Malaysian Bar Council's public directory.
 * This is a public directory intended for consumer access to find lawyers.
 */

import { createServiceRoleClient } from "@/lib/supabase/client";
import { chromium, type Browser, type Page } from "playwright";
import * as cheerio from "cheerio";

// Malaysian states for the directory - using dropdown value codes
// Note: Sabah and Sarawak have separate Bar associations and aren't in this directory
export const MALAYSIAN_STATES = [
  "Johore",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Labuan",
  "Wilayah Persekutuan Putrajaya",
] as const;

// Mapping from state names to dropdown value codes
const STATE_CODE_MAPPING: Record<string, string> = {
  "Johore": "JH",
  "Kedah": "KD",
  "Kelantan": "KT",
  "Melaka": "MK",
  "Negeri Sembilan": "NS",
  "Pahang": "PH",
  "Penang": "PG",
  "Perak": "PK",
  "Perlis": "PR",
  "Selangor": "SG",
  "Terengganu": "TG",
  "Wilayah Persekutuan Kuala Lumpur": "WPKL",
  "Wilayah Persekutuan Labuan": "WL",
  "Wilayah Persekutuan Putrajaya": "WPP",
};

// Browser instance management for reuse
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
    });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export type MalaysianState = (typeof MALAYSIAN_STATES)[number];

// Practice area mappings from Bar Council to our system
export const PRACTICE_AREA_MAPPINGS: Record<string, string> = {
  "Banking & Finance": "banking-finance",
  "Commercial Litigation": "commercial-litigation",
  "Company Law": "corporate-commercial",
  "Constitutional & Administrative Law": "constitutional-administrative",
  "Construction Law": "construction",
  "Conveyancing": "conveyancing-property",
  "Corporate": "corporate-commercial",
  "Criminal Law": "criminal-defense",
  "Employment Law": "employment-labour",
  "Family Law": "family-law",
  "General Practice": "general-practice",
  "Immigration": "immigration",
  "Industrial Relations": "employment-labour",
  "Insolvency": "insolvency-bankruptcy",
  "Insurance": "insurance",
  "Intellectual Property": "intellectual-property",
  "Islamic Law": "islamic-syariah",
  "Litigation": "civil-litigation",
  "Media & Entertainment": "media-entertainment",
  "Medical Negligence": "medical-malpractice",
  "Real Estate": "conveyancing-property",
  "Securities": "securities-capital-markets",
  "Shipping & Maritime": "shipping-maritime",
  "Tax": "tax",
  "Technology": "technology-cyber",
  "Wills & Probate": "wills-probate",
};

export interface BarCouncilLawyer {
  name: string;
  barMembershipNumber?: string;
  firmName?: string;
  firmAddress?: string;
  phone?: string;
  email?: string;
  fax?: string;
  state?: string;
  city?: string;
  practiceAreas?: string[];
  admissionDate?: string;
  isActive: boolean;
  scrapedAt: Date;
  sourceUrl: string;
}

export interface ScrapingProgress {
  state: string;
  page: number;
  totalPages: number;
  lawyersProcessed: number;
  lawyersCreated: number;
  lawyersUpdated: number;
  lawyersSkipped: number;
  errors: Array<{ lawyer?: string; error: string }>;
}

export interface ScrapingResult {
  success: boolean;
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ lawyer?: string; error: string }>;
  duration: number;
}

// Generate a URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Parse admission date from various formats
function parseAdmissionDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try different date formats
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, a, b, c] = match;
      // Check if first group is year (YYYY-MM-DD)
      if (a && a.length === 4) {
        return new Date(parseInt(a), parseInt(b!) - 1, parseInt(c!));
      }
      // Otherwise DD/MM/YYYY or DD-MM-YYYY
      return new Date(parseInt(c!), parseInt(b!) - 1, parseInt(a!));
    }
  }

  // Try native Date parsing as fallback
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Calculate years at bar from admission date
function calculateYearsAtBar(admissionDate: Date | null): number | null {
  if (!admissionDate) return null;
  const now = new Date();
  const years = Math.floor(
    (now.getTime() - admissionDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  return years >= 0 ? years : null;
}

// Extract city from address
function extractCity(address: string, state: string): string | null {
  if (!address) return null;

  // Common city patterns in Malaysian addresses
  const cityPatterns = [
    // Postcode followed by city
    /\d{5}\s+([A-Za-z\s]+?)(?:,|$)/,
    // City before state
    new RegExp(`([A-Za-z\\s]+?)(?:,\\s*)?${state}`, "i"),
  ];

  for (const pattern of cityPatterns) {
    const match = address.match(pattern);
    if (match?.[1]) {
      const city = match[1].trim();
      // Filter out common non-city strings
      if (city.length > 2 && !["Level", "Floor", "Suite", "Block"].includes(city)) {
        return city;
      }
    }
  }

  return null;
}

/**
 * Normalize an address for firm deduplication
 */
function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "";
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .replace(/\b(jalan|jln)\b/g, "jln")
    .replace(/\b(lorong|lrg)\b/g, "lrg")
    .replace(/\b(taman|tmn)\b/g, "tmn")
    .replace(/\b(suite|ste)\b/g, "ste")
    .replace(/\b(level|lvl)\b/g, "lvl")
    .replace(/\b(floor|flr)\b/g, "flr")
    .trim();
}

/**
 * Generate a URL-friendly slug for a firm
 */
function generateFirmSlug(name: string, city: string | null): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  if (city) {
    const citySlug = city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);
    return `${baseSlug}-${citySlug}`;
  }

  return baseSlug;
}

/**
 * Get or create a firm based on name and address (deduplication)
 */
async function getOrCreateFirm(
  supabase: ReturnType<typeof createServiceRoleClient>,
  firmName: string,
  firmAddress: string | null,
  state: string | null,
  city: string | null
): Promise<{ id: string; slug: string }> {
  const normalizedAddr = normalizeAddress(firmAddress);

  // Try to find existing firm by normalized address
  if (normalizedAddr) {
    const { data: existingFirm } = await supabase
      .from("firms")
      .select("id, slug")
      .eq("normalized_address", normalizedAddr)
      .single();

    if (existingFirm) {
      return { id: existingFirm.id, slug: existingFirm.slug };
    }
  }

  // Try to find by exact name match in same city
  if (city) {
    const { data: existingFirm } = await supabase
      .from("firms")
      .select("id, slug")
      .eq("name", firmName)
      .eq("city", city)
      .single();

    if (existingFirm) {
      return { id: existingFirm.id, slug: existingFirm.slug };
    }
  }

  // Create new firm
  const slug = generateFirmSlug(firmName, city);

  const { data: newFirm, error } = await supabase
    .from("firms")
    .insert({
      name: firmName,
      slug,
      address: firmAddress,
      normalized_address: normalizedAddr || null,
      state,
      city,
    })
    .select("id, slug")
    .single();

  if (error) {
    // Handle slug conflict by adding a random suffix
    const slugWithSuffix = `${slug}-${Date.now().toString(36)}`;
    const { data: retryFirm, error: retryError } = await supabase
      .from("firms")
      .insert({
        name: firmName,
        slug: slugWithSuffix,
        address: firmAddress,
        normalized_address: normalizedAddr || null,
        state,
        city,
      })
      .select("id, slug")
      .single();

    if (retryError) {
      throw new Error(`Failed to create firm: ${retryError.message}`);
    }

    return { id: retryFirm.id, slug: retryFirm.slug };
  }

  return { id: newFirm.id, slug: newFirm.slug };
}

/**
 * Track firm history for a lawyer (detect firm changes)
 */
async function trackFirmHistory(
  supabase: ReturnType<typeof createServiceRoleClient>,
  lawyerId: string,
  newFirmName: string | null,
  newFirmId: string | null,
  newFirmAddress: string | null
): Promise<void> {
  if (!newFirmName) return;

  // Get current firm history entry
  const { data: currentHistory } = await supabase
    .from("lawyer_firm_history")
    .select("id, firm_name, firm_id")
    .eq("lawyer_id", lawyerId)
    .eq("is_current", true)
    .single();

  const now = new Date().toISOString();

  if (currentHistory) {
    // Check if firm has changed
    if (currentHistory.firm_name !== newFirmName) {
      // Mark old firm as not current
      await supabase
        .from("lawyer_firm_history")
        .update({ is_current: false, last_seen: now })
        .eq("id", currentHistory.id);

      // Add new firm entry
      await supabase.from("lawyer_firm_history").insert({
        lawyer_id: lawyerId,
        firm_name: newFirmName,
        firm_id: newFirmId,
        firm_address: newFirmAddress,
        first_seen: now,
        last_seen: now,
        is_current: true,
      });
    } else {
      // Same firm, just update last_seen
      await supabase
        .from("lawyer_firm_history")
        .update({ last_seen: now })
        .eq("id", currentHistory.id);
    }
  } else {
    // No history exists, create initial entry
    await supabase.from("lawyer_firm_history").insert({
      lawyer_id: lawyerId,
      firm_name: newFirmName,
      firm_id: newFirmId,
      firm_address: newFirmAddress,
      first_seen: now,
      last_seen: now,
      is_current: true,
    });
  }
}

/**
 * Save a scraped lawyer to the database
 */
export async function saveLawyer(
  lawyer: BarCouncilLawyer,
  options: { dryRun?: boolean } = {}
): Promise<{ action: "created" | "updated" | "skipped"; id?: string }> {
  if (options.dryRun) {
    console.log(`[DRY RUN] Would save lawyer: ${lawyer.name}`);
    return { action: "skipped" };
  }

  const supabase = createServiceRoleClient();

  // Check if lawyer already exists (by bar number or name)
  const { data: existing } = await supabase
    .from("lawyers")
    .select("id, name, bar_membership_number, last_scraped_at, firm_name")
    .or(
      `bar_membership_number.eq.${lawyer.barMembershipNumber || ""},name.ilike.${lawyer.name}`
    )
    .limit(1)
    .single();

  const admissionDate = parseAdmissionDate(lawyer.admissionDate || "");
  const yearsAtBar = calculateYearsAtBar(admissionDate);
  const city = extractCity(lawyer.firmAddress || "", lawyer.state || "");

  // Get or create firm (with deduplication)
  let firmId: string | null = null;
  if (lawyer.firmName) {
    try {
      const firm = await getOrCreateFirm(
        supabase,
        lawyer.firmName,
        lawyer.firmAddress || null,
        lawyer.state || null,
        city || lawyer.city || null
      );
      firmId = firm.id;
    } catch (error) {
      console.warn(`Failed to get/create firm for ${lawyer.name}:`, error);
    }
  }

  const lawyerData = {
    name: lawyer.name,
    bar_membership_number: lawyer.barMembershipNumber,
    firm_name: lawyer.firmName,
    primary_firm_id: firmId,
    address: lawyer.firmAddress,
    phone: lawyer.phone,
    email: lawyer.email,
    state: lawyer.state,
    city: city || lawyer.city,
    bar_admission_date: admissionDate?.toISOString(),
    bar_status: lawyer.isActive ? "active" : "inactive",
    years_at_bar: yearsAtBar,
    is_verified: true, // Bar Council verified
    is_claimed: false,
    is_active: lawyer.isActive,
    last_scraped_at: new Date().toISOString(),
    scraped_data: {
      source: "malaysian_bar_council",
      sourceUrl: lawyer.sourceUrl,
      scrapedAt: lawyer.scrapedAt.toISOString(),
      rawPracticeAreas: lawyer.practiceAreas,
    },
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing lawyer
    const { error } = await supabase
      .from("lawyers")
      .update(lawyerData)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update lawyer: ${error.message}`);
    }

    // Track firm history if firm changed
    if (lawyer.firmName && existing.firm_name !== lawyer.firmName) {
      await trackFirmHistory(
        supabase,
        existing.id,
        lawyer.firmName,
        firmId,
        lawyer.firmAddress || null
      );
    }

    return { action: "updated", id: existing.id };
  } else {
    // Create new lawyer
    const slug = generateSlug(lawyer.name);

    // Check for slug uniqueness
    const { data: slugExists } = await supabase
      .from("lawyers")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .single();

    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const { data: created, error } = await supabase
      .from("lawyers")
      .insert({
        ...lawyerData,
        slug: finalSlug,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Failed to create lawyer: ${error.message}`);
    }

    // Track initial firm history
    if (created?.id && lawyer.firmName) {
      await trackFirmHistory(
        supabase,
        created.id,
        lawyer.firmName,
        firmId,
        lawyer.firmAddress || null
      );
    }

    return { action: "created", id: created?.id };
  }
}

/**
 * Link a lawyer to practice areas
 */
export async function linkPracticeAreas(
  lawyerId: string,
  practiceAreas: string[]
): Promise<void> {
  if (!practiceAreas.length) return;

  const supabase = createServiceRoleClient();

  // Get practice area IDs from slugs
  const slugs = practiceAreas
    .map((pa) => PRACTICE_AREA_MAPPINGS[pa] || generateSlug(pa))
    .filter(Boolean);

  if (!slugs.length) return;

  const { data: areas } = await supabase
    .from("practice_areas")
    .select("id")
    .in("slug", slugs);

  if (!areas?.length) return;

  // Delete existing associations
  await supabase.from("lawyer_practice_areas").delete().eq("lawyer_id", lawyerId);

  // Insert new associations
  const associations = areas.map((area: { id: string }) => ({
    lawyer_id: lawyerId,
    practice_area_id: area.id,
  }));

  await supabase.from("lawyer_practice_areas").insert(associations);
}

/**
 * Log scraping activity to the database
 */
export async function logScrapingJob(
  result: Partial<ScrapingResult>,
  status: "running" | "completed" | "failed" | "partial"
): Promise<string> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("scraping_logs")
    .insert({
      job_type: "lawyer_profile",
      source_type: "bar_council",
      source_url: "https://legaldirectory.malaysianbar.org.my/",
      status,
      records_processed: result.totalProcessed || 0,
      records_created: result.created || 0,
      records_updated: result.updated || 0,
      records_skipped: result.skipped || 0,
      error_count: result.errors?.length || 0,
      errors: result.errors,
      duration_ms: result.duration,
      started_at: new Date().toISOString(),
      completed_at: status !== "running" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to log scraping job:", error);
    return "";
  }

  return data?.id || "";
}

/**
 * Update scraping job log
 */
export async function updateScrapingLog(
  logId: string,
  result: Partial<ScrapingResult>,
  status: "running" | "completed" | "failed" | "partial"
): Promise<void> {
  if (!logId) return;

  const supabase = createServiceRoleClient();

  await supabase
    .from("scraping_logs")
    .update({
      status,
      records_processed: result.totalProcessed,
      records_created: result.created,
      records_updated: result.updated,
      records_skipped: result.skipped,
      error_count: result.errors?.length || 0,
      errors: result.errors,
      duration_ms: result.duration,
      completed_at: status !== "running" ? new Date().toISOString() : null,
    })
    .eq("id", logId);
}

/**
 * Fetch directory page HTML using Playwright browser automation
 *
 * The Malaysian Bar Council directory requires JavaScript form interaction
 * to trigger searches. This function:
 * 1. Navigates to the directory
 * 2. Selects "Lawyer" type and target state
 * 3. Submits the search form
 * 4. Waits for results to load
 * 5. Handles pagination if needed
 */
export async function fetchDirectoryPage(
  state: string,
  page: number
): Promise<{ html: string; totalPages: number } | null> {
  const BASE_URL = "https://legaldirectory.malaysianbar.org.my";
  console.log(`[Bar Council] Fetching page ${page} for state: ${state}`);

  // Get the state code for the dropdown
  const stateCode = STATE_CODE_MAPPING[state];
  if (!stateCode) {
    console.error(`[Bar Council] Unknown state: ${state}`);
    return null;
  }

  let browserPage: Page | null = null;

  try {
    const browser = await getBrowser();
    browserPage = await browser.newPage();

    // Set a reasonable timeout
    browserPage.setDefaultTimeout(60000);

    // Navigate to the directory
    await browserPage.goto(BASE_URL, { waitUntil: "networkidle" });

    // Wait for the search form to be available
    await browserPage.waitForSelector("#lawyerSearchFm", { state: "visible" });

    // Select "Lawyer" type (radio button)
    // The radio button has name="searchtype[]" and value="Lawyer"
    await browserPage.click('input#searchtypelawyer');

    // Select the state from the dropdown using the value code
    await browserPage.selectOption("select#state", stateCode);

    // Small delay to let any JS handlers fire
    await browserPage.waitForTimeout(500);

    // Click the search/submit button
    await browserPage.click('input#submit');

    // Wait for navigation to results page or for results to appear
    await browserPage.waitForURL("**/search-result**", { timeout: 30000 }).catch(() => {
      // If URL doesn't change, wait for content to load
      return browserPage!.waitForLoadState("networkidle");
    });

    // Give extra time for dynamic content to render
    await browserPage.waitForTimeout(2000);

    // Handle pagination if page > 1
    // The site uses a dropdown select with id="lawyerpage" for pagination
    if (page > 1) {
      // Check if the page exists in the dropdown
      const pageExists = await browserPage.$(`select#lawyerpage option[value="${page}"]`);
      if (!pageExists) {
        console.log(`[Bar Council] Page ${page} not available in pagination dropdown`);
        await browserPage.close();
        return null;
      }

      // Select the page from the dropdown - this triggers getLawyerPage() via onchange
      await browserPage.selectOption("select#lawyerpage", String(page));

      // Wait for AJAX to load new results
      await browserPage.waitForTimeout(2000);
      await browserPage.waitForLoadState("networkidle");
      await browserPage.waitForTimeout(1000);
    }

    // Extract the HTML content
    const html = await browserPage.content();

    // Determine total pages from the pagination dropdown
    let totalPages = 1;

    // The site uses a select dropdown with id="lawyerpage" for pagination
    // Count the number of options to get total pages
    const pageCount = await browserPage.$$eval(
      "select#lawyerpage option",
      (options) => options.length
    ).catch(() => 0);

    if (pageCount > 0) {
      totalPages = pageCount;
    } else {
      // Fallback: try to parse from the "X entries" text
      const entriesText = await browserPage.$eval(
        "#lawyerBar",
        (el) => el.textContent || ""
      ).catch(() => "");

      const entriesMatch = entriesText.match(/(\d+)\s*entries/i);
      if (entriesMatch) {
        const totalEntries = parseInt(entriesMatch[1]!, 10);
        // 20 results per page (10 shown at a time, so likely 20 per dropdown page)
        // But based on our test, it's 10 per page
        totalPages = Math.ceil(totalEntries / 10);
      }
    }

    await browserPage.close();
    return { html, totalPages };
  } catch (error) {
    console.error(`[Bar Council] Error fetching page ${page} for state ${state}:`, error);
    if (browserPage) {
      await browserPage.close().catch(() => {});
    }
    return null;
  }
}

/**
 * Parse lawyer data from HTML using Cheerio
 *
 * The Malaysian Bar Council directory uses a specific structure:
 * - div.tblRow for each lawyer row
 * - div.tblCol1 - Name
 * - div.tblCol2 - Location
 * - div.tblCol4 - Status
 * - div.tblCol5 - Firm name and phone
 * - Hidden detail panel with admission date, full address, contact info
 */
export function parseLawyersFromHtml(
  html: string,
  state: string
): BarCouncilLawyer[] {
  console.log(`[Bar Council] Parsing HTML for state: ${state}`);

  const $ = cheerio.load(html);
  const lawyers: BarCouncilLawyer[] = [];
  const sourceUrl = "https://legaldirectory.malaysianbar.org.my/v/search-result";

  // Find all lawyer rows using the specific class
  $(".tblRow").each((index, element) => {
    const $row = $(element);

    // Extract name from tblCol1
    const nameText = $row.find(".tblCol1").text().trim();
    if (!nameText || nameText.length < 2) {
      return; // Skip empty rows
    }

    // Clean up name - remove extra whitespace and newlines
    const name = nameText.replace(/\s+/g, " ").trim();

    // Extract location from tblCol2
    const locationText = $row.find(".tblCol2").text().trim();
    const locationParts = locationText.split(",").map(p => p.trim());
    const city = locationParts[0] || undefined;

    // Extract status from tblCol4
    const statusText = $row.find(".tblCol4").text().trim().toLowerCase();
    const isActive = statusText.includes("active") && !statusText.includes("inactive");

    // Extract firm info from tblCol5
    const firmNameEl = $row.find(".tblCol5 .stblCol2").first();
    const firmName = firmNameEl.text().trim() || undefined;

    // Find the corresponding detail panel
    // The panel has id like "lpDetail0", "lpDetail1", etc.
    const detailPanelId = `#lpDetail${index}`;
    const $detail = $(detailPanelId);

    let admissionDate: string | undefined;
    let firmAddress: string | undefined;
    let phone: string | undefined;
    let fax: string | undefined;
    let email: string | undefined;

    if ($detail.length) {
      // Extract admission date
      $detail.find(".ctblCol1").each((_, col1) => {
        const label = $(col1).text().trim().toLowerCase();
        const value = $(col1).next(".ctblCol2").text().trim();

        if (label.includes("admission")) {
          admissionDate = value;
        }
      });

      // Extract firm address - it's in the "Firm:" section's ctblCol2
      $detail.find(".ctblCol1").each((_, col1) => {
        const label = $(col1).text().trim().toLowerCase();
        if (label.includes("firm:")) {
          const $firmCol = $(col1).next(".ctblCol2");
          // The address is in uppercase span after the firm name
          const addressSpan = $firmCol.find("span[style*='uppercase']").text().trim();
          if (addressSpan) {
            firmAddress = addressSpan.replace(/\s+/g, " ");
          }

          // Extract contact details from nested stblCol elements
          $firmCol.find(".stblCol1").each((_, stbl1) => {
            const contactLabel = $(stbl1).text().trim().toLowerCase();
            const contactValue = $(stbl1).next(".stblCol2").text().trim();

            if (contactLabel.includes("tel")) {
              phone = contactValue;
            } else if (contactLabel.includes("fax")) {
              fax = contactValue;
            } else if (contactLabel.includes("email")) {
              email = contactValue;
            }
          });

          // Also check for email in anchor tag
          const emailLink = $firmCol.find("a[href^='mailto:']").text().trim();
          if (emailLink && !email) {
            email = emailLink;
          }
        }
      });
    }

    // If no phone found in detail, try the main row
    if (!phone) {
      const rowPhone = $row.find(".tblCol5 .stblCol2").last().text().trim();
      if (rowPhone && /\d/.test(rowPhone)) {
        phone = rowPhone;
      }
    }

    lawyers.push({
      name,
      firmName,
      firmAddress,
      phone,
      fax,
      email,
      state: normalizeStateName(state),
      city,
      admissionDate,
      isActive,
      scrapedAt: new Date(),
      sourceUrl,
    });
  });

  console.log(`[Bar Council] Found ${lawyers.length} lawyers for state: ${state}`);
  return lawyers;
}


/**
 * Normalize state name to match our database format
 */
function normalizeStateName(state: string): string {
  const stateMapping: Record<string, string> = {
    "Johore": "Johor",
    "Wilayah Persekutuan Kuala Lumpur": "Kuala Lumpur",
    "Wilayah Persekutuan Labuan": "Labuan",
    "Wilayah Persekutuan Putrajaya": "Putrajaya",
  };
  return stateMapping[state] || state;
}

/**
 * Main scraping function - scrapes all lawyers from the Bar Council directory
 */
export async function scrapeBarCouncilDirectory(options: {
  states?: MalaysianState[];
  maxPages?: number;
  dryRun?: boolean;
  onProgress?: (progress: ScrapingProgress) => void;
}): Promise<ScrapingResult> {
  const startTime = Date.now();
  const states = options.states || MALAYSIAN_STATES;
  const maxPages = options.maxPages || 100;

  const result: ScrapingResult = {
    success: true,
    totalProcessed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    duration: 0,
  };

  // Log job start
  const logId = await logScrapingJob(result, "running");

  for (const state of states) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= maxPages) {
      try {
        // Fetch directory page
        const pageResult = await fetchDirectoryPage(state, page);

        if (!pageResult) {
          console.log(`[Bar Council] No data for ${state} page ${page}`);
          break;
        }

        totalPages = pageResult.totalPages;

        // Parse lawyers from HTML
        const lawyers = parseLawyersFromHtml(pageResult.html, state);

        // Save each lawyer
        for (const lawyer of lawyers) {
          try {
            const saveResult = await saveLawyer(lawyer, { dryRun: options.dryRun });
            result.totalProcessed++;

            if (saveResult.action === "created") {
              result.created++;

              // Link practice areas for new lawyers
              if (saveResult.id && lawyer.practiceAreas?.length) {
                await linkPracticeAreas(saveResult.id, lawyer.practiceAreas);
              }
            } else if (saveResult.action === "updated") {
              result.updated++;
            } else {
              result.skipped++;
            }
          } catch (error) {
            result.errors.push({
              lawyer: lawyer.name,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Report progress
        if (options.onProgress) {
          options.onProgress({
            state,
            page,
            totalPages,
            lawyersProcessed: result.totalProcessed,
            lawyersCreated: result.created,
            lawyersUpdated: result.updated,
            lawyersSkipped: result.skipped,
            errors: result.errors,
          });
        }

        page++;

        // Rate limiting - be respectful to the server
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        result.errors.push({
          error: `Failed to scrape ${state} page ${page}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });

        // Continue with next state on error
        break;
      }
    }
  }

  result.duration = Date.now() - startTime;
  result.success = result.errors.length < result.totalProcessed / 10; // Success if <10% errors

  // Close browser when done
  await closeBrowser();

  // Update log
  await updateScrapingLog(logId, result, result.success ? "completed" : "partial");

  return result;
}

// Export types for use in other modules
export type { MalaysianState as State };
