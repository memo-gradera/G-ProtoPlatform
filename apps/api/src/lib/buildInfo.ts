import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const packageJsonPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../package.json",
);

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function getBuildInfo() {
  return {
    appVersion: process.env.APP_VERSION ?? readPackageVersion(),
    commitSha: process.env.COMMIT_SHA ?? "unknown",
  };
}
