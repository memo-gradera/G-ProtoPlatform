import { describe, expect, it } from "vitest";
import { serializeUser } from "../src/lib/serializers.js";

describe("serializeUser", () => {
  it("returns safe admin user metadata without auth secrets", () => {
    const serialized = serializeUser({
      id: "user-1",
      email: "admin@gradera.local",
      fullName: "Local Admin",
      entraObjectId: "entra-oid-1",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      userRoles: [{ role: { name: "admin" } }],
    });

    expect(serialized).toEqual({
      id: "user-1",
      email: "admin@gradera.local",
      full_name: "Local Admin",
      role: "admin",
      roles: ["admin"],
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
      last_login_at: null,
    });
    expect(serialized).not.toHaveProperty("entraObjectId");
    expect(serialized).not.toHaveProperty("entra_object_id");
  });
});
