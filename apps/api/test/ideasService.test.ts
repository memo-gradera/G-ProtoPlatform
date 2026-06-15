import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canPerformAction,
  validateIdeaTransition,
} from "@proto-platform/domain";
import { BadRequestError, ForbiddenError } from "../src/errors.js";
import { ideasRepository } from "../src/repositories/ideasRepository.js";
import { prototypesRepository } from "../src/repositories/prototypesRepository.js";
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

vi.mock("../src/repositories/prototypesRepository.js", () => ({
  prototypesRepository: {
    getById: vi.fn(),
    countByRelatedIdeaId: vi.fn(),
    delete: vi.fn(),
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

const innovationLeadUser = {
  id: "lead-user-id",
  email: "lead@gradera.local",
  role: "innovation_lead" as const,
};

const executiveReviewerUser = {
  id: "exec-user-id",
  email: "exec@gradera.local",
  role: "executive_reviewer" as const,
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

  it("allows innovation_lead to transition unowned idea to rejected", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "ideas",
      ownerId: "other-user-id",
    } as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "rejected",
      rejectionReason: "Not a fit",
    } as never);

    await ideasService.transition(innovationLeadUser, "idea-1", {
      status: "rejected",
      rejection_reason: "Not a fit",
    });

    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("allows admin to transition in_progress → ideas", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "in_progress",
    } as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "ideas",
    } as never);

    await ideasService.transition(adminUser, "idea-1", { status: "ideas" });

    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("allows innovation_lead to transition in_progress → ideas", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "in_progress",
    } as never);
    vi.mocked(ideasRepository.transition).mockResolvedValue({
      ...baseIdea,
      status: "ideas",
    } as never);

    await ideasService.transition(innovationLeadUser, "idea-1", { status: "ideas" });

    expect(ideasRepository.transition).toHaveBeenCalledOnce();
  });

  it("rejects transition when executive_reviewer lacks idea.transition", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue({
      ...baseIdea,
      status: "ready_for_demo",
    } as never);

    await expect(
      ideasService.transition(executiveReviewerUser, "idea-1", {
        status: "approved",
        decision_notes: "Approved",
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

describe("ideasService.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin to delete an idea", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(prototypesRepository.countByRelatedIdeaId).mockResolvedValue(0);

    const id = await ideasService.delete(adminUser, "idea-1");

    expect(id).toBe("idea-1");
    expect(ideasRepository.delete).toHaveBeenCalledWith(
      "idea-1",
      adminUser.id,
      baseIdea,
    );
  });

  it("allows innovation_lead to delete an idea", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(prototypesRepository.countByRelatedIdeaId).mockResolvedValue(0);

    await expect(
      ideasService.delete(innovationLeadUser, "idea-1"),
    ).resolves.toBe("idea-1");
  });

  it("rejects delete when viewer lacks permission", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);

    await expect(
      ideasService.delete(viewerUser, "idea-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects delete when executive_reviewer lacks permission", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);

    await expect(
      ideasService.delete(executiveReviewerUser, "idea-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns 404 when idea is missing", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(null);

    await expect(
      ideasService.delete(adminUser, "missing"),
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("blocks delete when linked prototypes exist", async () => {
    vi.mocked(ideasRepository.getById).mockResolvedValue(baseIdea as never);
    vi.mocked(prototypesRepository.countByRelatedIdeaId).mockResolvedValue(2);

    await expect(
      ideasService.delete(adminUser, "idea-1"),
    ).rejects.toMatchObject({
      name: "BadRequestError",
      message:
        "Cannot delete idea with linked prototypes. Delete or archive prototypes first.",
    });
    expect(ideasRepository.delete).not.toHaveBeenCalled();
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

  it("innovation_lead can delete ideas", () => {
    expect(
      canPerformAction(innovationLeadUser, "idea.delete", { idea: baseIdea }),
    ).toBe(true);
  });

  it("admin and innovation_lead have unrestricted transition actions", () => {
    const ideasStageIdea = { ownerId: "other", status: "ideas" };
    expect(
      canPerformAction(adminUser, "review.reject", { idea: ideasStageIdea }),
    ).toBe(true);
    expect(
      canPerformAction(innovationLeadUser, "review.reject", { idea: ideasStageIdea }),
    ).toBe(true);
    expect(
      canPerformAction(viewerUser, "idea.transition", {
        idea: baseIdea,
        targetStatus: "in_progress",
      }),
    ).toBe(false);
  });
});
