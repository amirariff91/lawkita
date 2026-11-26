import { describe, expect, test } from "bun:test";
import { formatFirmName, formatPersonName } from "./name-format";

describe("formatPersonName", () => {
  test.each([
    ["AARON GANAPATHY NAIDU A/L ENGITARRAMAN", "Aaron Ganapathy Naidu a/l Engitarraman"],
    ["PRIYA DEVI A/P MUNIANDY", "Priya Devi a/p Muniandy"],
    ["RAJ KUMAR S/O SUBRAMANIAM", "Raj Kumar s/o Subramaniam"],
    ["KAVITHA D/O RAMASAMY", "Kavitha d/o Ramasamy"],
    ["MUHAMMAD HAFIZ BIN ABDULLAH", "Muhammad Hafiz bin Abdullah"],
    ["NUR AISYAH BINTI MOHD ZAIN", "Nur Aisyah binti Mohd Zain"],
    ["SITI BT. AHMAD", "Siti bt. Ahmad"],
    ["SITI BT AHMAD", "Siti bt Ahmad"],
    ["RAVI AL MUTHU", "Ravi al Muthu"],
    ["LETCHUMI AP KANNAN", "Letchumi ap Kannan"],
  ])("particles: %s", (input, expected) => {
    expect(formatPersonName(input)).toBe(expected);
  });

  test.each([
    ["DATO' SRI AHMAD BIN HJ. ISMAIL", "Dato' Sri Ahmad bin Hj. Ismail"],
    ["DATUK SERI TAN KIM HOCK", "Datuk Seri Tan Kim Hock"],
    ["TAN SRI MUHYIDDIN BIN YASSIN", "Tan Sri Muhyiddin bin Yassin"],
    ["DR. LIM WEI MING", "Dr. Lim Wei Ming"],
    ["DR LIM WEI MING", "Dr Lim Wei Ming"],
    ["HAJI ABU BAKAR BIN HAJI OMAR", "Haji Abu Bakar bin Haji Omar"],
    ["HJ ABU BAKAR", "Hj Abu Bakar"],
    ["HAJAH FATIMAH BINTI ALI", "Hajah Fatimah binti Ali"],
    ["HJH FATIMAH", "Hjh Fatimah"],
  ])("honorifics: %s", (input, expected) => {
    expect(formatPersonName(input)).toBe(expected);
  });

  test("keeps initials upper-case", () => {
    expect(formatPersonName("A. RAJENDRAN")).toBe("A. Rajendran");
    expect(formatPersonName("K.S. NATHAN")).toBe("K.S. Nathan");
    expect(formatPersonName("M SIVAKUMAR")).toBe("M Sivakumar");
  });

  test("handles apostrophes and hyphens", () => {
    expect(formatPersonName("JOHN D'CRUZ")).toBe("John D'Cruz");
    expect(formatPersonName("MARY O'BRIEN")).toBe("Mary O'Brien");
    expect(formatPersonName("AHMAD MA'ARIF")).toBe("Ahmad Ma'arif");
    expect(formatPersonName("NUR-AIN AL-AMIN")).toBe("Nur-Ain Al-Amin");
  });

  test("keeps a vowelless surname as a word", () => {
    expect(formatPersonName("NG CHEE KEONG")).toBe("Ng Chee Keong");
  });

  test("keeps symbols and collapses whitespace", () => {
    expect(formatPersonName("  ALI  @ ALIAS   HASSAN ")).toBe("Ali @ Alias Hassan");
  });

  test("leaves mixed-case names untouched", () => {
    expect(formatPersonName("Siti Aminah binti Ali")).toBe("Siti Aminah binti Ali");
    expect(formatPersonName("MOHD Rizal")).toBe("MOHD Rizal");
    expect(formatPersonName("ee chin hock")).toBe("ee chin hock");
  });

  test("empty input", () => {
    expect(formatPersonName("")).toBe("");
    expect(formatPersonName(null)).toBe("");
    expect(formatPersonName(undefined)).toBe("");
  });
});

describe("formatFirmName", () => {
  test.each([
    ["AMIN PETRA & PARTNERS", "Amin Petra & Partners"],
    ["AKBERDIN & CO", "Akberdin & Co"],
    ["SHEARN DELAMORE & CO.", "Shearn Delamore & Co."],
    ["YC TAN & PARTNERS PLT", "YC Tan & Partners PLT"],
    ["RAHMAT LIM & PARTNERS LLP", "Rahmat Lim & Partners LLP"],
    ["THOMAS PHILIP CHAMBERS", "Thomas Philip Chambers"],
    ["ZAID IBRAHIM & CO (ZICO LAW)", "Zaid Ibrahim & Co (Zico Law)"],
    ["LEE & ASSOCIATES (KL)", "Lee & Associates (KL)"],
    ["NG & PARTNERS", "Ng & Partners"],
    ["MOHD ALI BIN HASSAN & CO", "Mohd Ali bin Hassan & Co"],
    ["RAJ A/L KUMAR & ASSOCIATES", "Raj a/l Kumar & Associates"],
    ["CHOOI AND COMPANY", "Chooi and Company"],
    ["AZMAN DAVIDSON & CO", "Azman Davidson & Co"],
    ["D'ROZARIO & SOO", "D'Rozario & Soo"],
    ["S. K. SONG", "S. K. Song"],
    ["ABC LEGAL SDN BHD", "Abc Legal Sdn Bhd"],
  ])("%s", (input, expected) => {
    expect(formatFirmName(input)).toBe(expected);
  });

  test("leaves mixed-case names untouched", () => {
    expect(formatFirmName("Skrine")).toBe("Skrine");
    expect(formatFirmName("Wong & Partners LLP")).toBe("Wong & Partners LLP");
  });

  test("empty input", () => {
    expect(formatFirmName(null)).toBe("");
  });
});

import { test as extraTest, expect as extraExpect } from "bun:test";

extraTest("particles only sit between names; fixed honorifics and Mc names keep their form", () => {
  extraExpect(formatPersonName("LIM WEI BIN")).toBe("Lim Wei Bin");
  extraExpect(formatPersonName("AHMAD BIN ALI")).toBe("Ahmad bin Ali");
  extraExpect(formatPersonName("YB DATO' AHMAD BIN ALI")).toBe("YB Dato' Ahmad bin Ali");
  extraExpect(formatPersonName("YBHG DATUK LEE")).toBe("YBhg Datuk Lee");
  extraExpect(formatPersonName("JOHN MCDONALD")).toBe("John McDonald");
});
