import { describe, expect, test } from "bun:test";
import {
  buildFirmAbout,
  credentialHubCounts,
  findPracticeArea,
  firmAboutText,
  firmPlaceLabel,
  joinList,
  locationHubHref,
  practiceAreaHref,
  resolveFirmPlace,
  type FirmAboutInput,
} from "./firm-about";

const sparse: FirmAboutInput = {
  name: "Ahmad & Co",
  city: "Kota Bharu",
  state: "Kelantan",
  lawyerCount: 1,
  avgYearsExperience: null,
  practiceAreas: [],
  currentYear: 2026,
};

const rich: FirmAboutInput = {
  name: "Tan Lee & Partners",
  city: "Petaling Jaya",
  state: "Selangor",
  foundedYear: 1998,
  lawyerCount: 12,
  avgYearsExperience: 14.36,
  earliestAdmissionYear: 1985,
  practiceAreas: [
    "Corporate Law",
    "Conveyancing",
    "Family Law",
    "Criminal Law",
    "Employment Law",
    "Intellectual Property",
    "Banking",
  ],
  languages: ["English", "Bahasa Melayu", "Mandarin"],
  legalNetworks: ["ALFA International"],
  lawyerCredentials: [
    ["Commissioner for Oaths"],
    ["Commissioner for Oaths", "Notary Public"],
    ["Peguam Syarie"],
    ["Unknown Panel"],
  ],
  place: resolveFirmPlace("Selangor", "Petaling Jaya"),
  currentYear: 2026,
};

describe("buildFirmAbout", () => {
  test("sparse firm gets a short, true paragraph", () => {
    expect(firmAboutText(buildFirmAbout(sparse))).toBe(
      "Ahmad & Co is a law firm in Kota Bharu, Kelantan. LawKita lists 1 lawyer at the firm."
    );
  });

  test("firm with no place, no lawyers", () => {
    const text = firmAboutText(
      buildFirmAbout({ ...sparse, city: null, state: null, lawyerCount: 0 })
    );
    expect(text).toBe(
      "Ahmad & Co is a law firm in Malaysia. LawKita does not currently list any lawyers at the firm."
    );
  });

  test("single lawyer with experience and admission year", () => {
    const text = firmAboutText(
      buildFirmAbout({ ...sparse, avgYearsExperience: 1, earliestAdmissionYear: 2025 })
    );
    expect(text).toContain("LawKita lists 1 lawyer at the firm, with 1 year at the Bar (admitted in 2025).");
  });

  test("rich firm includes every clause in order", () => {
    const parts = buildFirmAbout(rich);
    const text = firmAboutText(parts);
    expect(text).toBe(
      "Tan Lee & Partners is a law firm in Petaling Jaya, Selangor, founded in 1998. " +
        "LawKita lists 12 lawyers at the firm, with an average of 14.4 years at the Bar. " +
        "The earliest Bar admission among them was in 1985. " +
        "Practice areas listed by its lawyers include Corporate Law, Conveyancing, Family Law, Criminal Law, Employment Law and 2 more. " +
        "Its lawyers include 2 commissioners for oaths, 1 notary public and 1 syariah lawyer. " +
        "Languages listed for the firm are English, Bahasa Melayu and Mandarin. " +
        "It is listed as a member of ALFA International."
    );
  });

  test("credential mentions link to the city services hub", () => {
    const links = buildFirmAbout(rich).filter((part) => part.href);
    expect(links).toEqual([
      {
        text: "2 commissioners for oaths",
        href: "/lawyers/services/commissioner-for-oaths/selangor/petaling-jaya",
      },
      { text: "1 notary public", href: "/lawyers/services/notary-public/selangor/petaling-jaya" },
      { text: "1 syariah lawyer", href: "/lawyers/services/syariah-lawyers/selangor/petaling-jaya" },
    ]);
  });

  test("credential links fall back to the state or national hub", () => {
    const base = { ...sparse, lawyerCredentials: [["Notary Public"]] };
    const stateOnly = buildFirmAbout({ ...base, place: resolveFirmPlace("Kelantan", "Nowhere") });
    expect(stateOnly.find((part) => part.href)?.href).toBe("/lawyers/services/notary-public/kelantan");
    const none = buildFirmAbout(base);
    expect(none.find((part) => part.href)?.href).toBe("/lawyers/services/notary-public");
  });

  test("implausible founded and admission years are left out", () => {
    const text = firmAboutText(
      buildFirmAbout({ ...rich, foundedYear: 3000, earliestAdmissionYear: 1200 })
    );
    expect(text).not.toContain("founded");
    expect(text).not.toContain("earliest");
  });

  test("single practice area and language read naturally", () => {
    const text = firmAboutText(
      buildFirmAbout({ ...sparse, practiceAreas: ["Conveyancing"], languages: ["English"] })
    );
    expect(text).toContain("Its lawyers list Conveyancing as a practice area.");
    expect(text).toContain("The language listed for the firm is English.");
  });

  test("never makes quality claims", () => {
    const text = firmAboutText(buildFirmAbout(rich)).toLowerCase();
    for (const word of ["leading", "best", "top", "won", "win", "loss", "award"]) {
      expect(text).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  test("a city named like its state appears once", () => {
    expect(firmPlaceLabel("Melaka", "Melaka")).toBe("Melaka");
    expect(firmPlaceLabel(null, "Perak")).toBe("Perak");
    expect(firmPlaceLabel(null, null)).toBeNull();
  });
});

describe("place and hub links", () => {
  test("resolves state and city by name, tolerant of spacing", () => {
    expect(resolveFirmPlace("Penang", "Georgetown")).toEqual({
      state: { name: "Penang", slug: "penang" },
      city: { name: "George Town", slug: "george-town" },
    });
    expect(resolveFirmPlace("Kuala Lumpur", "Kuala Lumpur")).toEqual({
      state: { name: "Kuala Lumpur", slug: "kuala-lumpur" },
    });
    expect(resolveFirmPlace("Atlantis", "Petaling Jaya")).toEqual({});
    expect(resolveFirmPlace(null, "Petaling Jaya")).toEqual({});
  });

  test("location hub links only for resolved places", () => {
    const place = resolveFirmPlace("Selangor", "Shah Alam");
    expect(locationHubHref(place, "city")).toBe("/lawyers/location/selangor/shah-alam");
    expect(locationHubHref(place, "state")).toBe("/lawyers/location/selangor");
    expect(locationHubHref(resolveFirmPlace("Selangor", "Nowhere"), "city")).toBeNull();
    expect(locationHubHref({}, "state")).toBeNull();
  });

  test("practice area links prefer the area-by-place page", () => {
    const place = resolveFirmPlace("Selangor", "Klang");
    expect(practiceAreaHref({ name: "Criminal Law", slug: "criminal-law" }, place)).toBe(
      "/lawyers/practice-area/criminal-law/selangor/klang"
    );
    expect(practiceAreaHref({ name: "Criminal Law" }, resolveFirmPlace("Selangor", null))).toBe(
      "/lawyers/practice-area/criminal-law/selangor"
    );
    expect(practiceAreaHref({ name: "criminal law" }, {})).toBe("/lawyers/practice-area/criminal-law");
  });

  test("non-user-facing areas link to the area hub only; unknown areas get no link", () => {
    expect(findPracticeArea({ name: "Securities Fraud" })?.isUserFacing).toBe(false);
    expect(practiceAreaHref({ name: "Securities Fraud" }, resolveFirmPlace("Selangor", "Klang"))).toBe(
      "/lawyers/practice-area/securities-fraud"
    );
    expect(practiceAreaHref({ name: "Space Law", slug: "space-law" }, {})).toBeNull();
  });

  test("an unknown stored slug falls back to the name", () => {
    expect(findPracticeArea({ name: "Criminal Law", slug: "not-a-slug" })?.slug).toBe("criminal-law");
  });
});

describe("helpers", () => {
  test("joinList", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["A"])).toBe("A");
    expect(joinList(["A", "B"])).toBe("A and B");
    expect(joinList(["A", "B", "C"])).toBe("A, B and C");
  });

  test("credentialHubCounts counts a lawyer once per hub", () => {
    const counts = credentialHubCounts([["MIMC Accredited Mediator", "AIAC Mediator"], ["AIAC Mediator"]]);
    expect(counts.map(({ hub, count }) => [hub.slug, count])).toEqual([["mediators", 2]]);
  });
});
