export const STORAGE_BUCKETS = ["images", "documents"] as const;
export type StorageBucket = (typeof STORAGE_BUCKETS)[number];

export const STORAGE_PURPOSES = [
  "review-document",
  "claim-document",
  "firm-claim-document",
  "firm-logo",
] as const;
export type StoragePurpose = (typeof STORAGE_PURPOSES)[number];

export const STORAGE_LIMITS: Record<StorageBucket, number> = {
  images: 5 * 1024 * 1024,
  documents: 10 * 1024 * 1024,
};

const ALLOWED_CONTENT_TYPES: Record<StorageBucket, readonly string[]> = {
  images: ["image/jpeg", "image/png", "image/webp"],
  documents: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PURPOSE_BUCKETS: Record<StoragePurpose, StorageBucket> = {
  "review-document": "documents",
  "claim-document": "documents",
  "firm-claim-document": "documents",
  "firm-logo": "images",
};

export function getFileExtension(filename: string, contentType: string): string {
  const contentTypeExtension = CONTENT_TYPE_EXTENSIONS[contentType];
  if (contentTypeExtension) return contentTypeExtension;

  const filenameExtension = filename
    .trim()
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (filenameExtension && filenameExtension.length <= 8) {
    return filenameExtension;
  }

  return "bin";
}

export function getStoragePrefix(purpose: StoragePurpose): string {
  switch (purpose) {
    case "review-document":
      return "reviews";
    case "claim-document":
      return "claims";
    case "firm-claim-document":
      return "firm-claims";
    case "firm-logo":
      return "firms";
  }
}

export function assertStorageRequest(input: {
  bucket: StorageBucket;
  contentType: string;
  size: number;
  purpose: StoragePurpose;
}): void {
  if (PURPOSE_BUCKETS[input.purpose] !== input.bucket) {
    throw new Error("The requested storage bucket is not valid for this upload");
  }

  assertStorageFileConstraints(input);
}

function assertStorageFileConstraints(input: {
  bucket: StorageBucket;
  contentType: string;
  size: number;
}): void {
  if (!ALLOWED_CONTENT_TYPES[input.bucket].includes(input.contentType)) {
    throw new Error("This file type is not supported");
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new Error("File size must be greater than zero");
  }

  if (input.size > STORAGE_LIMITS[input.bucket]) {
    throw new Error(`File size must be less than ${STORAGE_LIMITS[input.bucket] / 1024 / 1024}MB`);
  }
}

function hasBytesAt(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function detectUploadedContentType(bytes: Uint8Array): string | null {
  if (hasBytesAt(bytes, 0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasBytesAt(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    hasBytesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }

  const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2d];
  const pdfSearchLimit = Math.min(bytes.length - pdfHeader.length, 1024);
  for (let offset = 0; offset <= pdfSearchLimit; offset += 1) {
    if (hasBytesAt(bytes, offset, pdfHeader)) return "application/pdf";
  }

  return null;
}

export function assertUploadedFile(input: {
  bucket: StorageBucket;
  contentType: string;
  bytes: Uint8Array;
  size?: number;
}): void {
  assertStorageFileConstraints({
    bucket: input.bucket,
    contentType: input.contentType,
    size: input.size ?? input.bytes.byteLength,
  });

  if (detectUploadedContentType(input.bytes) !== input.contentType) {
    throw new Error("The uploaded file content does not match its declared file type");
  }
}

export function buildStorageKey(input: {
  purpose: StoragePurpose;
  resourceId: string;
  filename: string;
  contentType: string;
  objectId?: string;
}): string {
  const prefix = getStoragePrefix(input.purpose);
  const extension = getFileExtension(input.filename, input.contentType);
  const objectId = input.objectId ?? (input.purpose === "firm-logo" ? "logo" : crypto.randomUUID());

  return `${prefix}/${input.resourceId}/${objectId}.${extension}`;
}

export function isStorageKeyForPurpose(
  key: string,
  purpose: StoragePurpose,
  resourceId: string
): boolean {
  const prefix = getStoragePrefix(purpose);
  const expectedPrefix = `${prefix}/${resourceId}/`;
  if (!key.startsWith(expectedPrefix)) return false;

  return /^(?:logo|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.[a-z0-9]+$/i.test(
    key.slice(expectedPrefix.length)
  );
}
