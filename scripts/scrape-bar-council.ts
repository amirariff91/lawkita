#!/usr/bin/env bun
/**
 * Malaysian Bar Council Directory Scraper Script
 *
 * Usage:
 *   bun run scripts/scrape-bar-council.ts [options]
 *
 * Options:
 *   --dry-run        Don't save to database, just log what would happen
 *   --states         Comma-separated list of states to scrape (default: all)
 *   --max-pages      Maximum pages to scrape per state (default: 100)
 *   --help           Show help
 *
 * Examples:
 *   bun run scripts/scrape-bar-council.ts --dry-run
 *   bun run scripts/scrape-bar-council.ts --states "Kuala Lumpur,Selangor"
 *   bun run scripts/scrape-bar-council.ts --max-pages 5
 */

import {
  scrapeBarCouncilDirectory,
  MALAYSIAN_STATES,
  closeBrowser,
  type MalaysianState,
  type ScrapingProgress,
  type ScrapingResult,
} from "../src/lib/scrapers/malaysian-bar-scraper";

// Parse command line arguments
function parseArgs(): {
  dryRun: boolean;
  states: MalaysianState[] | undefined;
  maxPages: number;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    states: undefined as MalaysianState[] | undefined,
    maxPages: 100,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--states" && args[i + 1]) {
      const stateList = args[i + 1]!.split(",").map((s) => s.trim());
      options.states = stateList.filter((s) =>
        MALAYSIAN_STATES.includes(s as MalaysianState)
      ) as MalaysianState[];
      i++;
    } else if (arg === "--max-pages" && args[i + 1]) {
      options.maxPages = parseInt(args[i + 1]!, 10);
      i++;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Malaysian Bar Council Directory Scraper

Usage:
  bun run scripts/scrape-bar-council.ts [options]

Options:
  --dry-run        Don't save to database, just log what would happen
  --states         Comma-separated list of states to scrape (default: all)
  --max-pages      Maximum pages to scrape per state (default: 100)
  --help, -h       Show this help message

Available States:
  ${MALAYSIAN_STATES.join(", ")}

Examples:
  bun run scripts/scrape-bar-council.ts --dry-run
  bun run scripts/scrape-bar-council.ts --states "Kuala Lumpur,Selangor"
  bun run scripts/scrape-bar-council.ts --max-pages 5 --dry-run
`);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function printProgress(progress: ScrapingProgress): void {
  process.stdout.write(
    `\r[${progress.state}] Page ${progress.page}/${progress.totalPages} | ` +
      `Processed: ${progress.lawyersProcessed} | ` +
      `Created: ${progress.lawyersCreated} | ` +
      `Updated: ${progress.lawyersUpdated} | ` +
      `Errors: ${progress.errors.length}    `
  );
}

function printResult(result: ScrapingResult): void {
  console.log("\n");
  console.log("═".repeat(60));
  console.log("SCRAPING COMPLETED");
  console.log("═".repeat(60));
  console.log(`Status:      ${result.success ? "✓ Success" : "✗ Failed"}`);
  console.log(`Duration:    ${formatDuration(result.duration)}`);
  console.log(`Processed:   ${result.totalProcessed} lawyers`);
  console.log(`Created:     ${result.created} new profiles`);
  console.log(`Updated:     ${result.updated} existing profiles`);
  console.log(`Skipped:     ${result.skipped} (no changes)`);
  console.log(`Errors:      ${result.errors.length}`);
  console.log("═".repeat(60));

  if (result.errors.length > 0) {
    console.log("\nErrors (first 10):");
    result.errors.slice(0, 10).forEach((err, i) => {
      console.log(`  ${i + 1}. ${err.lawyer || "Unknown"}: ${err.error}`);
    });
    if (result.errors.length > 10) {
      console.log(`  ... and ${result.errors.length - 10} more errors`);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log("═".repeat(60));
  console.log("MALAYSIAN BAR COUNCIL DIRECTORY SCRAPER");
  console.log("═".repeat(60));
  console.log(`Mode:        ${options.dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`States:      ${options.states?.join(", ") || "All"}`);
  console.log(`Max Pages:   ${options.maxPages} per state`);
  console.log("═".repeat(60));
  console.log("");

  try {
    const result = await scrapeBarCouncilDirectory({
      states: options.states,
      maxPages: options.maxPages,
      dryRun: options.dryRun,
      onProgress: printProgress,
    });

    printResult(result);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("\n\n✗ Fatal error:", error);
    // Ensure browser is closed on error
    await closeBrowser().catch(() => {});
    process.exit(1);
  }
}

// Run the script
main();
