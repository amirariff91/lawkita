import { describe, expect, test } from "bun:test";
import { safeHttpUrl, serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  test("cannot close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>" });
  });

  test("escapes line separators that break inline scripts", () => {
    expect(serializeJsonLd({ a: "x\u2028y\u2029z" })).toBe('{"a":"x\\u2028y\\u2029z"}');
  });
});

describe("safeHttpUrl", () => {
  test("accepts http and https only", () => {
    expect(safeHttpUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("example.com")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
