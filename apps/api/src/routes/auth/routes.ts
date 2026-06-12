import { Router } from "express";

export const authRouter = Router();

authRouter.get("/", (_req, res) => {
  res.json({
    resource: "auth",
    status: "not_implemented",
    message: "Auth routes are scaffolded for Entra ID / MSAL integration.",
  });
});
