import { describe, expect, test } from "bun:test";
import { MIN_LAWYERS_FOR_INDEXING, isHubPageIndexable } from "./seo";

describe("isHubPageIndexable", () => {
  test("requires at least MIN_LAWYERS_FOR_INDEXING active lawyers", () => {
    expect(MIN_LAWYERS_FOR_INDEXING).toBe(10);
    expect(isHubPageIndexable(0)).toBe(false);
    expect(isHubPageIndexable(MIN_LAWYERS_FOR_INDEXING - 1)).toBe(false);
    expect(isHubPageIndexable(MIN_LAWYERS_FOR_INDEXING)).toBe(true);
    expect(isHubPageIndexable(MIN_LAWYERS_FOR_INDEXING + 1)).toBe(true);
    expect(isHubPageIndexable(1000)).toBe(true);
  });
});
