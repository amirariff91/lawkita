import { describe, expect, test } from "bun:test";
import { POST } from "./route";

describe("storage presign endpoint", () => {
  test("does not expose direct upload permission for any purpose", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "Direct storage uploads are disabled; upload through /api/storage",
    });
  });
});
