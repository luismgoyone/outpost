import { describe, expect, it } from "vitest";

import { safeCallbackPath } from "@/lib/safe-redirect";

describe("safeCallbackPath", () => {
  it("keeps same-site paths with their query", () => {
    expect(safeCallbackPath("/pull-requests?repo=api")).toBe("/pull-requests?repo=api");
  });

  it("falls back for missing, absolute or protocol-relative URLs", () => {
    expect(safeCallbackPath(undefined)).toBe("/my-work");
    expect(safeCallbackPath(["/a", "/b"])).toBe("/my-work");
    expect(safeCallbackPath("https://evil.example")).toBe("/my-work");
    expect(safeCallbackPath("//evil.example")).toBe("/my-work");
    expect(safeCallbackPath("/\\evil.example")).toBe("/my-work");
    expect(safeCallbackPath("javascript:alert(1)")).toBe("/my-work");
  });
});
