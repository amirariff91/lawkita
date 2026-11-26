import { expect, test } from "bun:test";
import { firm, lawyer, sourceFirm, sourceLawyer } from "./fixtures";
import { DOMAIN, PRIMARY, primaryKey, type ExternalId } from "./keys";
import { matchFirms, matchLawyers } from "./match";

const row = sourceLawyer({ city: "Rawang", firm_name: "Nadir & Co.", email: "rafi@example.com", roll_no: "N-42" });
const corroborated = { ...lawyer, email: "Rafi@Example.com" };
const primary: ExternalId = { entityType: "lawyer", entityId: lawyer.id, namespace: PRIMARY, value: primaryKey(row) };

test("a cross-state namesake or uncorroborated exact name never inserts or merges", () => {
  expect(matchLawyers([row], [{ ...corroborated, state: "Sabah" }], []).get(row.id)?.match)
    .toMatchObject({ action: "review", candidates: [lawyer.id] });
  expect(matchLawyers([row], [{ ...lawyer, barMembershipNumber: "N-42" }], []).get(row.id)?.match)
    .toMatchObject({ action: "review", candidates: [lawyer.id] });
});

test("corroboration plus unique name/state matches, but placeholders and inactive profiles do not", () => {
  expect(matchLawyers([row], [corroborated], []).get(row.id)?.match).toEqual({ action: "update", id: lawyer.id, tier: "B" });
  for (const protectedRow of [{ ...corroborated, barMembershipNumber: "BC12345" },
    { ...corroborated, barMembershipNumber: "BC/2345/1998" }, { ...corroborated, barMembershipNumber: "bc2/1998" },
    { ...corroborated, barMembershipNumber: "1MDB-MARKER" }, { ...corroborated, isActive: false }]) {
    expect(matchLawyers([row], [protectedRow], []).get(row.id)?.match.action).toBe("review");
  }
});

test("an external key does not override placeholder review", () => {
  const placeholder = { ...corroborated, barMembershipNumber: "BC/2345/1998" };
  expect(matchLawyers([row], [placeholder], [primary]).get(row.id)?.match)
    .toMatchObject({ action: "review", candidates: [lawyer.id] });
});

test("two Tier B contenders are quarantined, and an authoritative ID wins over Tier B", () => {
  const second = sourceLawyer({ id: 502, full_name: "Dr. Rafi B. Nadir", canonical_name: "dr rafi b nadir", email: row.email });
  const matches = matchLawyers([row, second], [corroborated], []);
  expect([matches.get(row.id)?.match.action, matches.get(second.id)?.match.action]).toEqual(["review", "review"]);
  const authoritative = matchLawyers([row, second], [corroborated], [primary]);
  expect(authoritative.get(row.id)?.match).toEqual({ action: "update", id: lawyer.id, tier: "A" });
  expect(authoritative.get(second.id)?.match.action).toBe("review");
});

test("conflicting keys and multiple Tier A owners are not auto-merged", () => {
  const websiteId: ExternalId = { entityType: "lawyer", namespace: "lawyerlawfirm-url", value: "https://lawyerlawfirm.my/lawyer/rafi-nadir", entityId: "other" };
  const linked = { ...row, source_urls: [websiteId.value] };
  const other = { ...lawyer, id: "other" };
  expect(matchLawyers([linked], [lawyer, other], [primary, websiteId]).get(row.id)?.match.action).toBe("conflict");
  const second = sourceLawyer({ id: 502, canonical_name: "dr rafi nadir" });
  const matches = matchLawyers([row, second], [lawyer], [primary, { ...primary, value: primaryKey(second) }]);
  expect([matches.get(row.id)?.match.action, matches.get(second.id)?.match.action]).toEqual(["conflict", "conflict"]);
});

test("an address alone cannot match a different firm, but corroborating tokens can", () => {
  const first = sourceFirm({ name: "Farid Zahir Aziz & Co", address: "34 Jalan Rekaan, Petaling Jaya" });
  const current = { ...firm, name: "Armin Zura & Co", address: "34 Jln. Rekaan, Petaling Jaya" };
  expect(matchFirms([first], [current], []).get(first.id)?.match.action).toBe("insert");
  expect(matchFirms([first], [{ ...current, name: "Farid Zahir Aziz Partners" }], []).get(first.id)?.match)
    .toEqual({ action: "update", id: firm.id, tier: "B" });
});

test("shared firm domains cannot merge branches or get assigned based on input order", () => {
  const branchA = sourceFirm({ website: "nadir.example" });
  const branchB = sourceFirm({ id: 302, state: "Johor", website: "nadir.example" });
  const matches = matchFirms([branchB, branchA], [], []);
  expect([...matches.values()]).toEqual([
    { match: { action: "insert" }, keys: [{ namespace: PRIMARY, value: primaryKey(branchB) }] },
    { match: { action: "insert" }, keys: [{ namespace: PRIMARY, value: primaryKey(branchA) }] },
  ]);
  const preexisting = matchFirms([branchB, branchA], [firm], [
    { entityType: "firm", entityId: firm.id, namespace: PRIMARY, value: primaryKey(branchA) },
    { entityType: "firm", entityId: firm.id, namespace: DOMAIN, value: "nadir.example" },
  ]);
  expect(preexisting.get(branchA.id)?.match.action).toBe("update");
  expect(preexisting.get(branchB.id)?.match.action).toBe("conflict");
});

test("a shared office mailbox or a switchboard number alone does not identify a person", () => {
  const office = sourceLawyer({ email: "info@example.com", phone: "0312345678" });
  expect(matchLawyers([office], [{ ...lawyer, email: "info@example.com" }], []).get(office.id)?.match.action).toBe("review");
  expect(matchLawyers([office], [{ ...lawyer, phone: "0312345678" }], []).get(office.id)?.match.action).toBe("review");
  const atFirm = sourceLawyer({ firm_name: "Nadir & Co.", phone: "0312345678" });
  expect(matchLawyers([atFirm], [{ ...lawyer, firmName: "NADIR & CO", phone: "03-1234 5678" }], []).get(atFirm.id)?.match)
    .toEqual({ action: "update", id: lawyer.id, tier: "B" });
});

test("an admission date stored as midnight in Malaysia equals the same calendar day in the dataset", () => {
  const dated = sourceLawyer({ admission_date: "2024-03-01" });
  const stored = { ...lawyer, barAdmissionDate: new Date("2024-02-29T16:00:00Z") };
  expect(matchLawyers([dated], [stored], []).get(dated.id)?.match).toEqual({ action: "update", id: lawyer.id, tier: "B" });
  // A date this importer stored itself (midnight UTC) is the same day too.
  const utcMidnight = { ...lawyer, barAdmissionDate: new Date("2024-03-01T00:00:00Z") };
  expect(matchLawyers([dated], [utcMidnight], []).get(dated.id)?.match.action).toBe("update");
  const dayBefore = { ...lawyer, barAdmissionDate: new Date("2024-02-28T16:00:00Z") };
  expect(matchLawyers([dated], [dayBefore], []).get(dated.id)?.match.action).toBe("review");
});
