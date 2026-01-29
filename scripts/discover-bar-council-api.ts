#!/usr/bin/env bun
/**
 * API Discovery Script for Malaysian Bar Council Legal Directory
 *
 * Uses Playwright to:
 * 1. Navigate to the directory
 * 2. Capture network requests during search
 * 3. Identify API endpoints and their structure
 */

import { chromium } from "playwright";

interface CapturedRequest {
  url: string;
  method: string;
  postData?: string;
  responseStatus?: number;
  responseBody?: string;
  contentType?: string;
}

async function discoverApi() {
  console.log("Starting API discovery for Malaysian Bar Council Legal Directory...\n");

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const capturedRequests: CapturedRequest[] = [];

  // Capture all network requests
  page.on("request", (request) => {
    const url = request.url();
    // Focus on API calls, not static assets
    if (
      !url.includes(".js") &&
      !url.includes(".css") &&
      !url.includes(".png") &&
      !url.includes(".jpg") &&
      !url.includes(".gif") &&
      !url.includes(".woff") &&
      !url.includes(".svg") &&
      !url.includes("google") &&
      !url.includes("facebook")
    ) {
      capturedRequests.push({
        url,
        method: request.method(),
        postData: request.postData() || undefined,
      });
    }
  });

  page.on("response", async (response) => {
    const url = response.url();
    const request = capturedRequests.find(r => r.url === url && !r.responseStatus);
    if (request) {
      request.responseStatus = response.status();
      request.contentType = response.headers()["content-type"] || "";

      // Capture response for all requests (not just JSON)
      try {
        const body = await response.text();
        if (body.length < 5000) {
          request.responseBody = body;
        } else {
          request.responseBody = body.substring(0, 5000) + "...[truncated]";
        }
      } catch {
        // Ignore errors
      }
    }
  });

  console.log("Navigating to https://legaldirectory.malaysianbar.org.my/...");
  await page.goto("https://legaldirectory.malaysianbar.org.my/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  console.log("Page loaded. Waiting for content...\n");
  await page.waitForTimeout(3000);

  // Take a screenshot
  await page.screenshot({ path: "/tmp/bar-council-initial.png", fullPage: true });
  console.log("Screenshot saved to /tmp/bar-council-initial.png\n");

  // Get page content for analysis
  console.log("Page title:", await page.title());
  console.log("Page URL:", page.url());

  // Look for dropdown buttons (custom selects)
  console.log("\n--- Looking for dropdown buttons ---");

  const dropdownButtons = await page.$$("button.multiselect, button.dropdown-toggle");
  console.log(`Found ${dropdownButtons.length} dropdown buttons`);

  for (let i = 0; i < dropdownButtons.length; i++) {
    const btn = dropdownButtons[i];
    const text = await btn.textContent();
    const ariaLabel = await btn.evaluate(e => e.getAttribute("aria-label") || "");
    console.log(`  ${i}: "${text?.trim()}" aria-label="${ariaLabel}"`);
  }

  // Look for the state dropdown specifically
  console.log("\n--- Looking for state-related elements ---");

  // Find elements with 'state' in their attributes
  const stateElements = await page.$$("[id*='state'], [name*='state'], [data-*='state']");
  console.log(`Found ${stateElements.length} state-related elements`);

  for (const el of stateElements) {
    const tagName = await el.evaluate(e => e.tagName);
    const id = await el.evaluate(e => e.id);
    const className = await el.evaluate(e => e.className);
    console.log(`  <${tagName}> id="${id}" class="${className}"`);
  }

  // Try to click on "State" dropdown or similar
  console.log("\n--- Attempting to interact with dropdowns ---");

  // Find the state dropdown button by looking for nearby labels or the select
  const stateLabel = await page.$("label[for='state'], text=State");
  if (stateLabel) {
    console.log("Found state label");
    // Click on the dropdown next to it
    const nearbyDropdown = await page.$("button.multiselect >> nth=2");
    if (nearbyDropdown) {
      console.log("Clicking nearby dropdown...");
      await nearbyDropdown.click();
      await page.waitForTimeout(1000);
    }
  }

  // Look for the actual dropdown options
  const dropdownItems = await page.$$(".dropdown-item, .multiselect-option");
  console.log(`Found ${dropdownItems.length} dropdown items`);

  // Print first 10 dropdown items
  for (let i = 0; i < Math.min(10, dropdownItems.length); i++) {
    const text = await dropdownItems[i].textContent();
    console.log(`  ${i}: "${text?.trim()}"`);
  }

  // Try clicking on "Kuala Lumpur" option if visible
  console.log("\n--- Trying to select 'Kuala Lumpur' ---");
  const klOption = await page.$("button:has-text('Kuala Lumpur'), .dropdown-item:has-text('Kuala Lumpur')");
  if (klOption) {
    console.log("Found 'Kuala Lumpur' option, clicking...");
    await klOption.click();
    await page.waitForTimeout(2000);
  } else {
    // Try clicking all dropdown buttons to find the state one
    console.log("Searching for state dropdown...");

    for (let i = 0; i < dropdownButtons.length; i++) {
      console.log(`\nTrying dropdown ${i}...`);
      await dropdownButtons[i].click();
      await page.waitForTimeout(500);

      // Check if "Kuala Lumpur" is now visible
      const klVisible = await page.$("button:has-text('Kuala Lumpur'):visible, .dropdown-item:has-text('Kuala Lumpur'):visible");
      if (klVisible) {
        console.log("Found state dropdown! Clicking 'Kuala Lumpur'...");
        await klVisible.click();
        await page.waitForTimeout(1000);
        break;
      } else {
        // Look for state names
        const visibleOptions = await page.$$(".dropdown-item:visible, .multiselect-option:visible");
        if (visibleOptions.length > 0) {
          const firstText = await visibleOptions[0].textContent();
          console.log(`  First visible option: "${firstText?.trim()}"`);
        }
      }

      // Close dropdown
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  }

  // Look for search/submit button
  console.log("\n--- Looking for search button ---");
  const searchBtn = await page.$("button:has-text('Search'), button:has-text('Find'), input[type='submit'], button[type='submit']");
  if (searchBtn) {
    console.log("Found search button, clicking...");
    await searchBtn.click();
    await page.waitForTimeout(3000);
  }

  // Take another screenshot
  await page.screenshot({ path: "/tmp/bar-council-after-search.png", fullPage: true });
  console.log("Screenshot saved to /tmp/bar-council-after-search.png\n");

  // Print captured requests
  console.log("\n--- Captured Network Requests ---");

  for (const req of capturedRequests) {
    if (req.url !== page.url()) {
      console.log(`\n${req.method} ${req.url}`);
      if (req.postData) {
        console.log(`  POST Data: ${req.postData}`);
      }
      if (req.responseStatus) {
        console.log(`  Status: ${req.responseStatus}`);
        console.log(`  Content-Type: ${req.contentType}`);
      }
      if (req.responseBody && req.responseBody.length > 0) {
        console.log(`  Response: ${req.responseBody.substring(0, 1000)}`);
      }
    }
  }

  // Analyze page structure
  console.log("\n--- Analyzing current page structure ---");

  // Look for lawyer listings
  const pageHtml = await page.content();

  // Check for table
  const tables = await page.$$("table");
  console.log(`Found ${tables.length} tables`);

  if (tables.length > 0) {
    for (let i = 0; i < tables.length; i++) {
      const rows = await tables[i].$$("tr");
      console.log(`  Table ${i}: ${rows.length} rows`);

      if (rows.length > 1) {
        // Get header
        const headerCells = await rows[0].$$("th, td");
        const headers: string[] = [];
        for (const cell of headerCells) {
          headers.push((await cell.textContent())?.trim() || "");
        }
        console.log(`    Headers: ${headers.join(", ")}`);

        // Get sample row
        if (rows.length > 1) {
          const dataCells = await rows[1].$$("td");
          const data: string[] = [];
          for (const cell of dataCells) {
            const text = (await cell.textContent())?.trim() || "";
            data.push(text.substring(0, 50));
          }
          console.log(`    Sample row: ${data.join(" | ")}`);
        }
      }
    }
  }

  // Check for any visible lawyer data
  const lawyerKeywords = ["advocate", "solicitor", "firm", "admission", "member"];
  for (const keyword of lawyerKeywords) {
    const elements = await page.$$(`text=${keyword}`);
    if (elements.length > 0) {
      console.log(`Found ${elements.length} elements containing "${keyword}"`);
    }
  }

  // Get the HTML structure of the main content area
  console.log("\n--- Main content analysis ---");
  const mainContent = await page.$("main, .container, #content, .content");
  if (mainContent) {
    const html = await mainContent.innerHTML();
    console.log("Main content HTML (first 2000 chars):");
    console.log(html.substring(0, 2000));
  }

  await browser.close();
  console.log("\n--- Discovery complete ---");
}

discoverApi().catch(console.error);
