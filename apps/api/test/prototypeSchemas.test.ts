import { describe, expect, it } from "vitest";
import {
  createPrototypeSchema,
  updatePrototypeSchema,
} from "../src/validation/schemas.js";

describe("createPrototypeSchema", () => {
  it("accepts in_production status is not on create schema", () => {
    const result = createPrototypeSchema.safeParse({
      name: "New Prototype",
      category: "client_delivery_optimization",
      github_repo_url: "https://github.com/org/repo",
      video_urls: [
        "https://loom.com/share/abc",
        "https://youtube.com/watch?v=123",
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("client_delivery_optimization");
      expect(result.data.github_repo_url).toBe("https://github.com/org/repo");
      expect(result.data.video_urls).toHaveLength(2);
    }
  });

  it("rejects more than five video URLs", () => {
    const result = createPrototypeSchema.safeParse({
      name: "Too Many Videos",
      video_urls: Array.from({ length: 6 }, (_, index) => `https://example.com/v${index}`),
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid github_repo_url", () => {
    const result = createPrototypeSchema.safeParse({
      name: "Bad URL",
      github_repo_url: "not-a-url",
    });

    expect(result.success).toBe(false);
  });
});

describe("updatePrototypeSchema", () => {
  it("accepts in_production status", () => {
    const result = updatePrototypeSchema.safeParse({
      status: "in_production",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("in_production");
    }
  });

  it("accepts nullable github_repo_url and video_urls", () => {
    const result = updatePrototypeSchema.safeParse({
      github_repo_url: null,
      video_urls: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.github_repo_url).toBeNull();
      expect(result.data.video_urls).toBeNull();
    }
  });

  it("accepts client_delivery_optimization category", () => {
    const result = updatePrototypeSchema.safeParse({
      category: "client_delivery_optimization",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("client_delivery_optimization");
    }
  });
});
