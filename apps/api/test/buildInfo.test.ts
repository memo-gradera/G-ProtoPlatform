import { describe, expect, it } from "vitest";
import { getBuildInfo } from "../src/lib/buildInfo.js";

describe("getBuildInfo", () => {
  it("reads commit and version from environment when set", () => {
    const previousCommit = process.env.COMMIT_SHA;
    const previousVersion = process.env.APP_VERSION;

    process.env.COMMIT_SHA = "abc123def456";
    process.env.APP_VERSION = "0.1.0";

    expect(getBuildInfo()).toEqual({
      appVersion: "0.1.0",
      commitSha: "abc123def456",
    });

    if (previousCommit === undefined) {
      delete process.env.COMMIT_SHA;
    } else {
      process.env.COMMIT_SHA = previousCommit;
    }

    if (previousVersion === undefined) {
      delete process.env.APP_VERSION;
    } else {
      process.env.APP_VERSION = previousVersion;
    }
  });
});
