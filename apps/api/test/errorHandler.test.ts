import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "../src/errors.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("errorHandler unauthorized diagnostics", () => {
  it("omits validation reason in production responses", () => {
    const res = createMockResponse();
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    errorHandler(
      new UnauthorizedError("Invalid or expired access token.", "audience_mismatch"),
      { requestId: "req-1" } as never,
      res as never,
      () => {},
    );

    process.env.NODE_ENV = previous;

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: "UNAUTHORIZED",
      message: "Invalid or expired access token.",
      requestId: "req-1",
    });
  });

  it("includes validation reason in development responses", () => {
    const res = createMockResponse();
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    errorHandler(
      new UnauthorizedError("Invalid or expired access token.", "audience_mismatch"),
      { requestId: "req-2" } as never,
      res as never,
      () => {},
    );

    process.env.NODE_ENV = previous;

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: "UNAUTHORIZED",
      message: "Invalid or expired access token.",
      reason: "audience_mismatch",
      requestId: "req-2",
    });
  });
});
