import { describe, expect, it } from "vitest";
import {
  createAdminUserSchema,
  listAdminUsersQuerySchema,
  updateAdminUserSchema,
  updateAdminUserStatusSchema,
} from "../src/validation/schemas.js";

describe("admin user validation schemas", () => {
  it("accepts valid create payloads", () => {
    expect(
      createAdminUserSchema.parse({
        email: "new.user@gradera.ai",
        full_name: "New User",
        role: "viewer",
        status: "pending",
      }),
    ).toMatchObject({
      email: "new.user@gradera.ai",
      full_name: "New User",
      role: "viewer",
      status: "pending",
    });
  });

  it("rejects invalid email, role, and status on create", () => {
    expect(() =>
      createAdminUserSchema.parse({
        email: "not-an-email",
        full_name: "New User",
        role: "viewer",
      }),
    ).toThrow();

    expect(() =>
      createAdminUserSchema.parse({
        email: "user@gradera.ai",
        full_name: "New User",
        role: "superadmin",
      }),
    ).toThrow();

    expect(() =>
      createAdminUserSchema.parse({
        email: "user@gradera.ai",
        full_name: "New User",
        role: "viewer",
        status: "deleted",
      }),
    ).toThrow();
  });

  it("requires at least one field on update", () => {
    expect(() => updateAdminUserSchema.parse({})).toThrow();
    expect(updateAdminUserSchema.parse({ role: "developer" })).toEqual({
      role: "developer",
    });
  });

  it("rejects invalid update role values", () => {
    expect(() =>
      updateAdminUserSchema.parse({ role: "not-a-role" }),
    ).toThrow();
  });

  it("accepts only known status values", () => {
    expect(updateAdminUserStatusSchema.parse({ status: "inactive" })).toEqual({
      status: "inactive",
    });
    expect(() =>
      updateAdminUserStatusSchema.parse({ status: "banned" }),
    ).toThrow();
  });

  it("filters list queries to known roles and statuses", () => {
    expect(
      listAdminUsersQuerySchema.parse({
        search: "alex",
        role: "developer",
        status: "active",
      }),
    ).toEqual({
      search: "alex",
      role: "developer",
      status: "active",
    });

    expect(() =>
      listAdminUsersQuerySchema.parse({ role: "superadmin" }),
    ).toThrow();
  });
});
