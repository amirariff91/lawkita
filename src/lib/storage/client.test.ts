import { afterEach, describe, expect, test } from "bun:test";
import { uploadStorageFile } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("storage client", () => {
  test.each([
    ["review-document", "documents", "invoice.pdf", "application/pdf"],
    ["claim-document", "documents", "certificate.pdf", "application/pdf"],
    ["firm-claim-document", "documents", "registration.pdf", "application/pdf"],
    ["firm-logo", "images", "logo.png", "image/png"],
  ] as const)(
    "proxies %s without exposing a presigned URL",
    async (purpose, bucket, filename, contentType) => {
      const requests: Array<{ url: string; init?: RequestInit }> = [];
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init });
        return Response.json({ publicUrl: `https://files.example.com/${filename}` });
      }) as typeof fetch;

      const result = await uploadStorageFile({
        bucket,
        purpose,
        resourceId: "123e4567-e89b-12d3-a456-426614174000",
        file: new File([contentType === "application/pdf" ? "%PDF-1.7" : "png"], filename, {
          type: contentType,
        }),
      });

      expect(result).toBe(`https://files.example.com/${filename}`);
      expect(requests).toHaveLength(1);
      expect(requests[0]?.url).toBe("/api/storage");
      expect(requests[0]?.init?.method).toBe("POST");
      expect(requests[0]?.init?.body).toBeInstanceOf(FormData);
    }
  );
});
