"use client";

import type { StorageBucket, StoragePurpose } from "./validation";

export async function uploadStorageFile(input: {
  bucket: StorageBucket;
  purpose: StoragePurpose;
  resourceId: string;
  file: File;
  upsert?: boolean;
  onProgress?: (progress: number) => void;
}): Promise<string> {
  input.onProgress?.(15);

  const formData = new FormData();
  formData.set("bucket", input.bucket);
  formData.set("purpose", input.purpose);
  formData.set("resourceId", input.resourceId);
  formData.set("file", input.file);
  formData.set("upsert", String(input.upsert ?? false));

  input.onProgress?.(35);
  const response = await fetch("/api/storage", {
    method: "POST",
    body: formData,
  });

  const result = (await response.json().catch(() => null)) as {
    publicUrl?: string;
    error?: string;
  } | null;

  if (!response.ok || !result?.publicUrl) {
    throw new Error(result?.error || "Failed to upload file");
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
