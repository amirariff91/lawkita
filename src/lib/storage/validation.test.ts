import { describe, expect, test } from "bun:test";
import {
  assertStorageRequest,
  assertUploadedFile,
  buildStorageKey,
  isStorageKeyForPurpose,
} from "./validation";

const resourceId = "123e4567-e89b-12d3-a456-426614174000";

describe("storage validation", () => {
  test("builds a scoped document key", () => {
    const key = buildStorageKey({
      purpose: "claim-document",
      resourceId,
      filename: "certificate.pdf",
      contentType: "application/pdf",
      objectId: "987e6543-e21b-12d3-a456-426614174999",
    });

    expect(key).toBe(`claims/${resourceId}/987e6543-e21b-12d3-a456-426614174999.pdf`);
    expect(isStorageKeyForPurpose(key, "claim-document", resourceId)).toBe(true);
    expect(isStorageKeyForPurpose(key, "firm-logo", resourceId)).toBe(false);
  });

  test("uses a stable key for firm-logo upserts", () => {
    const key = buildStorageKey({
      purpose: "firm-logo",
      resourceId,
      filename: "brand.png",
      contentType: "image/png",
    });

    expect(key).toBe(`firms/${resourceId}/logo.png`);
    expect(isStorageKeyForPurpose(key, "firm-logo", resourceId)).toBe(true);
  });

  test("rejects an invalid bucket, type, or size", () => {
    expect(() =>
      assertStorageRequest({
        bucket: "images",
        purpose: "claim-document",
        contentType: "image/png",
        size: 100,
      })
    ).toThrow("bucket");

    expect(() =>
      assertStorageRequest({
        bucket: "documents",
        purpose: "claim-document",
        contentType: "application/zip",
        size: 100,
      })
    ).toThrow("file type");

    expect(() =>
      assertStorageRequest({
        bucket: "images",
        purpose: "firm-logo",
        contentType: "image/png",
        size: 6 * 1024 * 1024,
      })
    ).toThrow("5MB");
  });

  test("does not accept traversal or a mismatched resource id", () => {
    const key = `firms/${resourceId}/987e6543-e21b-12d3-a456-426614174999.png`;
    expect(isStorageKeyForPurpose(key, "firm-logo", resourceId)).toBe(true);
    expect(isStorageKeyForPurpose(`../${key}`, "firm-logo", resourceId)).toBe(false);
    expect(isStorageKeyForPurpose(key, "firm-logo", "123e4567-e89b-12d3-a456-426614174001")).toBe(
      false
    );
  });

  test("accepts an uploaded file only when its bytes match its MIME type", () => {
    expect(() =>
      assertUploadedFile({
        bucket: "documents",
        contentType: "application/pdf",
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]),
      })
    ).not.toThrow();

    expect(() =>
      assertUploadedFile({
        bucket: "documents",
        contentType: "application/pdf",
        bytes: new TextEncoder().encode("not a pdf"),
      })
    ).toThrow("does not match");
  });

  test("checks the received byte length instead of a client-provided size", () => {
    const oversizedPdf = new Uint8Array(10 * 1024 * 1024 + 1);
    oversizedPdf.set([0x25, 0x50, 0x44, 0x46, 0x2d]);

    expect(() =>
      assertUploadedFile({
        bucket: "documents",
        contentType: "application/pdf",
        bytes: oversizedPdf,
      })
    ).toThrow("10MB");
  });

  test("validates the full received size while inspecting only signature bytes", () => {
    expect(() =>
      assertUploadedFile({
        bucket: "documents",
        contentType: "application/pdf",
        bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
        size: 10 * 1024 * 1024 + 1,
      })
    ).toThrow("10MB");
  });
});
