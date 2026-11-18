import { afterEach, describe, expect, test } from "bun:test";
import { searchCases } from "./cases-legacy";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.LEGACY_CASES_URL;
const originalKey = process.env.LEGACY_CASES_ANON_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.LEGACY_CASES_URL;
  else process.env.LEGACY_CASES_URL = originalUrl;
  if (originalKey === undefined) delete process.env.LEGACY_CASES_ANON_KEY;
  else process.env.LEGACY_CASES_ANON_KEY = originalKey;
});

describe("legacy cases queries", () => {
  test("reads cases through the historical authenticated PostgREST path", async () => {
    process.env.LEGACY_CASES_URL = "https://legacy.example.com";
    process.env.LEGACY_CASES_ANON_KEY = "anon-key";
    let request: Request | undefined;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      request = new Request(input, init);
      return Response.json(
        [
          {
            id: "case-id",
            slug: "example-case",
            title: "Example Case",
            subtitle: null,
            description: null,
            category: "other",
            status: "ongoing",
            is_featured: false,
            outcome: null,
            verdict_date: null,
            tags: [],
            og_image: null,
          },
        ],
        { headers: { "Content-Range": "0-0/1" } }
      );
    }) as typeof fetch;

    const result = await searchCases({ limit: 12 });

    expect(result.cases).toHaveLength(1);
    expect(request?.url).toStartWith("https://legacy.example.com/rest/v1/cases?");
    expect(request?.headers.get("apikey")).toBe("anon-key");
    expect(request?.headers.get("Authorization")).toBe("Bearer anon-key");
  });
});
