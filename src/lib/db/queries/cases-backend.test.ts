import { describe, expect, test } from "bun:test";
import { getLegacyCasesConfiguration, resolveCasesQueryBackend } from "./cases-backend";

describe("cases query backend", () => {
  test("preserves the historical PostgREST path when it is configured", () => {
    const environment = {
      LEGACY_CASES_URL: "https://legacy.example.com/",
      LEGACY_CASES_ANON_KEY: "anon-key",
    };

    expect(resolveCasesQueryBackend(environment)).toBe("legacy");
    expect(getLegacyCasesConfiguration(environment)).toEqual({
      url: "https://legacy.example.com",
      key: "anon-key",
    });
  });

  test("retains self-hosted compatibility only through explicit opt-in", () => {
    expect(resolveCasesQueryBackend({ CASES_QUERY_BACKEND: "postgres" })).toBe(
      "postgres"
    );
  });

  test("does not silently move cases back to Drizzle", () => {
    expect(() => resolveCasesQueryBackend({})).toThrow("explicitly opt into");
  });

  test("fails closed on a partial legacy configuration", () => {
    expect(() =>
      resolveCasesQueryBackend({ LEGACY_CASES_URL: "https://legacy.example.com" })
    ).toThrow("require both");
  });

  test("does not mix dedicated and fallback credential pairs", () => {
    expect(() =>
      getLegacyCasesConfiguration({
        LEGACY_CASES_URL: "https://legacy.example.com",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "unrelated-key",
      })
    ).toThrow("LEGACY_CASES_ANON_KEY");
  });
});
