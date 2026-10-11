import { describe, expect, it } from "vitest";

import { checkPermissions, REQUIRED_PERMISSIONS } from "@/lib/github/permissions";

describe("checkPermissions", () => {
  it("reports each required permission with its granted level", () => {
    const report = checkPermissions({ metadata: "read", pull_requests: "write", issues: "read" });
    expect(report).toHaveLength(REQUIRED_PERMISSIONS.length);
    expect(report.find((p) => p.name === "metadata")?.granted).toBe("read");
    expect(report.find((p) => p.name === "pull_requests")?.granted).toBe("write");
    expect(report.find((p) => p.name === "actions")?.granted).toBeNull();
  });

  it("ignores unknown levels", () => {
    expect(checkPermissions({ contents: "none" }).find((p) => p.name === "contents")?.granted).toBe(
      null,
    );
  });
});
