import { expect, test } from "bun:test";
import { normalizeCity } from "./cities";

test("normalizes explicit dataset aliases and preserves other cities", () => {
  expect(["Georgetown", "Seremban 2", "Johor Bharu", "Sri Manjung", "Bandar Baru Bangi", "Nusajaya", " KL City "]
    .map(normalizeCity)).toEqual(["George Town", "Seremban", "Johor Bahru", "Seri Manjung", "Bangi", "Iskandar Puteri", "Kuala Lumpur"]);
  expect(normalizeCity("Kuala Selangor")).toBe("Kuala Selangor");
  expect(normalizeCity("  ")).toBeNull();
});
