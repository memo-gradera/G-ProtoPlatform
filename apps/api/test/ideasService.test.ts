import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canPerformAction,
  validateIdeaTransition,
} from "@proto-platform/domain";
import { BadRequestError, ForbiddenError } from "../src/errors.js";
import { ideasRepository } from "../src/repositories/ideasRepository.js";
import { ideasService } from "../src/services/ideasService.js";

vi.mock("../src/repositories/ideasRepository.js", () => ({
  ideasRepository: {
    getById: vi.fn(),
    createWithInitialHistory: vi.fn(),
    update: vi.fn(),
    transition: vi.fn(),
    delete: vi.fn(),
    listStatusHistory: vi.fn(),
    list: vi.fn(),
  },
}));

const adminUser = {
  id: "admin-user-id",
  email: "admin@gradera.local",
  role: "admin" as const,
};

const viewerUser = {
  id: "viewer-user-id",
  email: "viewer@gradera.local",
  role: "viewer" as const,
};

const baseIdea = {
  id: "idea-1",
  ownerId: adminUser.id,
  status: "in_progress" as const,
  blockerReason: null,
  rejectionReason: null,
  prototypeUrl: null,
  demoNotes: null,
  decisionNotes: null,
};

describe("ideasService.transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a valid transition", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "ready_for_demo",
      prototypeUrl: "https://demo.example.com",
    } as never);

    const result = await ideasService.transition(adminUser, "idea-1", {
      status: "ready_for_demo",
      prototype_url: "https://demo.example.com",
    });

    expect(result.status).toBe("ready_for_demo");
    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("rejects invalid transition for approved terminal state", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "approved",
    } as never);

    await expect(
      ideasService.transition(adminUser, "idea-1", {
        status: "in_progress",
      }),
    ).rejects.toMatchObject({
      name: "WorkflowValidationError",
    });
  });

  it("creates status history and audit via repository transition", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "blocked",
      blockerReason: "Waiting on security review",
    } as never);

    await ideasService.transition(adminUser, "idea-1", {
      status: "blocked",
      blocker_reason: "Waiting on security review",
    });

    expect(ideasRepository.transition).toHaveBeenCalledWith(
      "idea-1",
      expect.objectContaining({
        newStatus: "blocked",
        previousStatus: "in_progress",
        changedByUserId: adminUser.id,
      }),
    );
  });

  it("rejects transition when viewer lacks permission", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);

    await expect(
      ideasService.transition(viewerUser, "idea-1", {
        status: "blocked",
        blocker_reason: "Blocked",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("ideasService.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects PATCH attempts to change status", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);

    await expect(
      ideasService.update(adminUser, "idea-1", { status: "approved" }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});

describe("validateIdeaTransition domain rules", () => {
  it("requires prototype URL for ready_for_demo", () => {
    const result = validateIdeaTransition("in_progress", "ready_for_demo", {});
    expect(result.valid).toBe(false);
  });

  it("treats approved as terminal", () => {
    const result = validateIdeaTransition("approved", "in_progress", {});
    expect(result.valid).toBe(false);
  });

  it("allows ready_for_demo to in_progress for needs revision", () => {
    const result = validateIdeaTransition("ready_for_demo", "in_progress", {
      reason: "needs_revision",
    });
    expect(result.valid).toBe(true);
  });
});

describe("RBAC canPerformAction", () => {
  it("viewer cannot mutate ideas", () => {
    expect(canPerformAction(viewerUser, "idea.create")).toBe(false);
    expect(canPerformAction(viewerUser, "idea.edit", { idea: baseIdea })).toBe(
      false,
    );
  });

  it("admin can mutate ideas", () => {
    expect(canPerformAction(adminUser, "idea.create")).toBe(true);
    expect(canPerformAction(adminUser, "idea.delete", { idea: baseIdea })).toBe(
      true,
    );
  });
});
