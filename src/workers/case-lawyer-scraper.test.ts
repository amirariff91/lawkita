import { describe, expect, test } from "bun:test";
import {
  confidenceForSource,
  slugifyLawyerName,
} from "./case-lawyer-scraper";

describe("case-lawyer scraper", () => {
  test("creates stable lawyer slugs", () => {
    expect(slugifyLawyerName("  Datuk Siti, Aisyah  ")).toBe("datuk-siti-aisyah");
    expect(slugifyLawyerName("Tan & Partners")).toBe("tan-partners");
  });

  test("assigns stronger confidence to primary sources", () => {
    expect(confidenceForSource("court_record")).toBe(1);
    expect(confidenceForSource("bar_council")).toBeGreaterThan(
      confidenceForSource("news")
    );
    expect(confidenceForSource("wikipedia")).toBe(0.7);
  });
});
