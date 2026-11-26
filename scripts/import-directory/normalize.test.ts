import { expect, test } from "bun:test";
import { canonicalFirmName, canonicalName, completedYears, isPersonalEmail, normalizeEmail, normalizeState, parseAdmissionDate, phoneDigits, websiteDomain } from "./normalize";

test("normalizes Malay titles and patronymic spellings without erasing name tokens", () => {
  expect(canonicalName("YBhg. Tan Sri Dato’ Seri Dr. Hj. Rafi B. Nadir & Amir")).toBe("rafi bin nadir and amir");
  for (const part of ["a/l", "a / l", "s/o", "bin"]) expect(canonicalName(`Rafi ${part} Nadir`)).toBe("rafi bin nadir");
  for (const part of ["a/p", "d/o", "bt.", "binti"]) expect(canonicalName(`Rana ${part} Nadir`)).toBe("rana binti nadir");
  expect(canonicalName("Nik Nadir")).toBe("nik nadir");
});

test("normalizes firm suffixes, contact data and the sixteen states", () => {
  expect(canonicalFirmName("Messrs. Nadir & Amar & Co., Advocates & Solicitors")).toBe("nadir and amar");
  expect(phoneDigits("+60 (03) 110-002")).toBe("6003110002");
  expect(phoneDigits(" — ")).toBeNull();
  expect(normalizeEmail(" A@EXAMPLE.COM ")).toBe("a@example.com");
  expect(websiteDomain("www.Example.COM/path?q=x")).toBe("example.com");
  expect(websiteDomain("https://example.com@third.example/")).toBeNull();
  expect(normalizeState(" sarawak ")).toBe("Sarawak");
  expect(normalizeState("Singapore")).toBeNull();
});

test("rejects impossible admission dates and counts completed years", () => {
  expect(parseAdmissionDate("2025-02-29")).toBeNull();
  expect(parseAdmissionDate("2024-2-9")).toBeNull();
  expect(parseAdmissionDate("2024-02-29")?.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  const admission = parseAdmissionDate("2005-03-20");
  expect(completedYears(admission, new Date("2026-03-19"))).toBe(20);
  expect(completedYears(admission, new Date("2026-03-20"))).toBe(21);
});

test("phones given with the country code are stored in national form", () => {
  expect(phoneDigits("+60 3-2273 1919")).toBe("0322731919");
  expect(phoneDigits("60123456789")).toBe("0123456789");
  expect(phoneDigits("03-2273 1919")).toBe("0322731919");
  expect(phoneDigits("")).toBeNull();
  expect(phoneDigits("60111228464 / 60111149466 8")).toBeNull();
});

test("placeholders are not email addresses and office mailboxes are not personal", () => {
  expect(normalizeEmail("n/a")).toBeNull();
  expect(normalizeEmail("-")).toBeNull();
  expect(normalizeEmail(" Person@Example.com ")).toBe("person@example.com");
  expect(isPersonalEmail("info@example.com")).toBe(false);
  expect(isPersonalEmail("aisyah@example.com")).toBe(true);
  expect(isPersonalEmail(null)).toBe(false);
});
