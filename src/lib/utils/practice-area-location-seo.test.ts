import { describe, expect, test } from "bun:test";
import { getPracticeAreaBySlug } from "@/lib/constants/practice-areas";
import { MAX_TITLE_LENGTH, MIN_LAWYERS_FOR_INDEXING, TITLE_TEMPLATE_SUFFIX } from "./seo";
import {
  areaPlaceLabel,
  areaPlaceRobots,
  areaPlaceSitemapPaths,
  buildAreaPlaceDescription,
  buildAreaPlaceHeading,
  buildAreaPlaceTitle,
  countForAreaPlace,
  isAreaPlaceIndexable,
  maxAreaPlacePages,
  practiceAreaLocationPath,
  PRACTICE_AREA_LOCATION_SITEMAP_CAP,
  resolveAreaPlace,
  summariseAreaPlaceCounts,
  type AreaPlace,
  type AreaPlaceCountRow,
} from "./practice-area-location-seo";

const selangor = { name: "Selangor", slug: "selangor" };
const klang: AreaPlace = { state: selangor, city: { name: "Klang", slug: "klang" } };
const labuan: AreaPlace = {
  state: { name: "Labuan", slug: "labuan" },
  city: { name: "Labuan", slug: "labuan" },
};
const TITLE_BUDGET = MAX_TITLE_LENGTH - TITLE_TEMPLATE_SUFFIX.length;

describe("paths", () => {
  test("area, state, city, page", () => {
    expect(practiceAreaLocationPath("divorce")).toBe("/lawyers/practice-area/divorce");
    expect(practiceAreaLocationPath("divorce", "selangor")).toBe(
      "/lawyers/practice-area/divorce/selangor"
    );
    expect(practiceAreaLocationPath("divorce", "selangor", "klang")).toBe(
      "/lawyers/practice-area/divorce/selangor/klang"
    );
    expect(practiceAreaLocationPath("divorce", "selangor", "klang", 2)).toBe(
      "/lawyers/practice-area/divorce/selangor/klang?page=2"
    );
    expect(practiceAreaLocationPath("divorce", undefined, "klang")).toBe(
      "/lawyers/practice-area/divorce"
    );
  });
});

describe("resolveAreaPlace", () => {
  test("valid level 1 and level 2 areas, with parent for level 2", () => {
    const state = resolveAreaPlace("family-law", "selangor");
    expect(state?.area.slug).toBe("family-law");
    expect(state?.parent).toBeUndefined();
    expect(state?.place).toEqual({ state: selangor });

    const child = resolveAreaPlace("divorce-separation", "selangor", "klang");
    expect(child?.area.level).toBe(2);
    expect(child?.parent?.slug).toBe("family-law");
    expect(child?.place).toEqual(klang);
  });

  test("unknown or non user-facing segments are null (404)", () => {
    expect(resolveAreaPlace("nope", "selangor")).toBeNull();
    expect(resolveAreaPlace("divorce-separation", "nope")).toBeNull();
    expect(resolveAreaPlace("divorce-separation", "selangor", "nope")).toBeNull();
    // A real city in another state is not valid under this state.
    expect(resolveAreaPlace("divorce-separation", "selangor", "bangsar")).toBeNull();
    // Level 3 areas are not user-facing.
    expect(resolveAreaPlace("securities-fraud", "selangor")).toBeNull();
  });
});

describe("heading and title", () => {
  test("heading names city and state", () => {
    expect(buildAreaPlaceHeading("Divorce", klang)).toBe("Divorce Lawyers in Klang, Selangor");
    expect(buildAreaPlaceHeading("Divorce", { state: selangor })).toBe("Divorce Lawyers in Selangor");
    expect(areaPlaceLabel(labuan)).toBe("Labuan");
  });

  test("title fits the budget, drops the state when long", () => {
    expect(buildAreaPlaceTitle("Divorce", klang)).toBe("Divorce Lawyers in Klang, Selangor");
    expect(buildAreaPlaceTitle("Divorce", klang, 3)).toBe(
      "Divorce Lawyers in Klang, Selangor - Page 3"
    );
    const long: AreaPlace = {
      state: { name: "Kuala Lumpur", slug: "kuala-lumpur" },
      city: { name: "Damansara Heights", slug: "damansara-heights" },
    };
    const title = buildAreaPlaceTitle("Personal Injury", long);
    expect(title).toBe("Personal Injury Lawyers in Damansara Heights");
    expect(title.length).toBeLessThanOrEqual(TITLE_BUDGET);
  });

  test("titles are unique across places for one area", () => {
    const a = buildAreaPlaceTitle("Divorce", klang);
    const b = buildAreaPlaceTitle("Divorce", { state: selangor });
    const c = buildAreaPlaceTitle("Criminal Law", klang);
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("description", () => {
  const divorce = getPracticeAreaBySlug("divorce-separation")!;

  test("with a count, singular and plural", () => {
    const many = buildAreaPlaceDescription(divorce, klang, 12);
    expect(many.startsWith("12 divorce & separation lawyers in Klang, Selangor")).toBe(true);
    expect(many.length).toBeLessThanOrEqual(155);
    expect(buildAreaPlaceDescription(divorce, klang, 1).startsWith("1 divorce & separation lawyer in")).toBe(true);
  });

  test("zero or unknown count has no number", () => {
    const zero = buildAreaPlaceDescription(divorce, klang, 0);
    expect(zero.startsWith("Find divorce & separation lawyers in Klang, Selangor.")).toBe(true);
    expect(buildAreaPlaceDescription(divorce, klang, Number.NaN)).toBe(zero);
  });

  test("never mentions win or loss records", () => {
    const text = buildAreaPlaceDescription(divorce, klang, 30).toLowerCase();
    expect(text).not.toMatch(/\bwin|\bloss|\bwon\b|\blost\b/);
  });
});

describe("indexability", () => {
  test("threshold, zero and unknown counts", () => {
    expect(isAreaPlaceIndexable(MIN_LAWYERS_FOR_INDEXING)).toBe(true);
    expect(isAreaPlaceIndexable(MIN_LAWYERS_FOR_INDEXING - 1)).toBe(false);
    expect(isAreaPlaceIndexable(0)).toBe(false);
    expect(isAreaPlaceIndexable(Number.NaN)).toBe(false);
    expect(isAreaPlaceIndexable(Number.POSITIVE_INFINITY)).toBe(false);
    expect(areaPlaceRobots(MIN_LAWYERS_FOR_INDEXING)).toBeUndefined();
    expect(areaPlaceRobots(3)).toEqual({ index: false, follow: true });
  });
});

describe("summary and sitemap", () => {
  const rows: AreaPlaceCountRow[] = [
    { slug: "divorce-separation", state: "Selangor", city: "Klang", count: 12 },
    { slug: "divorce-separation", state: "Selangor", city: "Petaling Jaya", count: 4 },
    { slug: "divorce-separation", state: "Selangor", city: null, count: 1 },
    { slug: "divorce-separation", state: null, city: null, count: 50 },
    { slug: "criminal-law", state: "Kuala Lumpur", city: "Bangsar", count: 30 },
    // Unknown city and unknown area: counted in summaries, never in the sitemap.
    { slug: "criminal-law", state: "Kuala Lumpur", city: "Atlantis", count: 99 },
    { slug: "securities-fraud", state: "Selangor", city: "Klang", count: 40 },
  ];
  const summary = summariseAreaPlaceCounts(rows);

  test("state counts sum city rows; null state is skipped", () => {
    expect(countForAreaPlace(summary, "divorce-separation", { state: selangor })).toBe(17);
    expect(countForAreaPlace(summary, "divorce-separation", klang)).toBe(12);
    expect(
      countForAreaPlace(summary, "criminal-law", { state: { name: "Kuala Lumpur", slug: "kuala-lumpur" } })
    ).toBe(129);
  });

  test("only indexable, known combinations, most lawyers first", () => {
    const paths = areaPlaceSitemapPaths(summary);
    expect(paths.map((p) => p.path)).toEqual([
      "/lawyers/practice-area/criminal-law/kuala-lumpur",
      "/lawyers/practice-area/criminal-law/kuala-lumpur/bangsar",
      "/lawyers/practice-area/divorce-separation/selangor",
      "/lawyers/practice-area/divorce-separation/selangor/klang",
    ]);
    for (const p of paths) expect(isAreaPlaceIndexable(p.count)).toBe(true);
  });

  test("cap keeps the highest counts", () => {
    const many: AreaPlaceCountRow[] = [];
    for (let i = 0; i < 30; i++) {
      many.push({ slug: "divorce-separation", state: "Selangor", city: "Klang", count: 0 });
    }
    many.push(
      { slug: "family-law", state: "Johor", city: "Johor Bahru", count: 100 },
      { slug: "criminal-law", state: "Johor", city: "Johor Bahru", count: 20 }
    );
    const capped = areaPlaceSitemapPaths(summariseAreaPlaceCounts(many), 2);
    expect(capped.map((p) => p.count)).toEqual([100, 100]);
    expect(capped.every((p) => p.path.includes("family-law"))).toBe(true);
    expect(areaPlaceSitemapPaths(summary, 0)).toEqual([]);
    expect(PRACTICE_AREA_LOCATION_SITEMAP_CAP).toBe(5_000);
  });

  test("maximum page count from constants", () => {
    const max = maxAreaPlacePages();
    expect(max.total).toBe(max.areas * (max.states + max.cities));
    expect(max.areas).toBeGreaterThan(0);
  });
});
