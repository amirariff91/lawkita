import { describe, expect, test } from "bun:test";
import { getLegacySigningHeaders, resolveLegacyUploadUrl } from "./legacy";

describe("legacy storage upload URL", () => {
  test("preserves the API URL and its signed token", () => {
    const apiUrl = "/object/upload/sign/documents/reviews/id/file.pdf?token=signed-token";

    expect(resolveLegacyUploadUrl("https://storage.example.com/storage/v1", { url: apiUrl })).toBe(
      `https://storage.example.com/storage/v1${apiUrl}`
    );
  });

  test("does not reconstruct an absolute API URL", () => {
    const apiUrl = "https://uploads.example.com/object.pdf?token=signed-token&x-upsert=false";

    expect(resolveLegacyUploadUrl("https://storage.example.com/storage/v1", { url: apiUrl })).toBe(
      apiUrl
    );
  });

  test("rejects a signing response without an upload URL", () => {
    expect(() =>
      resolveLegacyUploadUrl("https://storage.example.com/storage/v1", {
        token: "orphan-token",
      })
    ).toThrow("upload URL");
  });

  test("sends the requested upsert permission to legacy storage", () => {
    expect(getLegacySigningHeaders("service-token", true)).toMatchObject({
      Authorization: "Bearer service-token",
      apikey: "service-token",
      "x-upsert": "true",
    });
    expect(getLegacySigningHeaders("service-token", false)["x-upsert"]).toBe("false");
  });
});
