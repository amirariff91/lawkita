// Credential hubs: public pages under /lawyers/services that list lawyers
// holding a panel membership or appointment recorded in lawyers.credentials.
//
// `credentials` values are matched exactly against the text[] column, so
// they must be spelled as the directory import writes them.
//
// Descriptions are deliberately short and neutral. When unsure of a legal
// fact, leave it out rather than guess. No fees or prices.

export interface CredentialHub {
  slug: string;
  /** Exact values in lawyers.credentials that put a lawyer on this hub. */
  credentials: readonly string[];
  /** English name used in headings: "Commissioner for Oaths". */
  name: string;
  /** Malay term shown alongside the English name. */
  malayName: string;
  /** Lowercase noun for one lawyer: "commissioner for oaths". */
  singular: string;
  /** Lowercase noun for several lawyers: "commissioners for oaths". */
  plural: string;
  /** One or two sentences for cards and meta descriptions. */
  summary: string;
  /** Paragraphs shown on the hub pages. */
  description: readonly string[];
  /** Search phrases this hub serves (for reference; not rendered as keywords). */
  searchPhrases: readonly string[];
}

export const CREDENTIAL_HUBS: readonly CredentialHub[] = [
  {
    slug: "commissioner-for-oaths",
    credentials: ["Commissioner for Oaths"],
    name: "Commissioner for Oaths",
    malayName: "Pesuruhjaya Sumpah",
    singular: "commissioner for oaths",
    plural: "commissioners for oaths",
    summary:
      "A commissioner for oaths administers oaths and affirmations and witnesses the signing of affidavits and statutory declarations.",
    description: [
      "A commissioner for oaths (pesuruhjaya sumpah) administers oaths and affirmations, and witnesses the signing of affidavits and statutory declarations. You sign the document in front of the commissioner, who confirms that you made it on oath or affirmation.",
      "Members of the public usually need one for a statutory declaration, for example about a lost document or a change in personal details, or for an affidavit that will be filed in court. Bring identification and the unsigned document.",
      "Not every commissioner for oaths in Malaysia is a lawyer. This page lists lawyers in the LawKita directory who are recorded as commissioners for oaths.",
    ],
    searchPhrases: [
      "pesuruhjaya sumpah",
      "pesuruhjaya sumpah near me",
      "commissioner for oaths",
      "commissioner for oaths near me",
    ],
  },
  {
    slug: "notary-public",
    credentials: ["Notary Public"],
    name: "Notary Public",
    malayName: "Notari Awam",
    singular: "notary public",
    plural: "notaries public",
    summary:
      "A notary public attests signatures and certifies documents, usually when the documents will be used outside Malaysia.",
    description: [
      "A notary public (notari awam) attests signatures, certifies copies of documents and prepares notarial certificates. Notarisation is most often needed when a document will be used outside Malaysia.",
      "You may be asked to have a document notarised by a foreign government, an embassy, an overseas university or employer, or a bank abroad. Ask the receiving party exactly what it needs before you book, as requirements differ between countries and institutions.",
      "This page lists lawyers in the LawKita directory who are recorded as notaries public.",
    ],
    searchPhrases: ["notary public", "notary public near me", "notari awam"],
  },
  {
    slug: "legal-aid",
    credentials: ["YBGK Legal Aid"],
    name: "YBGK Legal Aid Lawyers",
    malayName: "Peguam Bantuan Guaman YBGK",
    singular: "YBGK panel lawyer",
    plural: "YBGK panel lawyers",
    summary:
      "Lawyers on the panel of the Yayasan Bantuan Guaman Kebangsaan (YBGK), the National Legal Aid Foundation, which provides legal aid mainly in criminal matters.",
    description: [
      "The Yayasan Bantuan Guaman Kebangsaan (YBGK), or National Legal Aid Foundation, provides legal aid mainly in criminal matters. The lawyers listed here are in private practice and are on the YBGK panel, which means they accept legal aid assignments from YBGK.",
      "YBGK is separate from the Jabatan Bantuan Guaman (Legal Aid Department), a government department with its own officers and its own eligibility rules. The lawyers on this page do not work for the Jabatan Bantuan Guaman.",
      "Whether you qualify for legal aid is decided by YBGK or by the Jabatan Bantuan Guaman, not by the lawyer or by LawKita. Contact them directly to ask about eligibility.",
    ],
    searchPhrases: [
      "biro bantuan guaman",
      "jabatan bantuan guaman",
      "bantuan guaman percuma",
      "legal aid malaysia",
      "ybgk",
    ],
  },
  {
    slug: "syariah-lawyers",
    credentials: ["Peguam Syarie"],
    name: "Syariah Lawyers",
    malayName: "Peguam Syarie",
    singular: "syariah lawyer",
    plural: "syariah lawyers",
    summary:
      "A Peguam Syarie is admitted to act for parties in the Syariah courts, which hear Islamic family and personal law matters.",
    description: [
      "A Peguam Syarie is admitted to act for parties in the Syariah courts. These courts hear Islamic family and personal law matters for Muslims, such as marriage, divorce, maintenance and custody.",
      "Admission as a Peguam Syarie is granted by each state, so check that the lawyer may appear in the Syariah court of the state where your case will be heard.",
      "This page lists lawyers in the LawKita directory who are recorded as Peguam Syarie.",
    ],
    searchPhrases: [
      "peguam syarie",
      "peguam syarie near me",
      "peguam syarie percuma",
      "lawyer syariah",
    ],
  },
  {
    slug: "mediators",
    credentials: ["MIMC Accredited Mediator", "AIAC Mediator"],
    name: "Mediators",
    malayName: "Pengantara",
    singular: "mediator",
    plural: "mediators",
    summary:
      "A mediator is a neutral person who helps the parties to a dispute reach their own settlement. The mediator does not decide the dispute.",
    description: [
      "A mediator (pengantara) is a neutral person who helps the parties to a dispute talk through the issues and reach their own settlement. The mediator does not decide who is right, and either party may leave the mediation without agreeing.",
      "People use mediation for disputes they would rather settle than take to trial, for example between family members, business partners, landlords and tenants, or contractors and owners.",
      "This page lists lawyers in the LawKita directory who are recorded as mediators accredited by the Malaysian Mediation Centre (MIMC) or on the mediator panel of the Asian International Arbitration Centre (AIAC).",
    ],
    searchPhrases: ["mediator malaysia", "mediation lawyer", "pengantara"],
  },
];

export function getAllCredentialHubs(): readonly CredentialHub[] {
  return CREDENTIAL_HUBS;
}

export function getCredentialHubBySlug(slug: string): CredentialHub | undefined {
  return CREDENTIAL_HUBS.find((hub) => hub.slug === slug);
}

/** The hub a single `credentials` value belongs to, if any (exact match). */
export function getCredentialHubForValue(value: string): CredentialHub | undefined {
  return CREDENTIAL_HUBS.find((hub) => hub.credentials.includes(value));
}
