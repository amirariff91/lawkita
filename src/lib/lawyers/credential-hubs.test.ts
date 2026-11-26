import { describe, expect, test } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { hasAnyCredential } from "@/lib/db/queries/credential-hubs";
import {
  credentialHubSitemapPaths,
  summariseCredentialHubCounts,
  type PlaceCountsRow,
} from "./credential-hubs";

function counts(partial: Record<string, number>): Record<string, number> {
  return {
    "commissioner-for-oaths": 0,
    "notary-public": 0,
    "legal-aid": 0,
    "syariah-lawyers": 0,
    mediators: 0,
    ...partial,
  };
}

describe("summariseCredentialHubCounts", () => {
  test("sums cities into states and states into the national total", () => {
    const rows: PlaceCountsRow[] = [
      { state: "Selangor", city: "Shah Alam", counts: counts({ "commissioner-for-oaths": 12 }) },
      { state: "Selangor", city: "Klang", counts: counts({ "commissioner-for-oaths": 3 }) },
      { state: "Selangor", city: null, counts: counts({ "notary-public": 1 }) },
      { state: null, city: null, counts: counts({ "legal-aid": 2 }) },
    ];
    const summary = summariseCredentialHubCounts(rows);
    expect(summary.national["commissioner-for-oaths"]).toBe(15);
    expect(summary.national["legal-aid"]).toBe(2);
    expect(summary.byState.get("Selangor")?.["commissioner-for-oaths"]).toBe(15);
    expect(summary.byState.get("Selangor")?.["notary-public"]).toBe(1);
    expect(summary.byCity.get("Selangor|Shah Alam")?.["commissioner-for-oaths"]).toBe(12);
    expect(summary.byCity.has("Selangor|")).toBe(false);
  });
});

describe("credentialHubSitemapPaths", () => {
  test("empty data (today's state): no services URLs at all", () => {
    expect(credentialHubSitemapPaths(summariseCredentialHubCounts([]))).toEqual([]);
  });

  test("lists only pages that pass the indexing rule", () => {
    const summary = summariseCredentialHubCounts([
      { state: "Selangor", city: "Shah Alam", counts: counts({ "commissioner-for-oaths": 12 }) },
      { state: "Selangor", city: "Klang", counts: counts({ "commissioner-for-oaths": 3 }) },
      // Not a city in the constants: counts toward the state, gets no city URL.
      { state: "Selangor", city: "Nowhere", counts: counts({ "commissioner-for-oaths": 20 }) },
    ]);
    const paths = credentialHubSitemapPaths(summary).map((p) => p.path);
    expect(paths).toEqual([
      "/lawyers/services",
      "/lawyers/services/commissioner-for-oaths",
      "/lawyers/services/commissioner-for-oaths/selangor",
      "/lawyers/services/commissioner-for-oaths/selangor/shah-alam",
    ]);
  });

  test("count query failed: index and national hubs only", () => {
    const paths = credentialHubSitemapPaths(null).map((p) => p.path);
    expect(paths[0]).toBe("/lawyers/services");
    expect(paths).toHaveLength(6);
    expect(paths.every((p) => p.split("/").length <= 4)).toBe(true);
  });
});

describe("hasAnyCredential", () => {
  test("renders an array-overlap with one bind parameter per value", () => {
    const query = new PgDialect().sqlToQuery(
      hasAnyCredential(["MIMC Accredited Mediator", "AIAC Mediator"])
    );
    expect(query.sql).toBe(`"lawyers"."credentials" && ARRAY[$1, $2]::text[]`);
    expect(query.params).toEqual(["MIMC Accredited Mediator", "AIAC Mediator"]);
  });

  test("no values matches nothing", () => {
    expect(new PgDialect().sqlToQuery(hasAnyCredential([])).sql).toBe("false");
  });
});
