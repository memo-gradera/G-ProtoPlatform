import { describe, expect, it } from "vitest";
import {
  serializePrototype,
  serializePrototypeTags,
} from "../src/lib/serializers.js";

describe("serializePrototype", () => {
  const prototypeRecord = {
    id: "proto-1",
    name: "Demo Prototype",
    description: "Prototype description",
    category: "ai_ml",
    status: "published",
    ownerId: "user-1",
    demoUrl: "https://demo.example.com",
    screenshotUrl: "https://screenshot.example.com/image.png",
    githubRepoUrl: "https://github.com/org/repo",
    videoUrls: ["https://loom.com/share/demo"],
    relatedIdeaId: "idea-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    owner: {
      id: "user-1",
      email: "owner@gradera.ai",
      fullName: "Prototype Owner",
    },
    relatedIdea: {
      id: "idea-1",
      solutionName: "Linked Idea",
    },
    tagMaps: [
      { tag: { name: "ai" } },
      { tag: { name: "automation" } },
    ],
  };

  it("includes owner object with snake_case fields", () => {
    const serialized = serializePrototype(prototypeRecord);

    expect(serialized.owner).toEqual({
      id: "user-1",
      email: "owner@gradera.ai",
      full_name: "Prototype Owner",
    });
  });

  it("includes related_idea object with solution_name", () => {
    const serialized = serializePrototype(prototypeRecord);

    expect(serialized.related_idea).toEqual({
      id: "idea-1",
      solution_name: "Linked Idea",
    });
  });

  it("includes tags as string labels from tagMaps", () => {
    const serialized = serializePrototype(prototypeRecord);

    expect(serialized.tags).toEqual(["ai", "automation"]);
  });

  it("returns the full normalized API prototype shape", () => {
    const serialized = serializePrototype(prototypeRecord);

    expect(serialized).toEqual({
      id: "proto-1",
      name: "Demo Prototype",
      description: "Prototype description",
      category: "ai_ml",
      status: "published",
      owner_id: "user-1",
      owner: {
        id: "user-1",
        email: "owner@gradera.ai",
        full_name: "Prototype Owner",
      },
      demo_url: "https://demo.example.com",
      screenshot_url: "https://screenshot.example.com/image.png",
      github_repo_url: "https://github.com/org/repo",
      video_urls: ["https://loom.com/share/demo"],
      related_idea_id: "idea-1",
      related_idea: {
        id: "idea-1",
        solution_name: "Linked Idea",
      },
      tags: ["ai", "automation"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
  });

  it("returns empty tags when no tag relations are present", () => {
    const serialized = serializePrototype({
      id: "proto-2",
      name: "Untagged",
      status: "in_production",
      ownerId: "user-1",
    });

    expect(serialized.tags).toEqual([]);
    expect(serialized.status).toBe("in_production");
    expect(serialized.github_repo_url).toBeUndefined();
    expect(serialized.video_urls).toEqual([]);
    expect(serialized.owner).toBeUndefined();
    expect(serialized.related_idea).toBeUndefined();
  });
});

describe("serializePrototypeTags", () => {
  it("preserves pre-serialized string tags", () => {
    expect(
      serializePrototypeTags({
        tags: ["alpha", "beta"],
      }),
    ).toEqual(["alpha", "beta"]);
  });
});
