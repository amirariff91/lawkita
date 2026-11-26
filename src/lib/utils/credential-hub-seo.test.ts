import { describe, expect, test } from "bun:test";
import { getCredentialHubBySlug } from "@/lib/constants/credentials";
import {
  buildCredentialHubDescription,
  buildCredentialHubHeading,
  buildCredentialHubTitle,
  credentialHubPath,
  credentialHubRobots,
  getCredentialHubItemListSchema,
  isCredentialHubIndexable,
  levelOf,
  placeLabel,
  type HubPlace,
} from "./credential-hub-seo";

const oaths = getCredentialHubBySlug("commissioner-for-oaths")!;
const selangor = { name: "Selangor", slug: "selangor" };
const shahAlam: HubPlace = { state: selangor, city: { name: "Shah Alam", slug: "shah-alam" } };

describe("paths", () => {
  test("each level", () => {
    expect(credentialHubPath()).toBe("/lawyers/services");
    expect(credentialHubPath("notary-public")).toBe("/lawyers/services/notary-public");
    expect(credentialHubPath("notary-public", "selangor")).toBe(
      "/lawyers/services/notary-public/selangor"
    );
    expect(credentialHubPath("notary-public", "selangor", "klang", 3)).toBe(
      "/lawyers/services/notary-public/selangor/klang?page=3"
    );
    expect(credentialHubPath("notary-public", undefined, "klang")).toBe(
      "/lawyers/services/notary-public"
    );
  });
});

describe("place, level, heading, title", () => {
  test("place label and level", () => {
    expect(placeLabel({})).toBe("Malaysia");
    expect(placeLabel({ state: selangor })).toBe("Selangor");
    expect(placeLabel(shahAlam)).toBe("Shah Alam, Selangor");
    expect(levelOf({})).toBe("service");
    expect(levelOf({ state: selangor })).toBe("state");
    expect(levelOf(shahAlam)).toBe("city");
  });

  test("heading puts the Malay term alongside the English name", () => {
    expect(buildCredentialHubHeading(oaths, shahAlam)).toBe(
      "Commissioner for Oaths (Pesuruhjaya Sumpah) in Shah Alam"
    );
    expect(buildCredentialHubHeading(oaths, {})).toBe(
      "Commissioner for Oaths (Pesuruhjaya Sumpah) in Malaysia"
    );
  });

  test("titles are unique per place and per page", () => {
    const cherasKl: HubPlace = {
      state: { name: "Kuala Lumpur", slug: "kuala-lumpur" },
      city: { name: "Cheras", slug: "cheras" },
    };
    const cherasSel: HubPlace = { state: selangor, city: { name: "Cheras", slug: "cheras" } };
    expect(buildCredentialHubTitle(oaths, cherasKl)).not.toBe(
      buildCredentialHubTitle(oaths, cherasSel)
    );
    expect(buildCredentialHubTitle(oaths, shahAlam)).toBe(
      "Pesuruhjaya Sumpah in Shah Alam, Selangor"
    );
    expect(buildCredentialHubTitle(oaths, shahAlam, 2)).toBe(
      "Pesuruhjaya Sumpah in Shah Alam, Selangor - Page 2"
    );
  });
});

describe("descriptions", () => {
  test("count-aware, singular and plural, within 155 characters", () => {
    const many = buildCredentialHubDescription(oaths, shahAlam, 12);
    expect(many.startsWith("12 commissioners for oaths (Pesuruhjaya Sumpah) in Shah Alam, Selangor")).toBe(true);
    const one = buildCredentialHubDescription(oaths, shahAlam, 1);
    expect(one.startsWith("1 commissioner for oaths ")).toBe(true);
    const none = buildCredentialHubDescription(oaths, shahAlam, 0);
    expect(none.startsWith("Find a commissioner for oaths (Pesuruhjaya Sumpah) in Shah Alam")).toBe(true);
    for (const text of [many, one, none]) expect(text.length).toBeLessThanOrEqual(155);
  });
});

describe("indexability", () => {
  test("index and service pages: indexable once they list anyone", () => {
    expect(isCredentialHubIndexable("index", 0)).toBe(false);
    expect(isCredentialHubIndexable("index", 1)).toBe(true);
    expect(isCredentialHubIndexable("service", 0)).toBe(false);
    expect(isCredentialHubIndexable("service", 1)).toBe(true);
  });

  test("state and city pages use the hub threshold (10)", () => {
    for (const level of ["state", "city"] as const) {
      expect(isCredentialHubIndexable(level, 0)).toBe(false);
      expect(isCredentialHubIndexable(level, 9)).toBe(false);
      expect(isCredentialHubIndexable(level, 10)).toBe(true);
    }
  });

  test("non-finite counts fail closed", () => {
    expect(isCredentialHubIndexable("service", Number.NaN)).toBe(false);
    expect(isCredentialHubIndexable("city", Number.POSITIVE_INFINITY)).toBe(false);
  });

  test("robots value", () => {
    expect(credentialHubRobots("city", 3)).toEqual({ index: false, follow: true });
    expect(credentialHubRobots("city", 25)).toBeUndefined();
    expect(credentialHubRobots("service", 0)).toEqual({ index: false, follow: true });
  });
});

describe("ItemList JSON-LD", () => {
  test("lists profile URLs with positions continuing across pages", () => {
    const schema = getCredentialHubItemListSchema({
      name: "x",
      description: "y",
      path: "/lawyers/services/notary-public?page=2",
      total: 25,
      lawyers: [
        { slug: "a-lawyer", name: "A Lawyer" },
        { slug: "b-lawyer", name: "B Lawyer" },
      ],
      startPosition: 21,
    }) as { "@type": string; numberOfItems: number; itemListElement: Record<string, unknown>[] };
    expect(schema["@type"]).toBe("ItemList");
    expect(schema.numberOfItems).toBe(25);
    expect(schema.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 21,
      // The origin comes from NEXT_PUBLIC_APP_URL, which differs per machine.
      url: expect.stringMatching(/\/lawyers\/a-lawyer$/),
      name: "A Lawyer",
    });
    expect(schema.itemListElement[1].position).toBe(22);
  });
});
