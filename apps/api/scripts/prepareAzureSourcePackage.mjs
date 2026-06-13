#!/usr/bin/env node
/**
 * Build an Azure App Service *source* deployment folder + zip (no node_modules).
 * Oryx on App Service runs npm install --omit=dev from package.json + package-lock.json.
 *
 * Prerequisites (run from monorepo root):
 *   pnpm --filter @proto-platform/domain build
 *   pnpm --filter gradera-api build
 *
 * Output:
 *   /tmp/gradera-api-source-package
 *   /tmp/gradera-api-source.zip
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "../..");

const OUT_DIR =
  process.env.AZURE_SOURCE_PACKAGE_DIR || "/tmp/gradera-api-source-package";
const ZIP_PATH =
  process.env.AZURE_SOURCE_PACKAGE_ZIP || "/tmp/gradera-api-source.zip";

const DOMAIN_VENDOR_REL = "vendor/@proto-platform/domain";

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${label}: ${filePath}\nRun domain + API builds before package:azure-source.`,
    );
  }
}

function assertMissing(filePath, label) {
  if (fs.existsSync(filePath)) {
    throw new Error(`Unexpected ${label}: ${filePath}`);
  }
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function run(command, cwd) {
  execSync(command, { cwd, stdio: "inherit", env: process.env });
}

function vendorDomainPackage(packageDir) {
  const domainSrc = path.join(repoRoot, "packages/domain/dist");
  const domainDest = path.join(packageDir, DOMAIN_VENDOR_REL, "dist");

  assertExists(domainSrc, "built @proto-platform/domain dist");
  fs.mkdirSync(path.dirname(domainDest), { recursive: true });
  copyDir(domainSrc, domainDest);

  const domainPackageJson = {
    name: "@proto-platform/domain",
    version: "0.1.0",
    private: true,
    type: "module",
    exports: {
      ".": {
        import: "./dist/index.js",
      },
    },
  };

  fs.writeFileSync(
    path.join(packageDir, DOMAIN_VENDOR_REL, "package.json"),
    `${JSON.stringify(domainPackageJson, null, 2)}\n`,
  );
}

function createSourcePackageJson(packageDir) {
  const source = JSON.parse(
    fs.readFileSync(path.join(apiRoot, "package.json"), "utf8"),
  );

  const dependencies = {};

  for (const [name, version] of Object.entries(source.dependencies ?? {})) {
    if (typeof version === "string" && version.startsWith("workspace:")) {
      if (name === "@proto-platform/domain") {
        dependencies[name] = `file:./${DOMAIN_VENDOR_REL}`;
      }
      continue;
    }
    dependencies[name] = version;
  }

  dependencies.prisma = source.devDependencies?.prisma ?? "^6.5.0";

  const deployPackage = {
    name: "gradera-api",
    version: source.version ?? "0.1.0",
    private: true,
    type: "module",
    scripts: {
      start: "node dist/index.js",
      postinstall: "prisma generate",
    },
    dependencies,
  };

  fs.writeFileSync(
    path.join(packageDir, "package.json"),
    `${JSON.stringify(deployPackage, null, 2)}\n`,
  );
}

function assertNoWorkspaceDeps(packageDir) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );

  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (typeof version === "string" && version.startsWith("workspace:")) {
      throw new Error(`package.json still contains workspace dependency: ${name}`);
    }
  }
}

function verifyInstalledPackage(packageDir) {
  const checks = [
    ["node_modules/cors/package.json", "cors dependency"],
    ["node_modules/express/package.json", "express dependency"],
    ["node_modules/@prisma/client/package.json", "@prisma/client dependency"],
    [
      "node_modules/@proto-platform/domain/dist/index.js",
      "linked @proto-platform/domain",
    ],
  ];

  for (const [relativePath, label] of checks) {
    assertExists(path.join(packageDir, relativePath), label);
  }
}

function verifySourceArtifacts(packageDir) {
  const checks = [
    ["dist/index.js", "API entrypoint"],
    ["prisma/schema.prisma", "Prisma schema"],
    ["package.json", "package.json"],
    ["package-lock.json", "package-lock.json"],
    [`${DOMAIN_VENDOR_REL}/dist/index.js`, "vendored domain package"],
  ];

  for (const [relativePath, label] of checks) {
    assertExists(path.join(packageDir, relativePath), label);
  }

  assertMissing(path.join(packageDir, "node_modules"), "node_modules directory");
  assertNoWorkspaceDeps(packageDir);
}

function createZip(packageDir, zipPath) {
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath);
  }

  run(`zip -r "${zipPath}" .`, packageDir);
}

function assertZipExcludesNodeModules(zipPath) {
  const listing = execSync(`zipinfo -1 "${zipPath}"`, {
    encoding: "utf8",
  });

  if (listing.split("\n").some((entry) => entry.startsWith("node_modules/"))) {
    throw new Error("Zip must not contain node_modules/");
  }
}

function main() {
  assertExists(path.join(apiRoot, "dist/index.js"), "API dist/index.js");
  assertExists(
    path.join(repoRoot, "packages/domain/dist/index.js"),
    "domain dist/index.js",
  );
  assertExists(path.join(apiRoot, "prisma/schema.prisma"), "Prisma schema");

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  copyDir(path.join(apiRoot, "dist"), path.join(OUT_DIR, "dist"));
  copyDir(path.join(apiRoot, "prisma"), path.join(OUT_DIR, "prisma"));

  vendorDomainPackage(OUT_DIR);
  createSourcePackageJson(OUT_DIR);
  assertNoWorkspaceDeps(OUT_DIR);

  console.log("\nValidating npm install --omit=dev (local only)...");
  run("npm install --omit=dev", OUT_DIR);
  verifyInstalledPackage(OUT_DIR);

  console.log("\nRemoving node_modules before zipping...");
  fs.rmSync(path.join(OUT_DIR, "node_modules"), { recursive: true, force: true });

  verifySourceArtifacts(OUT_DIR);

  console.log("\nCreating source deployment zip...");
  createZip(OUT_DIR, ZIP_PATH);
  assertZipExcludesNodeModules(ZIP_PATH);

  const zipStats = fs.statSync(ZIP_PATH);
  const zipSizeMb = (zipStats.size / (1024 * 1024)).toFixed(2);

  console.log("\nAzure API source package ready:");
  console.log(`  folder: ${OUT_DIR}`);
  console.log(`  zip:    ${ZIP_PATH}`);
  console.log(`  size:   ${zipStats.size.toLocaleString()} bytes (${zipSizeMb} MB)`);
  console.log(
    "\nDeploy this zip to App Service and let Oryx run npm install --omit=dev.",
  );
}

main();
