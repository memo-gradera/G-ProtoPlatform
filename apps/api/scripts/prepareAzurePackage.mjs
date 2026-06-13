#!/usr/bin/env node
/**
 * Build a self-contained Azure App Service deployment folder + zip.
 *
 * Prerequisites (run from monorepo root):
 *   pnpm --filter @proto-platform/domain build
 *   pnpm --filter gradera-api build
 *
 * Output:
 *   /tmp/gradera-api-azure-package
 *   /tmp/gradera-api.zip
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "../..");

const OUT_DIR =
  process.env.AZURE_PACKAGE_DIR || "/tmp/gradera-api-azure-package";
const ZIP_PATH = process.env.AZURE_PACKAGE_ZIP || "/tmp/gradera-api.zip";

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing ${label}: ${filePath}\nRun domain + API builds before package:azure.`,
    );
  }
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function installWorkspaceDomain(packageDir) {
  const domainSrc = path.join(repoRoot, "packages/domain/dist");
  const domainDest = path.join(
    packageDir,
    "node_modules/@proto-platform/domain/dist",
  );

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
    path.join(packageDir, "node_modules/@proto-platform/domain/package.json"),
    `${JSON.stringify(domainPackageJson, null, 2)}\n`,
  );
}

function createDeployPackageJson(packageDir) {
  const source = JSON.parse(
    fs.readFileSync(path.join(apiRoot, "package.json"), "utf8"),
  );

  const dependencies = {};
  for (const [name, version] of Object.entries(source.dependencies ?? {})) {
    if (typeof version === "string" && version.startsWith("workspace:")) {
      continue;
    }
    dependencies[name] = version;
  }

  const deployPackage = {
    name: "gradera-api",
    version: source.version ?? "0.1.0",
    private: true,
    type: "module",
    scripts: {
      start: "node dist/index.js",
    },
    dependencies,
  };

  fs.writeFileSync(
    path.join(packageDir, "package.json"),
    `${JSON.stringify(deployPackage, null, 2)}\n`,
  );

  return source;
}

function run(command, cwd) {
  execSync(command, { cwd, stdio: "inherit", env: process.env });
}

function verifyPackage(packageDir) {
  const checks = [
    ["dist/index.js", "API entrypoint"],
    ["node_modules/cors/package.json", "cors dependency"],
    ["node_modules/express/package.json", "express dependency"],
    ["node_modules/@prisma/client/package.json", "@prisma/client dependency"],
    [
      "node_modules/@proto-platform/domain/dist/index.js",
      "vendored @proto-platform/domain",
    ],
  ];

  for (const [relativePath, label] of checks) {
    assertExists(path.join(packageDir, relativePath), label);
  }
}

function createZip(packageDir, zipPath) {
  if (fs.existsSync(zipPath)) {
    fs.rmSync(zipPath);
  }

  run(`zip -r "${zipPath}" .`, packageDir);
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

  createDeployPackageJson(OUT_DIR);

  console.log("\nInstalling production npm dependencies...");
  run("npm install --omit=dev", OUT_DIR);

  console.log("\nVendoring @proto-platform/domain into node_modules...");
  installWorkspaceDomain(OUT_DIR);

  const prismaClientVersion = JSON.parse(
    fs.readFileSync(
      path.join(OUT_DIR, "node_modules/@prisma/client/package.json"),
      "utf8",
    ),
  ).version;
  console.log(`\nGenerating Prisma client (prisma@${prismaClientVersion})...`);
  run(`npx --yes prisma@${prismaClientVersion} generate`, OUT_DIR);

  verifyPackage(OUT_DIR);

  console.log("\nCreating deployment zip...");
  createZip(OUT_DIR, ZIP_PATH);

  const zipStats = fs.statSync(ZIP_PATH);
  const zipSizeMb = (zipStats.size / (1024 * 1024)).toFixed(2);

  console.log("\nAzure API package ready:");
  console.log(`  folder: ${OUT_DIR}`);
  console.log(`  zip:    ${ZIP_PATH}`);
  console.log(`  size:   ${zipStats.size.toLocaleString()} bytes (${zipSizeMb} MB)`);
}

main();
