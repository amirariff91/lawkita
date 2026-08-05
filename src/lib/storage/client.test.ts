import { afterEach, describe, expect, test } from "bun:test";
import { uploadStorageFile } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("storage client", () => {
  test("proxies anonymous review documents without requesting a presigned URL", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(url), init });
      return Response.json({ publicUrl: "https://files.example.com/review.pdf" });
    }) as typeof fetch;

    const result = await uploadStorageFile({
      bucket: "documents",
      purpose: "review-document",
      resourceId: "123e4567-e89b-12d3-a456-426614174000",
      file: new File(["%PDF-1.7"], "invoice.pdf", { type: "application/pdf" }),
    });

    expect(result).toBe("https://files.example.com/review.pdf");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("/api/storage");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(requests[0]?.init?.body).toBeInstanceOf(FormData);
  });
});
