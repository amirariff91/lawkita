import { describe, expect, test } from "bun:test";
import {
  MAX_TITLE_LENGTH,
  MIN_LAWYERS_FOR_INDEXING,
  TITLE_TEMPLATE_SUFFIX,
  getFirmCanonicalUrl,
  getFirmMetaDescription,
  getFirmMetaTitle,
  getLawyerCanonicalUrl,
  getLawyerMetaDescription,
  getLawyerMetaTitle,
  MAX_LAWYER_TITLE_LENGTH,
  isHubPageIndexable,
} from "./seo";
import { formatFirmName, formatPersonName } from "./name-format";

const withSuffix = (title: string) => `${title}${TITLE_TEMPLATE_SUFFIX}`;

describe("isHubPageIndexable", () => {
  test("requires at least MIN_LAWYERS_FOR_INDEXING active lawyers", () => {
    expect(MIN_LAWYERS_FOR_INDEXING).toBe(10);
    expect(isHubPageIndexable(0)).toBe(false);
    expect(isHubPageIndexable(MIN_LAWYERS_FOR_INDEXING - 1)).toBe(false);
    expect(isHubPageIndexable(MIN_LAWYERS_FOR_INDEXING)).toBe(true);
    expect(isHubPageIndexable(MIN_LAWYERS_FOR_INDEXING + 1)).toBe(true);
    expect(isHubPageIndexable(1000)).toBe(true);
  });
});

describe("getLawyerMetaTitle", () => {
  test("name, role, firm and city when it fits", () => {
    expect(getLawyerMetaTitle("Tan Wei Ming", "Akberdin & Co", "Ipoh")).toBe(
      "Tan Wei Ming – Lawyer at Akberdin & Co, Ipoh"
    );
  });

  test("drops the city first, then the firm, and never cuts the name", () => {
    const name = formatPersonName("AARON GANAPATHY NAIDU A/L ENGITARRAMAN");
    const firm = formatFirmName("AMIN PETRA & PARTNERS");
    // Was: "AARON GANAPATHY NAIDU A/L ENGITARRAMAN - AMIN PETRA & PARTNERS - Batu Caves"
    expect(getLawyerMetaTitle(name, firm, "Batu Caves")).toBe(
      "Aaron Ganapathy Naidu a/l Engitarraman – Lawyer"
    );
    expect(getLawyerMetaTitle("Siti binti Ali", "Amin Petra & Partners", "Batu Caves")).toBe(
      "Siti binti Ali – Lawyer at Amin Petra & Partners, Batu Caves"
    );
  });

  test("city without a firm", () => {
    expect(getLawyerMetaTitle("Lim Kok Wah", null, "Johor Bahru")).toBe(
      "Lim Kok Wah – Lawyer in Johor Bahru"
    );
    expect(getLawyerMetaTitle("Lim Kok Wah")).toBe("Lim Kok Wah – Lawyer");
  });

  test("stays within the title limit whenever the name allows", () => {
    const title = getLawyerMetaTitle("Lee Chong Wei", "Skrine & Partners PLT", "Kuala Lumpur");
    expect(withSuffix(title).length).toBeLessThanOrEqual(MAX_LAWYER_TITLE_LENGTH);
  });

  test("keeps the firm for a long name, up to the lawyer title limit", () => {
    expect(getLawyerMetaTitle("Haryanti binti Othman", "Abdul Rashid Rahman & Co", "Klang")).toBe(
      "Haryanti binti Othman – Lawyer at Abdul Rashid Rahman & Co"
    );
  });
});

describe("getLawyerMetaDescription", () => {
  test("states only the facts on the row, most important first", () => {
    const description = getLawyerMetaDescription({
      name: "Aaron Ganapathy Naidu a/l Engitarraman",
      firmName: "Amin Petra & Partners",
      city: "Batu Caves",
      state: "Selangor",
      barAdmissionDate: new Date("2014-06-30T16:00:00.000Z"), // 1 Jul 2014 MYT
      practiceAreas: ["Conveyancing", "Family Law", "Litigation", "Probate"],
    });
    expect(description).toBe(
      "Aaron Ganapathy Naidu a/l Engitarraman is a lawyer at Amin Petra & Partners in Batu Caves, Selangor. Admitted to the Bar in 2014."
    );
    expect(description.length).toBeLessThanOrEqual(155);
  });

  test("adds practice areas and credentials when there is room", () => {
    expect(
      getLawyerMetaDescription({
        name: "Tan Wei Ming",
        firmName: "Akberdin & Co",
        city: "Ipoh",
        state: "Perak",
        practiceAreas: ["Conveyancing", "Probate"],
        credentials: ["Commissioner for Oaths"],
      })
    ).toBe(
      "Tan Wei Ming is a lawyer at Akberdin & Co in Ipoh, Perak. Practice areas: Conveyancing, Probate. Commissioner for Oaths. View the profile on LawKita."
    );
  });

  test("uses years at the Bar only when no admission date is known", () => {
    expect(
      getLawyerMetaDescription({ name: "Lim Kok Wah", city: "Kuala Lumpur", state: "Kuala Lumpur", yearsAtBar: 12 })
    ).toBe("Lim Kok Wah is a lawyer in Kuala Lumpur. 12 years at the Bar. View the profile on LawKita.");
  });

  test("a sparse row stays short and invents nothing", () => {
    const description = getLawyerMetaDescription({ name: "Lim Kok Wah" });
    expect(description).toBe("Lim Kok Wah is a lawyer in Malaysia. View the profile on LawKita.");
    expect(description).not.toMatch(/review|rating|win|verified/i);
  });

  test("a bio only fills a record with few facts", () => {
    expect(
      getLawyerMetaDescription({ name: "Lim Kok Wah", bio: "Practising  in  Penang since the 1990s." })
    ).toBe(
      "Lim Kok Wah is a lawyer in Malaysia. Practising in Penang since the 1990s. View the profile on LawKita."
    );
    expect(
      getLawyerMetaDescription({ name: "Lim Kok Wah", bio: "Long bio.", practiceAreas: ["Probate"] })
    ).not.toContain("Long bio");
  });
});

describe("firm metadata", () => {
  test("title: firm, role and city, shortened when long", () => {
    // Was: "AKBERDIN & CO | Law Firm in Ipoh, Perak"
    expect(getFirmMetaTitle(formatFirmName("AKBERDIN & CO"), "Ipoh", "Perak")).toBe(
      "Akberdin & Co – Law Firm in Ipoh"
    );
    expect(getFirmMetaTitle("Amin Petra & Partners", null, "Selangor")).toBe(
      "Amin Petra & Partners – Law Firm in Selangor"
    );
    expect(getFirmMetaTitle("Amin Petra & Partners")).toBe(
      "Amin Petra & Partners – Law Firm in Malaysia"
    );
    expect(
      getFirmMetaTitle("Lee Hishammuddin Allen & Gledhill", "Kuala Lumpur")
    ).toBe("Lee Hishammuddin Allen & Gledhill – Law Firm");
  });

  test("description from data present only", () => {
    expect(
      getFirmMetaDescription({
        name: "Akberdin & Co",
        city: "Ipoh",
        state: "Perak",
        address: "12, Jalan Sultan Idris Shah, 30000 Ipoh,",
        phone: "05-2541234",
        lawyerCount: 3,
        practiceAreas: ["Conveyancing", "Litigation", "Probate", "Family Law"],
      })
    ).toBe(
      // The office address and contact line do not fit after the practice areas.
      "Akberdin & Co is a law firm in Ipoh, Perak with 3 lawyers listed. Practice areas: Conveyancing, Litigation, Probate."
    );
    expect(
      getFirmMetaDescription({ name: "Akberdin & Co", city: "Ipoh", phone: "05-2541234", lawyerCount: 2 })
    ).toBe(
      "Akberdin & Co is a law firm in Ipoh with 2 lawyers listed. Phone number and lawyer profiles on LawKita."
    );
    expect(getFirmMetaDescription({ name: "Tan & Tan", lawyerCount: 0 })).toBe(
      "Tan & Tan is a law firm in Malaysia."
    );
    expect(
      getFirmMetaDescription({ name: "Tan & Tan", city: "Melaka", address: "1 Jalan Hang Tuah", lawyerCount: 1 })
    ).toBe("Tan & Tan is a law firm in Melaka with 1 lawyer listed. Office: 1 Jalan Hang Tuah. Lawyer profiles on LawKita.");
  });

  test("firm canonical is absolute, on the same origin as lawyer canonicals", () => {
    const firm = new URL(getFirmCanonicalUrl("akberdin-co"));
    const lawyer = new URL(getLawyerCanonicalUrl("tan-wei-ming"));
    expect(firm.origin).toBe(lawyer.origin);
    expect(firm.pathname).toBe("/firms/akberdin-co");
  });
});
