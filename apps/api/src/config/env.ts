import { z } from "zod";

function parseEnvBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value === "") return defaultValue;
  return value.toLowerCase() === "true";
}

const rawEnvSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().optional(),
  AZURE_TENANT_ID: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  DEV_AUTH_BYPASS: z.string().optional(),
  AUTO_PROVISION_DEV_USERS: z.string().optional(),
  UPLOAD_DIR: z.string().optional(),
  API_PUBLIC_URL: z.string().url().optional(),
});

export type Env = {
  PORT: number;
  NODE_ENV: "development" | "test" | "production";
  CORS_ORIGIN: string;
  DATABASE_URL?: string;
  AZURE_TENANT_ID?: string;
  AZURE_CLIENT_ID?: string;
  JWT_AUDIENCE?: string;
  DEV_AUTH_BYPASS: boolean;
  AUTO_PROVISION_DEV_USERS: boolean;
  UPLOAD_DIR?: string;
  API_PUBLIC_URL?: string;
};

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const raw = rawEnvSchema.parse(source);
  const isProduction = raw.NODE_ENV === "production";

  return {
    ...raw,
    DEV_AUTH_BYPASS: isProduction
      ? false
      : parseEnvBoolean(raw.DEV_AUTH_BYPASS, true),
    AUTO_PROVISION_DEV_USERS: parseEnvBoolean(
      raw.AUTO_PROVISION_DEV_USERS,
      false,
    ),
  };
}

export function isDevAuthBypassEnabled(env: Env): boolean {
  return env.NODE_ENV !== "production" && env.DEV_AUTH_BYPASS;
}

export function getEntraIssuer(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}/v2.0`;
}

/** Both issuer formats Entra may emit depending on token version/configuration. */
export function getEntraIssuers(tenantId: string): string[] {
  return [
    getEntraIssuer(tenantId),
    `https://sts.windows.net/${tenantId}/`,
  ];
}

export function assertEntraConfig(env: Env): {
  tenantId: string;
  audience: string;
  issuers: string[];
} {
  if (!env.AZURE_TENANT_ID || !env.JWT_AUDIENCE) {
    throw new Error(
      "AZURE_TENANT_ID and JWT_AUDIENCE are required for Entra ID JWT validation.",
    );
  }

  return {
    tenantId: env.AZURE_TENANT_ID,
    audience: env.JWT_AUDIENCE,
    issuers: getEntraIssuers(env.AZURE_TENANT_ID),
  };
}
