import "server-only";

import { createHash, createHmac } from "node:crypto";
import {
  type StorageBucket,
  STORAGE_BUCKETS,
} from "./validation";
import {
  resolveLegacyUploadUrl,
  type LegacyUploadResponse,
} from "./legacy";

export type StorageBackend = "garage" | "legacy";

export interface PresignedUpload {
  backend: StorageBackend;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  publicUrl: string;
  expiresIn: number;
}

export interface ObjectStorage {
  readonly backend: StorageBackend;
  createPresignedUpload(input: {
    bucket: StorageBucket;
    key: string;
    contentType: string;
    upsert?: boolean;
  }): Promise<PresignedUpload>;
  deleteObject(input: { bucket: StorageBucket; key: string }): Promise<void>;
}

export interface StorageConfigurationStatus {
  backend: StorageBackend;
  configured: boolean;
  missing: string[];
}

function readBackend(): StorageBackend {
  return process.env.STORAGE_BACKEND === "legacy" ? "legacy" : "garage";
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function canonicalQuery(parameters: Record<string, string>): string {
  return Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeQuery(key)}=${encodeQuery(value)}`)
    .join("&");
}

function canonicalPath(bucket: string, key: string, forcePathStyle: boolean): string {
  const encodedKey = encodeObjectPath(key);
  return forcePathStyle
    ? `/${encodeURIComponent(bucket)}/${encodedKey}`
    : `/${encodedKey}`;
}

function getS3Host(endpoint: string, bucket: string, forcePathStyle: boolean): string {
  const url = new URL(endpoint);
  return forcePathStyle ? url.host : `${bucket}.${url.host}`;
}

function getS3Origin(endpoint: string, bucket: string, forcePathStyle: boolean): string {
  const url = new URL(endpoint);
  return forcePathStyle ? `${url.protocol}//${url.host}` : `${url.protocol}//${bucket}.${url.host}`;
}

function signAwsRequest(input: {
  method: "PUT" | "DELETE";
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  expiresIn?: number;
}): { url: string; headers: Record<string, string> } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const shortDate = amzDate.slice(0, 8);
  const service = "s3";
  const host = getS3Host(input.endpoint, input.bucket, input.forcePathStyle);
  const path = canonicalPath(input.bucket, input.key, input.forcePathStyle);
  const credentialScope = `${shortDate}/${input.region}/${service}/aws4_request`;
  const headers: Record<string, string> = { host };
  const payloadHash = input.method === "PUT" ? "UNSIGNED-PAYLOAD" : hash("");
  let query: Record<string, string> = {};

  if (input.expiresIn) {
    query = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${input.accessKeyId}/${credentialScope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": String(input.expiresIn),
      "X-Amz-SignedHeaders": "host",
    };
  } else {
    headers["x-amz-content-sha256"] = payloadHash;
    headers["x-amz-date"] = amzDate;
  }

  const signedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${headers[name]!.trim()}\n`)
    .join("");
  const canonicalRequest = [
    input.method,
    path,
    canonicalQuery(query),
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, shortDate), input.region), service),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  if (input.expiresIn) {
    query["X-Amz-Signature"] = signature;
    return {
      url: `${getS3Origin(input.endpoint, input.bucket, input.forcePathStyle)}${path}?${canonicalQuery(query)}`,
      headers: {},
    };
  }

  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;
  return {
    url: `${getS3Origin(input.endpoint, input.bucket, input.forcePathStyle)}${path}`,
    headers,
  };
}

function getBucketName(bucket: StorageBucket): string {
  return bucket === "images"
    ? process.env.GARAGE_BUCKET_IMAGES || "images"
    : process.env.GARAGE_BUCKET_DOCUMENTS || "documents";
}

function getGarageConfiguration(): {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  forcePathStyle: boolean;
} {
  const endpoint = process.env.GARAGE_ENDPOINT;
  const accessKeyId = process.env.GARAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.GARAGE_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Garage storage is not configured. Set GARAGE_ENDPOINT, GARAGE_ACCESS_KEY_ID, and GARAGE_SECRET_ACCESS_KEY."
    );
  }

  return {
    endpoint: trimTrailingSlash(endpoint),
    region: process.env.GARAGE_REGION || "garage",
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: trimTrailingSlash(process.env.GARAGE_PUBLIC_BASE_URL || endpoint),
    forcePathStyle: process.env.GARAGE_FORCE_PATH_STYLE !== "false",
  };
}

function getLegacyConfiguration(): { endpoint: string; token: string } {
  const endpoint = process.env.LEGACY_STORAGE_URL;
  const token = process.env.LEGACY_STORAGE_TOKEN;

  if (!endpoint || !token) {
    throw new Error(
      "Legacy storage is not configured. Set LEGACY_STORAGE_URL and LEGACY_STORAGE_TOKEN only while completing the storage cutover."
    );
  }

  return { endpoint: trimTrailingSlash(endpoint), token };
}

function getGarageObjectUrl(
  publicBaseUrl: string,
  bucket: StorageBucket,
  key: string
): string {
  return `${publicBaseUrl}/${encodeURIComponent(getBucketName(bucket))}/${encodeObjectPath(key)}`;
}

class GarageStorage implements ObjectStorage {
  readonly backend = "garage" as const;
  private readonly endpoint: string;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;
  private readonly publicBaseUrl: string;

  constructor() {
    const config = getGarageConfiguration();
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.forcePathStyle = config.forcePathStyle;
    this.publicBaseUrl = config.publicBaseUrl;
  }

  async createPresignedUpload(input: {
    bucket: StorageBucket;
    key: string;
    contentType: string;
    upsert?: boolean;
  }): Promise<PresignedUpload> {
    const expiresIn = 15 * 60;
    const signed = signAwsRequest({
      method: "PUT",
      endpoint: this.endpoint,
      bucket: getBucketName(input.bucket),
      key: input.key,
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      forcePathStyle: this.forcePathStyle,
      expiresIn,
    });

    return {
      backend: this.backend,
      uploadUrl: signed.url,
      uploadHeaders: { "Content-Type": input.contentType },
      publicUrl: getGarageObjectUrl(this.publicBaseUrl, input.bucket, input.key),
      expiresIn,
    };
  }

  async deleteObject(input: { bucket: StorageBucket; key: string }): Promise<void> {
    const signed = signAwsRequest({
      method: "DELETE",
      endpoint: this.endpoint,
      bucket: getBucketName(input.bucket),
      key: input.key,
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      forcePathStyle: this.forcePathStyle,
    });
    const response = await fetch(signed.url, {
      method: "DELETE",
      headers: signed.headers,
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Garage storage deletion failed with status ${response.status}`);
    }
  }
}

class LegacyStorage implements ObjectStorage {
  readonly backend = "legacy" as const;

  async createPresignedUpload(input: {
    bucket: StorageBucket;
    key: string;
    contentType: string;
    upsert?: boolean;
  }): Promise<PresignedUpload> {
    const { endpoint, token } = getLegacyConfiguration();
    const bucket = getBucketName(input.bucket);
    const storageApiUrl = `${endpoint}/storage/v1`;
    const signUrl = `${storageApiUrl}/object/upload/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(input.key)}`;
    const response = await fetch(signUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(input.upsert ? { upsert: true } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Legacy storage signing failed with status ${response.status}`);
    }

    const result = (await response.json()) as LegacyUploadResponse;
    const uploadUrl = resolveLegacyUploadUrl(storageApiUrl, result);

    return {
      backend: this.backend,
      uploadUrl,
      uploadHeaders: {
        "Content-Type": input.contentType,
        ...(result.token ? { Authorization: `Bearer ${result.token}` } : {}),
      },
      publicUrl: `${endpoint}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeObjectPath(input.key)}`,
      expiresIn: 15 * 60,
    };
  }

  async deleteObject(input: { bucket: StorageBucket; key: string }): Promise<void> {
    const { endpoint, token } = getLegacyConfiguration();
    const bucket = getBucketName(input.bucket);
    const response = await fetch(`${endpoint}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(input.key)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: token,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Legacy storage deletion failed with status ${response.status}`);
    }
  }
}

export function getStorageConfigurationStatus(): StorageConfigurationStatus {
  const backend = readBackend();
  const required =
    backend === "garage"
      ? [
          "GARAGE_ENDPOINT",
          "GARAGE_ACCESS_KEY_ID",
          "GARAGE_SECRET_ACCESS_KEY",
          "GARAGE_PUBLIC_BASE_URL",
        ]
      : ["LEGACY_STORAGE_URL", "LEGACY_STORAGE_TOKEN"];
  const missing = required.filter((name) => !process.env[name]);

  return { backend, configured: missing.length === 0, missing };
}

export function createStorageProvider(): ObjectStorage {
  return readBackend() === "legacy" ? new LegacyStorage() : new GarageStorage();
}

export { STORAGE_BUCKETS };
