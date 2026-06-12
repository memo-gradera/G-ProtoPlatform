import { canPerformAction } from "@proto-platform/domain";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors.js";
import { ideasRepository } from "../repositories/ideasRepository.js";
import { prototypesRepository } from "../repositories/prototypesRepository.js";
import type { AuthenticatedUser } from "../types/express.js";

export const prototypesService = {
  async list(_user: AuthenticatedUser) {
    return prototypesRepository.list();
  },

  async getById(id: string) {
    const prototype = await prototypesRepository.getById(id);
    if (!prototype) throw new NotFoundError("Prototype not found.");
    return prototype;
  },

  async create(
    user: AuthenticatedUser,
    input: {
      name: string;
      description?: string;
      category?: string;
      ownerId?: string;
      demoUrl?: string;
      screenshotUrl?: string;
      relatedIdeaId?: string;
    },
  ) {
    if (!canPerformAction(user, "prototype.create")) {
      throw new ForbiddenError();
    }

    if (input.relatedIdeaId) {
      const idea = await ideasRepository.getById(input.relatedIdeaId);
      if (!idea) throw new NotFoundError("Related idea not found.");
    }

    return prototypesRepository.create(
      {
        name: input.name,
        ownerId: input.ownerId ?? user.id,
        description: input.description,
        category: input.category,
        demoUrl: input.demoUrl,
        screenshotUrl: input.screenshotUrl,
        relatedIdeaId: input.relatedIdeaId,
      },
      user.id,
    );
  },

  async update(
    user: AuthenticatedUser,
    id: string,
    input: Record<string, unknown>,
  ) {
    const existing = await prototypesRepository.getById(id);
    if (!existing) throw new NotFoundError("Prototype not found.");

    const nextStatus = input.status as string | undefined;
    if (
      !canPerformAction(user, "prototype.save", {
        prototype: { id },
        previousStatus: existing.status,
        nextStatus: nextStatus ?? existing.status,
      })
    ) {
      throw new ForbiddenError();
    }

    if (input.related_idea_id) {
      const idea = await ideasRepository.getById(String(input.related_idea_id));
      if (!idea) throw new NotFoundError("Related idea not found.");
    }

    const data = {
      name: input.name as string | undefined,
      description: input.description as string | null | undefined,
      category: input.category as string | null | undefined,
      demoUrl: input.demo_url as string | null | undefined,
      screenshotUrl: input.screenshot_url as string | null | undefined,
      relatedIdeaId: input.related_idea_id as string | null | undefined,
      status: input.status as "draft" | "attached" | "published" | "archived" | undefined,
    };

    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );

    return prototypesRepository.update(id, cleaned, user.id, existing);
  },

  async publish(user: AuthenticatedUser, id: string) {
    const existing = await prototypesRepository.getById(id);
    if (!existing) throw new NotFoundError("Prototype not found.");

    if (!canPerformAction(user, "prototype.publish")) {
      throw new ForbiddenError();
    }

    if (existing.status === "published") {
      throw new BadRequestError("Prototype is already published.");
    }

    return prototypesRepository.update(
      id,
      { status: "published" },
      user.id,
      existing,
      "prototype.publish",
    );
  },

  async archive(user: AuthenticatedUser, id: string) {
    const existing = await prototypesRepository.getById(id);
    if (!existing) throw new NotFoundError("Prototype not found.");

    if (!canPerformAction(user, "prototype.archive")) {
      throw new ForbiddenError();
    }

    if (existing.status === "archived") {
      throw new BadRequestError("Prototype is already archived.");
    }

    return prototypesRepository.update(
      id,
      { status: "archived" },
      user.id,
      existing,
      "prototype.archive",
    );
  },
};
