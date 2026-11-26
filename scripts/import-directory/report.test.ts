import { expect, test } from "bun:test";
import { parseApprovals } from "./report";

test("reads explicit yes approvals with quoted keys and multiline status notes", () => {
  const csv = '\uFEFFkey,note,approved\r\n"rafi, nadir|Sabah","line one\r\nline ""two""",yes\r\n"rana nadir|Sarawak",,no\r\n"arslan nadir|Johor",,\r\n';
  expect([...parseApprovals(csv)]).toEqual(["rafi, nadir|Sabah"]);
});

test("rejects malformed, duplicate, or ambiguous approvals", () => {
  for (const csv of ['key,approved\n"bad,yes', "key,approved\nrafi|Sabah,yes\nrafi|Sabah,no", "key,approved\nrafi|Sabah,maybe"]) {
    expect(() => parseApprovals(csv)).toThrow();
  }
});
