import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js";
import * as schema from "../db/schema/auth.js";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is not defined");
}

const trustedOrigin =
  process.env.FRONTEND_URL ?? process.env.APP_ORIGIN ?? "http://localhost:5173";

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [trustedOrigin],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "client",
        input: true,
      },
    },
  },
  cookie: {
    // Better Auth will honor these where applicable; ensure cookies are secure in production
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  },
});
