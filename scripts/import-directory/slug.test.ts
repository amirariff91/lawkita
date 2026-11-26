import { expect, test } from "bun:test";
import { firmSlug, lawyerSlug, stableOrder } from "./slug";

const row = { full_name: "Datuk Rafi, Nadir", canonical_name: "rafi nadir", city: "Shah Alam", state: "Selangor" };

test("allocates lawyer collisions in city, state and numeric order", () => {
  const used = new Set(["datuk-rafi-nadir"]);
  expect(lawyerSlug(row, used)).toEqual({ slug: "datuk-rafi-nadir-shah-alam", rule: "city" });
  expect(lawyerSlug(row, used)).toEqual({ slug: "datuk-rafi-nadir-selangor", rule: "state" });
  expect(lawyerSlug(row, used)).toEqual({ slug: "datuk-rafi-nadir-2", rule: "number" });
  expect(lawyerSlug(row, used)).toEqual({ slug: "datuk-rafi-nadir-3", rule: "number" });
});

test("stable key ordering predicts which new row receives the base slug", () => {
  const otherState = { ...row, state: "Johor" };
  const allocate = (input: (typeof row)[]) => {
    const used = new Set<string>();
    return stableOrder(input).map((row) => [row.state, lawyerSlug(row, used).slug]);
  };
  const expected = [["Johor", "datuk-rafi-nadir"], ["Selangor", "datuk-rafi-nadir-shah-alam"]];
  expect(allocate([row, otherState])).toEqual(expected);
  expect(allocate([otherState, row])).toEqual(expected);
});

test("firm slugs retain the repository's base and append state, then numbers", () => {
  const row = { name: "Nadir & Co.", city: "Shah Alam", state: "Selangor" };
  const used = new Set<string>();
  expect(firmSlug(row, used)).toEqual({ slug: "nadir-co-shah-alam", rule: "base" });
  expect(firmSlug(row, used)).toEqual({ slug: "nadir-co-shah-alam-selangor", rule: "state" });
  expect(firmSlug(row, used)).toEqual({ slug: "nadir-co-shah-alam-2", rule: "number" });
});
