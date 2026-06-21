import { Pool } from "pg";
// import { z } from "zod";

// const dbEnvSchema = z.object({
//   DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
// });

// const parsedEnv = dbEnvSchema.parse({
//   DATABASE_URL: process.env.DATABASE_URL,
// });

// export const pool = new Pool({
//   connectionString: parsedEnv.DATABASE_URL,
// });

import "../lib/load-env.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const shouldUseSsl =
  !process.env.DATABASE_URL.includes("localhost") &&
  !process.env.DATABASE_URL.includes("127.0.0.1");

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
});
