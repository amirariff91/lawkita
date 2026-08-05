"use client";

import type {
  StorageBucket,
  StoragePurpose,
} from "./validation";

export async function uploadStorageFile(input: {
  bucket: StorageBucket;
  purpose: StoragePurpose;
  resourceId: string;
  file: File;
  upsert?: boolean;
  onProgress?: (progress: number) => void;
}): Promise<string> {
  input.onProgress?.(15);

  if (input.purpose === "review-document") {
    const formData = new FormData();
    formData.set("bucket", input.bucket);
    formData.set("purpose", input.purpose);
    formData.set("resourceId", input.resourceId);
    formData.set("file", input.file);

    input.onProgress?.(35);
    const response = await fetch("/api/storage", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json().catch(() => null)) as
      | { publicUrl?: string; error?: string }
      | null;

    if (!response.ok || !result?.publicUrl) {
      throw new Error(result?.error || "Failed to upload review document");
    }

    input.onProgress?.(100);
    return result.publicUrl;
  }

  const response = await fetch("/api/storage/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: input.bucket,
      purpose: input.purpose,
      resourceId: input.resourceId,
      filename: input.file.name,
      contentType: input.file.type,
      size: input.file.size,
      upsert: input.upsert ?? false,
    }),
  });

  const result = (await response.json().catch(() => null)) as
    | {
        uploadUrl?: string;
        uploadHeaders?: Record<string, string>;
        publicUrl?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !result?.uploadUrl || !result.publicUrl) {
    throw new Error(result?.error || "Failed to prepare file upload");
  }

  input.onProgress?.(35);
  const uploadResponse = await fetch(result.uploadUrl, {
    method: "PUT",
    headers: result.uploadHeaders,
    body: input.file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`File upload failed with status ${uploadResponse.status}`);
  }

  input.onProgress?.(100);
  return result.publicUrl;
}
export async function deleteStorageFile(input: {
  bucket: StorageBucket;
  key: string;
}): Promise<void> {
  const response = await fetch("/api/storage", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(result?.error || "Failed to delete file");
  }
}
