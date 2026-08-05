import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const originalFetch = globalThis.fetch;
const garageEnvironment = {
  GARAGE_ENDPOINT: process.env.GARAGE_ENDPOINT,
  GARAGE_ACCESS_KEY_ID: process.env.GARAGE_ACCESS_KEY_ID,
  GARAGE_SECRET_ACCESS_KEY: process.env.GARAGE_SECRET_ACCESS_KEY,
  GARAGE_PUBLIC_BASE_URL: process.env.GARAGE_PUBLIC_BASE_URL,
  STORAGE_BACKEND: process.env.STORAGE_BACKEND,
};

let createStorageProvider: typeof import("./backend").createStorageProvider;

beforeAll(async () => {
  ({ createStorageProvider } = await import("./backend"));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(garageEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("storage backend health probe", () => {
  test("performs an authenticated Garage request", async () => {
    process.env.STORAGE_BACKEND = "garage";
    process.env.GARAGE_ENDPOINT = "https://garage.example.com";
    process.env.GARAGE_ACCESS_KEY_ID = "garage-access-key";
    process.env.GARAGE_SECRET_ACCESS_KEY = "garage-secret-key";
    process.env.GARAGE_PUBLIC_BASE_URL = "https://files.example.com";

    let request: { url: string; init?: RequestInit } | undefined;
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      request = { url: String(url), init };
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    await createStorageProvider().probe();

    expect(request?.init?.method).toBe("HEAD");
    expect(request?.url).toContain("/documents/");
    expect(new Headers(request?.init?.headers).get("Authorization")).toContain(
      "Credential=garage-access-key/"
    );
    expect(new Headers(request?.init?.headers).get("x-amz-date")).toBeTruthy();
  });

  test("rejects a failed authenticated Garage request", async () => {
    process.env.STORAGE_BACKEND = "garage";
    process.env.GARAGE_ENDPOINT = "https://garage.example.com";
    process.env.GARAGE_ACCESS_KEY_ID = "garage-access-key";
    process.env.GARAGE_SECRET_ACCESS_KEY = "garage-secret-key";
    process.env.GARAGE_PUBLIC_BASE_URL = "https://files.example.com";
    globalThis.fetch = (async () =>
      new Response(null, { status: 403 })) as unknown as typeof fetch;

    expect(createStorageProvider().probe()).rejects.toThrow("status 403");
  });
});
