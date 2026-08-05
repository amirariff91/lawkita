import { describe, expect, test } from "bun:test";
import { parseLimitedMultipartFormData, UploadBodyTooLargeError } from "./multipart";

describe("limited multipart parsing", () => {
  test("parses a multipart body below the streaming limit", async () => {
    const formData = new FormData();
    formData.set("purpose", "review-document");
    formData.set("file", new File(["%PDF-1.7"], "invoice.pdf"));
    const request = new Request("https://example.com/upload", {
      method: "POST",
      body: formData,
    });

    const parsed = await parseLimitedMultipartFormData(request, 1024);
    expect(parsed.get("purpose")).toBe("review-document");
    expect(parsed.get("file")).toBeInstanceOf(File);
  });

  test("rejects a streamed body that exceeds a falsified content length", async () => {
    const request = new Request("https://example.com/upload", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=test",
        "Content-Length": "1",
      },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(8));
          controller.close();
        },
      }),
      // Required by Node's fetch implementation for a streaming request body.
      duplex: "half",
    } as RequestInit);

    expect(parseLimitedMultipartFormData(request, 4)).rejects.toBeInstanceOf(
      UploadBodyTooLargeError
    );
  });

  test("rejects an oversized declared content length before parsing", async () => {
    const request = new Request("https://example.com/upload", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=test",
        "Content-Length": "5",
      },
      body: "test",
    });

    expect(parseLimitedMultipartFormData(request, 4)).rejects.toBeInstanceOf(
      UploadBodyTooLargeError
    );
  });
});
