import { expect, test } from "bun:test";
import { empty, firm, lawyer, sourceFirm, sourceLawyer } from "./fixtures";
import { PRIMARY, WEAK_STANDING, primaryKey, type ExternalId } from "./keys";
import { planImport, practiceLinkKey, type FirmState, type LawyerState } from "./plan";

const now = new Date("2026-07-09T11:02:00.000Z");
const options = { now, release: "fixture-2026", approvals: new Map<string, string>() };
const source = sourceLawyer({ firm_name: "Nadir & Co.", firm_id: 301, email: "NEW@EXAMPLE.COM", phone: "+601234567",
  address: "4 Jalan Rekaan", city: "Rawang", designation: "Partner", qualification: "LL.B.", linkedin: "https://linkedin.com/in/nadir",
  languages: ["Malay"], lawyer_types: ["Advocate & Solicitor", "Notary Public"], rankings: ["Rekaan 2026"],
  photo_url: "https://media.example/remote.jpg", roll_no: "N-44", admission_date: "2010-08-10", pqe_years: 49 });
const sourceOffice = sourceFirm({ address: "4 Jalan Rekaan", website: "https://nadir.example", website_alive: false,
  logo_url: "https://media.example/logo.jpg", postcode: "48000", practice_areas: ["Sports Law & Arbitration"] });
const lawyerKey = (row: typeof source): ExternalId => ({ entityType: "lawyer", entityId: lawyer.id, namespace: PRIMARY, value: primaryKey(row) });

test("claimed profile keeps every contact and firm field, blank or not, and takes only Bar facts and import metadata", () => {
  const claimed = { ...lawyer, isClaimed: true, isVerified: true, userId: "profile-owner", name: "Claimed Display Name",
    phone: "", isActive: false, address: "Claimed address", city: null, state: null, email: "owner@example.com",
    firmName: "Owner's Office", primaryFirmId: "original-firm", designation: "Owner's designation",
    qualification: "Owner's qualification", languages: ["Owner's language"], linkedin: "https://example.com/owner",
    bio: "Owned bio", photo: "owned/photo", scrapedData: { intact: true }, subscriptionTier: "premium", courtAppearances: 50 };
  const plan = planImport({ firms: [sourceOffice], lawyers: [source] }, { ...empty, lawyers: [claimed], externalIds: [lawyerKey(source)] }, options);
  expect(plan.lawyerPlans[0].slug).toBe(claimed.slug);
  expect(plan.lawyerPlans[0].write).toEqual({ update: {
    barAdmissionDate: new Date("2010-08-10Z"), yearsAtBar: 15,
    importData: { ...source.raw, release: options.release }, rankings: ["Rekaan 2026"], credentials: ["Notary Public"],
    importedAt: now, updatedAt: now,
  } });
});

const struck = sourceLawyer({ status: "Struck Off", disciplinary_note: "Invented disciplinary notice", email: "rafi@example.com",
  sources: ["sabah_law_society_disciplinary"], source_urls: ["https://unrelated.example/note", "https://sabahlawsociety.org/notice"] });
// Approve exactly what a dry run against this state printed in status_review.csv.
type PlanInput = Parameters<typeof planImport>[0];
type PlanState = Parameters<typeof planImport>[1];
const approveAll = (input: PlanInput, state: PlanState) => ({ ...options,
  approvals: new Map(planImport(input, state, options).statusReview.map((row) => [row.key, row.fingerprint])) });

test("new row imports active without approval, and approved activation of standing uses the note's own source", () => {
  const input = { firms: [], lawyers: [struck] };
  const withheld = planImport(input, empty, options);
  expect(withheld.lawyerPlans[0].write).toMatchObject({ insert: { barStatus: "active", standingNote: null, standingSourceUrl: null, isActive: true } });
  expect(withheld.statusReview).toMatchObject([{ key: primaryKey(struck), status: "Struck Off", tier: null, sourceUrl: "https://sabahlawsociety.org/notice" }]);
  const allowed = planImport(input, empty, approveAll(input, empty));
  expect(allowed.lawyerPlans[0].write).toMatchObject({ insert: { barStatus: "struck_off", standingNote: struck.disciplinary_note,
    standingSourceUrl: "https://sabahlawsociety.org/notice", isActive: true } });
  expect(allowed.statusReview).toEqual([]);
});

test("existing negative standing requires approval and strong Tier A; recording a Tier B key cannot promote standing", () => {
  const input = { firms: [], lawyers: [struck] };
  const current = { ...lawyer, email: "rafi@example.com" };
  const tierA = { ...empty, lawyers: [current], externalIds: [lawyerKey(struck)] };
  const denied = planImport(input, tierA, options);
  expect(denied.lawyerPlans[0].write).not.toHaveProperty("update.barStatus");
  expect(denied.statusReview[0].tier).toBe("A");
  const allowed = planImport(input, tierA, approveAll(input, tierA));
  expect(allowed.lawyerPlans[0].write).toMatchObject({ update: { barStatus: "struck_off", standingNote: struck.disciplinary_note } });
  const stateB = { ...empty, lawyers: [current] };
  const firstB = planImport(input, stateB, approveAll(input, stateB));
  const write = firstB.lawyerPlans[0].write!;
  expect(write).not.toHaveProperty("update.barStatus");
  expect(write).not.toHaveProperty("update.standingNote");
  expect(firstB.statusReview[0].tier).toBe("B");
  expect(firstB.externalIds).toContainEqual({ entityType: "lawyer", entityId: current.id, namespace: WEAK_STANDING, value: current.id });
  const persisted = { ...current, ...("update" in write ? write.update : {}) } as LawyerState;
  const replayState = { ...empty, lawyers: [persisted], externalIds: firstB.externalIds };
  const replay = planImport(input, replayState, approveAll(input, replayState));
  expect(replay.lawyerPlans[0].match).toMatchObject({ action: "update", tier: "A" });
  expect(replay.lawyerPlans[0].write).toBeUndefined();
  expect(replay.statusReview[0].tier).toBe("B");
});

test("an active-status note needs its own approval and never reactivates an existing suspended lawyer", () => {
  const row = sourceLawyer({ disciplinary_note: "Invented certificate note", sources: ["jakess_syariah_non_practising"],
    source_urls: ["https://jakess.gov.my.evil.example/notice"] });
  const input = { firms: [], lawyers: [row] };
  const state = { ...empty, lawyers: [{ ...lawyer, barStatus: "suspended" as const }], externalIds: [lawyerKey(row)] };
  const withheld = planImport(input, state, options);
  expect(withheld.lawyerPlans[0].write).not.toHaveProperty("update.standingNote");
  expect(withheld.statusReview[0].sourceUrl).toBeNull();
  const allowed = planImport(input, state, approveAll(input, state));
  expect(allowed.lawyerPlans[0].write).toMatchObject({ update: { standingNote: row.disciplinary_note } });
  expect(allowed.lawyerPlans[0].write).not.toHaveProperty("update.barStatus");
});

test("firm and lawyer replay leaves database fields, timestamps, external IDs and practice links unchanged", () => {
  const input = { firms: [sourceOffice], lawyers: [{ ...source, practice_areas: ["Civil Litigation", "Dispute Resolution & Arbitration"] }] };
  const practiceIds = new Map([["litigation-dispute-resolution", "practice-parent"], ["civil-litigation", "practice-child"]]);
  const initial = planImport(input, { ...empty, practiceIds }, options);
  const firmWrite = initial.firmPlans[0].write!;
  const lawyerWrite = initial.lawyerPlans[0].write!;
  if (!("insert" in firmWrite) || !("insert" in lawyerWrite)) throw new Error("Expected planned inserts");
  expect(firmWrite.insert).toMatchObject({ website: null, logo: null, logoIsLight: false, postcode: "48000", createdAt: now, updatedAt: now });
  expect(lawyerWrite.insert).toMatchObject({ primaryFirmId: firmWrite.insert.id, photo: null, yearsAtBar: 15, createdAt: now, updatedAt: now });
  expect(lawyerWrite.insert).not.toHaveProperty("barMembershipNumber");
  expect(initial.links).toHaveLength(2);
  expect([...initial.missingPracticeSlugs]).toEqual(["arbitration"]);
  expect(initial.unmapped.get("Sports Law & Arbitration")).toBe(1);
  const postImport = { practiceIds, externalIds: initial.externalIds,
    firms: [{ ...firm, ...firmWrite.insert } as FirmState], lawyers: [{ ...lawyer, ...lawyerWrite.insert } as LawyerState],
    practiceLinks: new Set(initial.links.map(({ lawyerId, practiceAreaId }) => practiceLinkKey(lawyerId, practiceAreaId))) };
  const replay = planImport(input, postImport, { ...options, now: new Date("2026-09-01Z") });
  expect(replay.firmPlans[0].write).toBeUndefined();
  expect(replay.lawyerPlans[0].write).toBeUndefined();
  expect(replay.externalIds).toEqual([]);
  expect(replay.links).toEqual([]);
});

test("aliases city fields for new rows and gaps without recasing a lawyer's display name", () => {
  const office = sourceFirm({ city: "Georgetown" });
  const person = sourceLawyer({ full_name: "dR. rAFi B. Nadir", city: "Bandar Baru Bangi" });
  const input = { firms: [office], lawyers: [person] };
  const initial = planImport(input, empty, options);
  expect(initial.firmPlans[0].write).toMatchObject({ insert: { city: "George Town", slug: "messrs-nadir-co-george-town" } });
  expect(initial.lawyerPlans[0].write).toMatchObject({ insert: { city: "Bangi", name: "dR. rAFi B. Nadir" } });
  const existing = {
    ...empty,
    firms: [firm],
    lawyers: [{ ...lawyer, city: "Owner's City" }],
    externalIds: [lawyerKey(person)],
  };
  const update = planImport(input, existing, options);
  expect(update.firmPlans[0].write).toMatchObject({ update: { city: "George Town" } });
  expect(update.lawyerPlans[0].write).not.toHaveProperty("update.city");
  expect(update.lawyerPlans[0].write).not.toHaveProperty("update.name");
});

test("lawyers-only never uses a heuristic firm match; unresolved references go to review", () => {
  const input = { firms: [sourceOffice], lawyers: [source] };
  const state = { ...empty, firms: [firm] };
  const unresolved = planImport(input, state, { ...options, only: "lawyers" });
  expect(unresolved.firmPlans).toEqual([]);
  expect(unresolved.lawyerPlans[0].match).toMatchObject({ action: "review" });
  expect(unresolved.unresolvedFirmReferences).toBe(1);
  const resolved = planImport(input, { ...state, externalIds: [
    { entityType: "firm", entityId: firm.id, namespace: PRIMARY, value: primaryKey(sourceOffice) },
  ] }, { ...options, only: "lawyers" });
  expect(resolved.firmPlans).toEqual([]);
  expect(resolved.lawyerPlans[0].write).toMatchObject({ insert: { primaryFirmId: firm.id } });
  expect(resolved.unresolvedFirmReferences).toBe(0);
});

test("an approval does not carry over when the status, note or source changes", () => {
  const input = { firms: [], lawyers: [struck] };
  const approval = approveAll(input, empty);
  const changed = { firms: [], lawyers: [{ ...struck, disciplinary_note: "A different invented notice" }] };
  const plan = planImport(changed, empty, approval);
  expect(plan.lawyerPlans[0].write).toMatchObject({ insert: { barStatus: "active", standingNote: null } });
  expect(plan.statusReview[0].problem).toContain("stale approval");
});

test("a claimed profile keeps cleared contact fields and its firm", () => {
  const row = sourceLawyer({ email: "person@example.com", phone: "0312345678" });
  const claimed = { ...lawyer, isClaimed: true, email: null, phone: null, firmName: null, primaryFirmId: null };
  const plan = planImport({ firms: [], lawyers: [row] }, { ...empty, lawyers: [claimed], externalIds: [lawyerKey(row)] }, options);
  const write = plan.lawyerPlans[0].write as { update?: Record<string, unknown> } | undefined;
  for (const field of ["email", "phone", "address", "name", "firmName", "primaryFirmId"]) {
    expect(write?.update ?? {}).not.toHaveProperty(field);
  }
});
