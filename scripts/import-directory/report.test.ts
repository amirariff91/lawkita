import { expect, test } from "bun:test";
import { parseApprovals } from "./report";

test("reads explicit yes approvals with quoted keys and multiline status notes", () => {
  const csv = '\uFEFFkey,note,fingerprint,approved\r\n"rafi, nadir|Sabah","line one\r\nline ""two""",0123456789abcdef,yes\r\n"rana nadir|Sarawak",,0123456789abcdef,no\r\n"arslan nadir|Johor",,,\r\n';
  expect([...parseApprovals(csv)]).toEqual([["rafi, nadir|Sabah", "0123456789abcdef"]]);
});

test("rejects malformed, duplicate, or ambiguous approvals", () => {
  for (const csv of ['key,fingerprint,approved\n"bad,,yes', "key,fingerprint,approved\nrafi|Sabah,0123456789abcdef,yes\nrafi|Sabah,,no",
    "key,fingerprint,approved\nrafi|Sabah,,maybe", "key,approved\nrafi|Sabah,yes", "key,fingerprint,approved\nrafi|Sabah,,yes"]) {
    expect(() => parseApprovals(csv)).toThrow();
  }
});
