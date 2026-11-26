import { expect, test } from "bun:test";
import { DOMAIN, PRIMARY, firmKeys, lawyerKeys } from "./keys";

const name = { canonical_name: "rafi nadir", state: "Sabah" };

test("uses release-independent primary keys and accepts only canonical source profile URLs", () => {
  expect(lawyerKeys({ ...name, source_urls: [
    "http://www.lawyerlawfirm.my/lawyer/rafi-nadir/?ref=abc#profile",
    "https://lawyerlawfirm.my/lawyer/rafi-nadir", "https://lawyerlawfirm.my/lawyer/rafi-nadir-2",
    "https://lawyerlawfirm.my.evil.example/lawyer/rafi-nadir", "https://lawyerlawfirm.my/firm/rafi-nadir",
  ] })).toEqual([
    { namespace: PRIMARY, value: "rafi nadir|Sabah" },
    { namespace: "lawyerlawfirm-url", value: "https://lawyerlawfirm.my/lawyer/rafi-nadir" },
    { namespace: "lawyerlawfirm-url", value: "https://lawyerlawfirm.my/lawyer/rafi-nadir-2" },
  ]);
});

test("excludes generic hosts and hosted subdomains from firm keys", () => {
  const primary = { namespace: PRIMARY, value: "rafi nadir|Sabah" };
  for (const website of ["fb.com", "linktr.ee/nadir", "nadir.blogspot.my", "nadir.wordpress.com", "nadir.wixsite.com", "sites.google.com/site/nadir"]) {
    expect(firmKeys({ ...name, website })).toEqual([primary]);
  }
  expect(firmKeys({ ...name, website: "https://www.nadir.example/legal" })).toEqual([primary, { namespace: DOMAIN, value: "nadir.example" }]);
});
