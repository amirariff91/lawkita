import { expect, test } from "bun:test";
import { flattenPracticeAreas } from "@/lib/constants/practice-areas";
import { PRACTICE_AREA_MAP, practiceSlugs } from "./practice-areas";

// This worktree predates the defamation taxonomy entry on main.
const EXTRA_KNOWN_SLUGS = ["defamation"];

test("every mapped practice slug exists in the LawKita taxonomy", () => {
  const slugs = new Set([...flattenPracticeAreas().map(({ slug }) => slug), ...EXTRA_KNOWN_SLUGS]);
  const missing = Object.values(PRACTICE_AREA_MAP).flatMap((target) => target ?? []).filter((slug) => !slugs.has(slug));
  expect(missing).toEqual([]);
  expect(practiceSlugs("Defamation & Media")).toEqual(["defamation"]);
  expect(practiceSlugs("Commissioner for Oaths")).toBeNull();
  expect(practiceSlugs("Unfamiliar specialism")).toBeNull();
});
