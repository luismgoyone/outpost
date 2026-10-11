import { describe, expect, it } from "vitest";

import { explainWriteError, nudgeComment, parseVercelLogUrl } from "@/lib/write-actions";

describe("parseVercelLogUrl", () => {
  it("reads team, project and deployment ID from a Vercel log URL", () => {
    expect(parseVercelLogUrl("https://vercel.com/acme-team/web/9xKqT2abc")).toEqual({
      team: "acme-team",
      project: "web",
      deploymentId: "dpl_9xKqT2abc",
    });
  });

  it("rejects anything that isn't a Vercel deployment URL", () => {
    expect(parseVercelLogUrl(null)).toBeNull();
    expect(parseVercelLogUrl("not a url")).toBeNull();
    expect(parseVercelLogUrl("https://evil.example/acme/web/abc")).toBeNull();
    expect(parseVercelLogUrl("https://vercel.com/acme/web")).toBeNull();
    expect(parseVercelLogUrl("https://vercel.com/acme/web/abc?x=1#y")).toEqual({
      team: "acme",
      project: "web",
      deploymentId: "dpl_abc",
    });
  });
});

describe("nudgeComment", () => {
  it("mentions users and teams", () => {
    expect(nudgeComment(["alice", "acme/web-team"])).toBe(
      "@alice @acme/web-team friendly nudge: this pull request is waiting on your review. Thanks!",
    );
  });
});

describe("explainWriteError", () => {
  it("explains a missing write permission", () => {
    expect(explainWriteError({ status: 403, message: "nope" }, "Actions")).toContain(
      '"Actions: Read and write"',
    );
    expect(explainWriteError(new Error("Resource not accessible by integration"), "X")).toContain(
      '"X: Read and write"',
    );
  });

  it("passes other errors through", () => {
    expect(explainWriteError(new Error("Server Error"), "Actions")).toBe("Server Error");
  });
});
