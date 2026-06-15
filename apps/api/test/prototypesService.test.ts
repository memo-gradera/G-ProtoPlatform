import { describe, expect, it, vi, beforeEach } from "vitest";
import { canPerformAction } from "@proto-platform/domain";
import { ForbiddenError, NotFoundError } from "../src/errors.js";
import { prototypesRepository } from "../src/repositories/prototypesRepository.js";
import { prototypesService } from "../src/services/prototypesService.js";

vi.mock("../src/repositories/prototypesRepository.js", () => ({
  prototypesRepository: {
    getById: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../src/repositories/ideasRepository.js", () => ({
  ideasRepository: {
    getById: vi.fn(),
  },
}));

const adminUser = {
  id: "admin-user-id",
  email: "admin@gradera.local",
  role: "admin" as const,
};

const developerUser = {
  id: "developer-user-id",
  email: "developer@gradera.local",
  role: "developer" as const,
};

const viewerUser = {
  id: "viewer-user-id",
  email: "viewer@gradera.local",
  role: "viewer" as const,
};

const executiveReviewerUser = {
  id: "exec-user-id",
  email: "exec@gradera.local",
  role: "executive_reviewer" as const,
};

const ownedPrototype = {
  id: "proto-1",
  ownerId: developerUser.id,
  status: "draft" as const,
};

const unownedPrototype = {
  id: "proto-2",
  ownerId: adminUser.id,
  status: "draft" as const,
};

describe("prototypesService.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to delete a prototype", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(unownedPrototype as never);

    const id = await prototypesService.delete(adminUser, "proto-2");

    expect(id).toBe("proto-2");
    expect(prototypesRepository.delete).toHaveBeenCalledWith(
      "proto-2",
      adminUser.id,
      unownedPrototype,
    );
  });

  it("allows developer to delete owned prototype", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(ownedPrototype as never);

    await expect(
      prototypesService.delete(developerUser, "proto-1"),
    ).resolves.toBe("proto-1");
  });

  it("rejects unauthorized prototype delete", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(unownedPrototype as never);

    await expect(
      prototypesService.delete(developerUser, "proto-2"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects delete when viewer lacks permission", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(ownedPrototype as never);

    await expect(
      prototypesService.delete(viewerUser, "proto-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects delete when executive_reviewer lacks permission", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(ownedPrototype as never);

    await expect(
      prototypesService.delete(executiveReviewerUser, "proto-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns 404 when prototype is missing", async () => {
    vi.mocked(prototypesRepository.getById).mockResolvedValue(null);

    await expect(
      prototypesService.delete(adminUser, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("prototypesService.update metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prototypesRepository.getById).mockResolvedValue(ownedPrototype as never);
    vi.mocked(prototypesRepository.update).mockResolvedValue({
      ...ownedPrototype,
      status: "in_production",
      githubRepoUrl: "https://github.com/org/repo",
      videoUrls: ["https://loom.com/share/demo"],
    } as never);
  });

  it("maps github_repo_url, video_urls, and in_production status", async () => {
    await prototypesService.update(adminUser, "proto-1", {
      github_repo_url: "https://github.com/org/repo",
      video_urls: ["https://loom.com/share/demo"],
      status: "in_production",
    });

    expect(prototypesRepository.update).toHaveBeenCalledWith(
      "proto-1",
      expect.objectContaining({
        githubRepoUrl: "https://github.com/org/repo",
        videoUrls: ["https://loom.com/share/demo"],
        status: "in_production",
      }),
      adminUser.id,
      ownedPrototype,
    );
  });

  it("normalizes empty video_urls array to null", async () => {
    await prototypesService.update(adminUser, "proto-1", {
      video_urls: [],
    });

    expect(prototypesRepository.update).toHaveBeenCalledWith(
      "proto-1",
      expect.objectContaining({
        videoUrls: null,
      }),
      adminUser.id,
      ownedPrototype,
    );
  });
});

describe("RBAC prototype delete", () => {
  it("developer cannot delete unowned prototype", () => {
    expect(
      canPerformAction(developerUser, "prototype.delete", {
        prototype: { ownerId: adminUser.id },
      }),
    ).toBe(false);
  });

  it("developer can delete owned prototype", () => {
    expect(
      canPerformAction(developerUser, "prototype.delete", {
        prototype: { ownerId: developerUser.id },
      }),
    ).toBe(true);
  });
});
