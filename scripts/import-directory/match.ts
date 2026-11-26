import { normalizeAddress } from "@/lib/db/queries/firms";
import type { FirmInput, LawyerInput } from "./data";
import { DOMAIN, PRIMARY, firmKeys, keyId, lawyerKeys, nameStateKey, type Entity, type ExternalId, type ExternalKey } from "./keys";
import { canonicalFirmName, canonicalName, isPersonalEmail, normalizeEmail, normalizeState, parseAdmissionDate, phoneDigits } from "./normalize";

export type Match = { action: "update"; id: string; tier: "A" | "B" }
  | { action: "insert" }
  | { action: "review"; reason: string; candidates: string[] }
  | { action: "conflict"; reason: string };
export type Decision = { match: Match; keys: ExternalKey[] };
export type MatchLawyer = {
  id: string; name: string; state: string | null; isActive: boolean;
  barMembershipNumber: string | null; primaryFirmId: string | null; firmName: string | null;
  barAdmissionDate: Date | null; phone: string | null; email: string | null;
};
export type MatchFirm = { id: string; name: string; state: string | null; address: string | null; normalizedAddress: string | null };

function add<K, T>(map: Map<K, T[]>, key: K, value: T) {
  const group = map.get(key);
  if (group) group.push(value);
  else map.set(key, [value]);
}

function review(reason: string, candidates: string[]): Match {
  return { action: "review", reason, candidates: [...candidates].sort() };
}

function same<T>(a: T | null, b: T | null): boolean {
  return Boolean(a) && a === b;
}

function matchRows<Row extends { id: number }>(
  rows: readonly Row[], existing: readonly { id: string }[], external: readonly ExternalId[], entity: Entity,
  keysFor: (row: Row) => ExternalKey[], fallback: (row: Row) => Match,
): Map<number, Decision> {
  const byId = new Set(existing.map((row) => row.id));
  const owners = new Map<string, string[]>();
  for (const ext of external) if (ext.entityType === entity) add(owners, keyId(ext), ext.entityId);
  const keyed = rows.map((row) => ({ row, keys: keysFor(row) }));
  const frequency = new Map<string, number>();
  for (const { keys } of keyed) {
    for (const key of keys) {
      const id = keyId(key);
      frequency.set(id, (frequency.get(id) ?? 0) + 1);
    }
  }
  const result = new Map<number, Decision>();
  const claims = new Map<string, number[]>();
  for (const { row, keys } of keyed) {
    const assigned = new Set<string>();
    const usable: ExternalKey[] = [];
    let issue: string | undefined;
    for (const key of keys) {
      const id = keyId(key);
      if ((frequency.get(id) ?? 0) > 1) {
        if (key.namespace !== DOMAIN) issue = `shared ${key.namespace} key in this release`;
        else if (owners.has(id)) {
          const primary = keys.find(({ namespace }) => namespace === PRIMARY)!;
          const primaryIds = owners.get(keyId(primary));
          const domainIds = owners.get(id)!;
          if (domainIds.length !== 1 || primaryIds?.length !== 1 || primaryIds[0] !== domainIds[0]) {
            issue = "shared website domain already assigned to a different or unconfirmed firm";
          }
        }
        // Shared branch websites do not identify a firm; leave unbound ones unbound.
        continue;
      }
      usable.push(key);
      for (const owner of owners.get(id) ?? []) assigned.add(owner);
    }
    for (const id of assigned) add(claims, id, row.id);
    let match: Match;
    if (issue) match = { action: "conflict", reason: issue };
    else if (assigned.size > 1) match = { action: "conflict", reason: `external keys resolve to different ${entity}s: ${[...assigned].sort().join(", ")}` };
    else if (assigned.size === 1) {
      const [id] = assigned;
      match = byId.has(id) ? { action: "update", id, tier: "A" } : { action: "conflict", reason: `external key points to missing ${entity}: ${id}` };
    } else {
      match = fallback(row);
      if (match.action === "update") add(claims, match.id, row.id);
    }
    result.set(row.id, { match, keys: usable });
  }
  for (const [id, contenders] of claims) {
    if (contenders.length < 2) continue;
    const strongClaims = contenders.filter((rowId) => {
      const { match } = result.get(rowId)!;
      return match.action !== "update" || match.tier === "A";
    }).length;
    for (const rowId of contenders) {
      const decision = result.get(rowId)!;
      if (decision.match.action !== "update") continue;
      if (decision.match.tier === "B") decision.match = review(`multiple input rows claim this ${entity}`, [id]);
      else if (strongClaims > 1) decision.match = { action: "conflict", reason: `multiple input rows claim this ${entity} by external id: ${id}` };
    }
  }
  return result;
}

export function matchLawyers(
  rows: readonly LawyerInput[], existing: readonly MatchLawyer[], external: readonly ExternalId[],
  matchedFirmIds: ReadonlyMap<number, string> = new Map(),
): Map<number, Decision> {
  const byName = new Map<string, MatchLawyer[]>();
  const placeholders = new Set<string>();
  for (const lawyer of existing) {
    if (/^(?:BC[\/\d]|1MDB-)/i.test(lawyer.barMembershipNumber?.trim() ?? "")) placeholders.add(lawyer.id);
    const name = canonicalName(lawyer.name);
    if (name) add(byName, name, lawyer);
  }
  const decisions = matchRows(rows, existing, external, "lawyer", lawyerKeys, (row) => {
    const sameName = byName.get(canonicalName(row.full_name)) ?? [];
    if (!sameName.length) return { action: "insert" };
    const sameState = sameName.filter((lawyer) => normalizeState(lawyer.state) === row.state);
    if (sameState.length !== 1) return review("no unique name and state match", sameName.map(({ id }) => id));
    const [candidate] = sameState;
    if (placeholders.has(candidate.id)) return review("placeholder Bar profile", [candidate.id]);
    if (!candidate.isActive) return review("name match to inactive profile", [candidate.id]);
    const date = parseAdmissionDate(row.admission_date)?.toISOString().slice(0, 10) ?? null;
    // Stored admission dates are midnight in Malaysia (UTC+8), i.e. 16:00 UTC
    // on the previous day. Compare calendar days in Malaysia time, or no
    // stored date would ever equal the dataset's.
    const existingDate = candidate.barAdmissionDate
      ? new Date(candidate.barAdmissionDate.getTime() + 8 * 3_600_000).toISOString().slice(0, 10)
      : null;
    const matchedFirm = row.firm_id == null ? null : matchedFirmIds.get(row.firm_id) ?? null;
    // Admission date and a personal mailbox identify a person. Firm and
    // switchboard phone only say where someone works, so they count together.
    const email = normalizeEmail(row.email);
    const strong = same(date, existingDate) || (isPersonalEmail(email, row.full_name) && same(email, normalizeEmail(candidate.email)));
    const sameFirm = same(canonicalFirmName(row.firm_name), canonicalFirmName(candidate.firmName)) ||
      same(matchedFirm, candidate.primaryFirmId);
    const samePhone = same(phoneDigits(row.phone), phoneDigits(candidate.phone));
    if (strong || (sameFirm && samePhone)) return { action: "update", tier: "B", id: candidate.id };
    return review("name and state match lacks corroboration", [candidate.id]);
  });
  for (const decision of decisions.values()) {
    const { match } = decision;
    if (match.action === "update" && placeholders.has(match.id)) {
      decision.match = review("placeholder Bar profile", [match.id]);
    }
  }
  return decisions;
}

function nameOverlap(a: string, b: string): number {
  if (!a || !b) return 0;
  const left = new Set(a.split(" "));
  const right = new Set(b.split(" "));
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap++;
  return overlap / (left.size + right.size - overlap);
}

export function matchFirms(
  rows: readonly FirmInput[], existing: readonly MatchFirm[], external: readonly ExternalId[], externalOnly = false,
): Map<number, Decision> {
  const byNameState = new Map<string, MatchFirm[]>();
  const byAddress = new Map<string, { id: string; name: string }[]>();
  const frequency = new Map<string, number>();
  if (!externalOnly) {
    for (const firm of existing) {
      const state = normalizeState(firm.state);
      const name = canonicalFirmName(firm.name);
      const address = normalizeAddress(firm.address) || normalizeAddress(firm.normalizedAddress);
      if (state && name) add(byNameState, nameStateKey(name, state), firm);
      if (address && name) add(byAddress, address, { id: firm.id, name });
    }
    for (const row of rows) {
      const key = nameStateKey(canonicalFirmName(row.name), row.state);
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
  }
  return matchRows(rows, existing, external, "firm", firmKeys, (row) => {
    if (externalOnly) return review("firm has no external id in the database", []);
    const name = canonicalFirmName(row.name);
    const key = nameStateKey(name, row.state);
    const sameName = byNameState.get(key) ?? [];
    const sameAddress = (byAddress.get(normalizeAddress(row.address)) ?? []).filter((other) => nameOverlap(name, other.name) >= 0.6);
    const ids = [...new Set([...sameName, ...sameAddress].map(({ id }) => id))];
    if (ids.length > 1 || (sameName.length > 0 && (frequency.get(key) ?? 0) > 1)) return review("ambiguous firm match", ids);
    if (ids.length === 1) return { action: "update", tier: "B", id: ids[0] };
    return { action: "insert" };
  });
}
