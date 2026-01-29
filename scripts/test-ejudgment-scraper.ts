#!/usr/bin/env bun
/**
 * e-Judgment Portal Scraper Test Script
 *
 * Tests the feasibility of scraping the Malaysian e-Judgment Portal
 * https://ejudgment.kehakiman.gov.my/
 *
 * Usage:
 *   bun run scripts/test-ejudgment-scraper.ts
 */

import {
  extractLawyersFromText,
  parseCaseNumber,
  parseCitation,
  parseCourt,
} from "../src/lib/scrapers/ejudgment-scraper";

const E_JUDGMENT_URL = "https://ejudgment.kehakiman.gov.my";

// Sample judgment text for testing extraction (based on real formats)
const SAMPLE_JUDGMENT_TEXT = `
IN THE HIGH COURT OF MALAYA AT KUALA LUMPUR
(COMMERCIAL DIVISION)

CIVIL SUIT NO: WA-22NCC-233-07/2018

BETWEEN

PP ... PLAINTIFF

AND

DATO' SRI NAJIB BIN TUN HJ ABD RAZAK ... DEFENDANT

CORAM: Y.A. DATUK MOHD NAZLAN BIN MOHD GHAZALI, JUDGE

For the Prosecution:
DPP Gopal Sri Ram
DPP V. Sithambaram

For the Accused:
Muhammad Shafee Abdullah
Harvinderjit Singh

JUDGMENT

[2020] MLJU 1234

Delivered this 28th day of July 2020

The accused is charged with 7 counts of criminal breach of trust...
`;

async function testUrlAccess(): Promise<{
  accessible: boolean;
  statusCode?: number;
  error?: string;
  headers?: Record<string, string>;
}> {
  console.log("\n1. Testing URL accessibility...");
  console.log(`   URL: ${E_JUDGMENT_URL}`);

  try {
    const response = await fetch(E_JUDGMENT_URL, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${headers["content-type"] || "unknown"}`);

    if (response.ok) {
      const text = await response.text();
      console.log(`   Content Length: ${text.length} bytes`);

      // Check for login page or access restrictions
      const hasLoginForm = text.includes("login") || text.includes("password");
      const hasRestriction =
        text.includes("access denied") || text.includes("unauthorized");

      if (hasLoginForm) {
        console.log("   ⚠️  Login form detected - may require authentication");
      }
      if (hasRestriction) {
        console.log("   ⚠️  Access restriction detected");
      }

      return { accessible: true, statusCode: response.status, headers };
    } else {
      return {
        accessible: false,
        statusCode: response.status,
        error: `HTTP ${response.status}`,
        headers,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.log(`   ✗ Error: ${errorMessage}`);
    return { accessible: false, error: errorMessage };
  }
}

function testTextExtraction(): void {
  console.log("\n2. Testing text extraction functions...");

  // Test case number extraction
  const caseNumber = parseCaseNumber(SAMPLE_JUDGMENT_TEXT);
  console.log(`   Case Number: ${caseNumber || "Not found"}`);

  // Test citation extraction
  const citation = parseCitation(SAMPLE_JUDGMENT_TEXT);
  console.log(`   Citation: ${citation || "Not found"}`);

  // Test court extraction
  const court = parseCourt(SAMPLE_JUDGMENT_TEXT);
  console.log(`   Court: ${court || "Not found"}`);

  // Test lawyer extraction
  const lawyers = extractLawyersFromText(SAMPLE_JUDGMENT_TEXT);
  console.log(`   Lawyers found: ${lawyers.length}`);
  lawyers.forEach((l, i) => {
    console.log(`     ${i + 1}. ${l.name} (${l.role})${l.firmName ? ` - ${l.firmName}` : ""}`);
  });
}

async function testSearchPage(): Promise<void> {
  console.log("\n3. Testing search functionality...");

  const searchUrl = `${E_JUDGMENT_URL}/search`;
  console.log(`   Search URL: ${searchUrl}`);

  try {
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    console.log(`   Status: ${response.status}`);

    if (response.ok) {
      const text = await response.text();

      // Check for search form elements
      const hasSearchForm = text.includes("search") || text.includes("cari");
      const hasFilters = text.includes("court") || text.includes("date");

      console.log(`   Search form present: ${hasSearchForm ? "Yes" : "No"}`);
      console.log(`   Filters present: ${hasFilters ? "Yes" : "No"}`);
    }
  } catch (error) {
    console.log(`   ✗ Search page not accessible`);
  }
}

function printRecommendations(urlAccessible: boolean): void {
  console.log("\n" + "═".repeat(60));
  console.log("RECOMMENDATIONS");
  console.log("═".repeat(60));

  if (urlAccessible) {
    console.log(`
✓ The e-Judgment portal is accessible.

Next Steps:
1. Manually inspect the portal structure at ${E_JUDGMENT_URL}
2. Check if authentication is required for full access
3. Review robots.txt for scraping policies
4. Consider using Firecrawl for automated scraping
5. Implement rate limiting (1 request per second recommended)

If authentication is required:
- Contact the Judiciary for API access or data partnership
- Consider using publicly available case summaries instead
- Use news articles as an alternative data source
`);
  } else {
    console.log(`
⚠️ The e-Judgment portal is not directly accessible.

Backup Plans:
1. Manual Entry: Add case data from news articles
   - Malaysian news sources cover major cases in detail
   - Use the news-lawyer-extractor for automation

2. MLJ/CLJ Subscriptions: Purchase access to legal databases
   - More reliable but expensive
   - Malayan Law Journal (MLJ)
   - Current Law Journal (CLJ)

3. Wikipedia + News: Combine public sources
   - Wikipedia has good coverage of famous cases
   - Cross-reference with news articles

4. Freedom of Information: Request case data officially
   - Contact the Courts
   - May take time but is legitimate

5. Law Firm Websites: Scrape case mentions from firm profiles
   - Many firms list notable cases
   - Lower coverage but verified data
`);
  }
}

async function main(): Promise<void> {
  console.log("═".repeat(60));
  console.log("e-JUDGMENT PORTAL SCRAPER FEASIBILITY TEST");
  console.log("═".repeat(60));
  console.log(`Target: ${E_JUDGMENT_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Test URL accessibility
  const urlResult = await testUrlAccess();

  // Test text extraction (works regardless of URL access)
  testTextExtraction();

  // Test search page
  await testSearchPage();

  // Print recommendations
  printRecommendations(urlResult.accessible);

  console.log("\n" + "═".repeat(60));
  console.log("TEST COMPLETE");
  console.log("═".repeat(60));
}

main().catch(console.error);
