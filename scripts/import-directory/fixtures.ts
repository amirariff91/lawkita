import { firmInput, lawyerInput } from "./data";
import type { Existing, FirmState, LawyerState } from "./plan";

export function sourceLawyer(input: Record<string, unknown> = {}) {
  const raw = { id: 501, full_name: "Rafi Bin Nadir", canonical_name: "rafi bin nadir", state: "Selangor", status: "Active", ...input };
  return { ...lawyerInput.parse(raw), raw };
}

export function sourceFirm(input: Record<string, unknown> = {}) {
  const raw = { id: 301, name: "Messrs Nadir & Co.", canonical_name: "nadir", state: "Selangor", ...input };
  return { ...firmInput.parse(raw), raw };
}

export const lawyer: LawyerState = {
  id: "b17bb517-cf15-4f05-89a2-fc84d32498dd", slug: "nadir-public-slug", name: "Rafi B. Nadir", state: "Selangor",
  isActive: true, isClaimed: false, barMembershipNumber: null, primaryFirmId: null, firmName: null,
  barAdmissionDate: null, barStatus: "active", yearsAtBar: null, phone: null, email: null,
  city: null, address: null, designation: null, qualification: null, linkedin: null, languages: null,
  credentials: null, rankings: null, importData: null, importedAt: null, standingNote: null, standingSourceUrl: null,
};

export const firm: FirmState = {
  id: "8711e6ca-50a0-4314-98dd-f9af909273ab", slug: "nadir-firm-public-slug", name: "Nadir", state: "Selangor",
  isClaimed: false, description: null, city: null, address: null, normalizedAddress: null, phone: null, email: null,
  website: null, postcode: null, latitude: null, longitude: null, fax: null, whatsapp: null, linkedin: null,
  socialLinks: null, foundedYear: null, openingHours: null, languages: null, bankPanels: null, legalNetworks: null,
  rankings: null, importData: null, importedAt: null,
};

export const empty: Existing = { firms: [], lawyers: [], externalIds: [], practiceIds: new Map(), practiceLinks: new Set() };
