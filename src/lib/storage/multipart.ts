export class UploadBodyTooLargeError extends Error {
  constructor() {
    super("Upload body exceeds the allowed size");
    this.name = "UploadBodyTooLargeError";
  }
}

export async function parseLimitedMultipartFormData(
  request: Pick<Request, "body" | "headers">,
  maxBytes: number
): Promise<FormData> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new TypeError("Expected a multipart form upload");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      throw new UploadBodyTooLargeError();
    }
  }

  if (!request.body) {
    throw new TypeError("Upload body is missing");
  }

  let receivedBytes = 0;
  const limitedBody = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        if (receivedBytes > maxBytes) {
          controller.error(new UploadBodyTooLargeError());
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );

  return new Response(limitedBody, {
    headers: { "Content-Type": contentType },
  }).formData();
}
