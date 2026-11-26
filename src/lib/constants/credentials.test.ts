import { describe, expect, test } from "bun:test";
import {
  CREDENTIAL_HUBS,
  getCredentialHubBySlug,
  getCredentialHubForValue,
} from "./credentials";

describe("credential hubs", () => {
  test("slugs are the approved five, unique and URL-safe", () => {
    const slugs = CREDENTIAL_HUBS.map((hub) => hub.slug);
    expect(slugs).toEqual([
      "commissioner-for-oaths",
      "notary-public",
      "legal-aid",
      "syariah-lawyers",
      "mediators",
    ]);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test("each credential value belongs to exactly one hub", () => {
    const values = CREDENTIAL_HUBS.flatMap((hub) => [...hub.credentials]);
    expect(new Set(values).size).toBe(values.length);
    for (const hub of CREDENTIAL_HUBS) expect(hub.credentials.length).toBeGreaterThan(0);
  });

  test("every hub has English and Malay names, a summary and a description", () => {
    for (const hub of CREDENTIAL_HUBS) {
      expect(hub.name.length).toBeGreaterThan(0);
      expect(hub.malayName.length).toBeGreaterThan(0);
      expect(hub.summary.length).toBeGreaterThan(0);
      expect(hub.description.length).toBeGreaterThan(0);
      expect(hub.searchPhrases.length).toBeGreaterThan(0);
    }
  });

  test("descriptions mention no fees or prices", () => {
    for (const hub of CREDENTIAL_HUBS) {
      const text = [hub.summary, ...hub.description].join(" ");
      expect(text).not.toMatch(/\bRM\s?\d|\bfee|\bprice|\bcost|\bpercuma\b|\bfree\b/i);
    }
  });

  test("legal aid hub separates YBGK from the Jabatan Bantuan Guaman", () => {
    const text = getCredentialHubBySlug("legal-aid")!.description.join(" ");
    expect(text).toContain("Yayasan Bantuan Guaman Kebangsaan");
    expect(text).toContain("do not work for the Jabatan Bantuan Guaman");
  });

  test("lookups", () => {
    expect(getCredentialHubBySlug("notary-public")?.malayName).toBe("Notari Awam");
    expect(getCredentialHubBySlug("unknown")).toBeUndefined();
    expect(getCredentialHubForValue("Commissioner for Oaths")?.slug).toBe(
      "commissioner-for-oaths"
    );
    expect(getCredentialHubForValue("YBGK Legal Aid")?.slug).toBe("legal-aid");
    expect(getCredentialHubForValue("AIAC Mediator")?.slug).toBe("mediators");
    expect(getCredentialHubForValue("MIMC Accredited Mediator")?.slug).toBe("mediators");
    // Exact match only, and arbitrators are not mediators.
    expect(getCredentialHubForValue("commissioner for oaths")).toBeUndefined();
    expect(getCredentialHubForValue("AIAC Arbitrator")).toBeUndefined();
    expect(getCredentialHubForValue("CIArb Member")).toBeUndefined();
  });
});
