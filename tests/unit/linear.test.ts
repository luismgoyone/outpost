import { describe, expect, it } from "vitest";

import { findIssueKeys, linearIssueUrl, parseTeamKeys } from "@/lib/linear";

describe("findIssueKeys", () => {
  it("finds keys in titles and branch names, de-duplicated", () => {
    expect(findIssueKeys(["ENG-142: fix checkout", "eng-142-fix-checkout"])).toEqual(["ENG-142"]);
    expect(findIssueKeys(["Fix OPS-7 and ENG-9", "feature/web-31-dark-mode"])).toEqual([
      "OPS-7",
      "ENG-9",
      "WEB-31",
    ]);
  });

  it("skips look-alikes such as encodings and hashes", () => {
    expect(findIssueKeys(["Use UTF-8 everywhere", "sha-256 digests", "Bump v-2"])).toEqual([]);
    expect(findIssueKeys(["Cut release", "release-2"])).toEqual([]);
    expect(findIssueKeys(["Patch", "hotfix-12"])).toEqual([]);
  });

  it("only accepts the configured team prefixes when given", () => {
    expect(findIssueKeys(["ENG-1 and FOO-2", "abc-3"], ["ENG"])).toEqual(["ENG-1"]);
  });

  it("ignores plain branch suffixes without a key", () => {
    expect(findIssueKeys(["Add a login page", "feat/login-page"])).toEqual([]);
  });
});

describe("linear helpers", () => {
  it("builds issue URLs and parses team keys", () => {
    expect(linearIssueUrl("acme", "ENG-1")).toBe("https://linear.app/acme/issue/ENG-1");
    expect(parseTeamKeys(" ENG, ops ,,")).toEqual(["ENG", "ops"]);
    expect(parseTeamKeys(undefined)).toEqual([]);
  });
});
