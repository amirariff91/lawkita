/**
 * Display formatting for lawyer and firm names.
 *
 * The Bar Council directory stores names in ALL CAPS ("AARON GANAPATHY NAIDU
 * A/L ENGITARRAMAN"). These helpers turn such names into conventional mixed
 * case for display, titles and structured data. Database values are never
 * changed, and a name that already contains a lower-case letter (entered by
 * the lawyer, a claimed profile, or an import) is returned untouched.
 */

/** Malay and Indian patronymic particles, written lower-case after the first word. */
const PATRONYMIC_PARTICLES = new Set([
  "bin",
  "binti",
  "binte",
  "bt",
  "bte",
  "bt.",
  "bte.",
  "a/l",
  "a/p",
  "s/o",
  "d/o",
]);

/** Short particles that are also lower-case in a person's name, but not in a firm name. */
const PERSON_ONLY_PARTICLES = new Set(["al", "ap"]);

/** Connecting words written lower-case inside a firm name. */
const FIRM_CONNECTORS = new Set(["and", "dan", "of", "the"]);

/** Business suffixes with a fixed conventional form. */
const FIRM_FIXED_FORMS: Record<string, string> = {
  llp: "LLP",
  plt: "PLT",
  llc: "LLC",
  sdn: "Sdn",
  "sdn.": "Sdn.",
  bhd: "Bhd",
  "bhd.": "Bhd.",
  co: "Co",
  "co.": "Co.",
};

/** Two-letter Chinese surnames with no vowel, which are not acronyms. */
const VOWELLESS_WORDS = new Set(["ng"]);

const VOWEL = /[aeiou]/i;

function hasLowerCase(value: string): boolean {
  return /\p{Ll}/u.test(value);
}

/** "A", "A.", "A.K.", "K.S" — a run of initials. */
function isInitials(token: string): boolean {
  return /^\p{L}$/u.test(token) || /^(\p{L}\.)+\p{L}?\.?$/u.test(token);
}

/**
 * Title-case one word. Capitalises the first letter and the letter after a
 * hyphen, slash or opening bracket ("NUR-AIN" -> "Nur-Ain"), and the letter
 * after a one-letter prefix with an apostrophe ("O'BRIEN" -> "O'Brien",
 * "D'CRUZ" -> "D'Cruz") while leaving other apostrophes alone
 * ("MA'ARIF" -> "Ma'arif", "DATO'" -> "Dato'").
 */
function titleCaseWord(token: string): string {
  return token
    .toLowerCase()
    .replace(/(^|[-/("])(\p{L})/gu, (_, before: string, letter: string) => before + letter.toUpperCase())
    .replace(
      /(^|[-/("])(\p{L})['’](\p{L})/gu,
      (_, before: string, first: string, next: string) =>
        `${before}${first}'${next.toUpperCase()}`
    );
}

/** Strip surrounding brackets/quotes so "(KL)" is judged as "KL". */
function core(token: string): string {
  return token.replace(/^[("]+|[)",]+$/g, "");
}

function splitWords(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
}

/**
 * Format a person's name for display.
 *
 * "AARON GANAPATHY NAIDU A/L ENGITARRAMAN" -> "Aaron Ganapathy Naidu a/l Engitarraman"
 * "DATO' SRI AHMAD BIN HJ. ISMAIL"        -> "Dato' Sri Ahmad bin Hj. Ismail"
 * "Siti Aminah binti Ali" (mixed case)    -> unchanged
 */
export function formatPersonName(name: string | null | undefined): string {
  if (!name) return "";
  if (hasLowerCase(name)) return name;

  return splitWords(name)
    .map((token, index) => {
      const lower = token.toLowerCase();
      if (
        index > 0 &&
        (PATRONYMIC_PARTICLES.has(lower) || PERSON_ONLY_PARTICLES.has(lower))
      ) {
        return lower;
      }
      if (isInitials(core(token))) return token;
      return titleCaseWord(token);
    })
    .join(" ");
}

/**
 * Format a law firm's name for display.
 *
 * "AMIN PETRA & PARTNERS"       -> "Amin Petra & Partners"
 * "AKBERDIN & CO"               -> "Akberdin & Co"
 * "YC TAN & PARTNERS PLT"       -> "YC Tan & Partners PLT"
 * "Skrine" (mixed case)         -> unchanged
 */
export function formatFirmName(name: string | null | undefined): string {
  if (!name) return "";
  if (hasLowerCase(name)) return name;

  return splitWords(name)
    .map((token, index) => {
      const lower = token.toLowerCase();
      const bare = core(token);
      const bareLower = bare.toLowerCase();

      if (FIRM_FIXED_FORMS[lower]) return FIRM_FIXED_FORMS[lower];
      if (index > 0 && (PATRONYMIC_PARTICLES.has(lower) || FIRM_CONNECTORS.has(lower))) {
        return lower;
      }
      if (isInitials(bare)) return token;
      // Short letter groups with no vowel are acronyms: "YC", "(KL)", "SKS".
      if (
        /^\p{L}{2,4}$/u.test(bare) &&
        !VOWEL.test(bare) &&
        !VOWELLESS_WORDS.has(bareLower)
      ) {
        return token;
      }
      return titleCaseWord(token);
    })
    .join(" ");
}
