import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "..");

config({ path: resolve(projectRoot, ".env") });
config({ path: resolve(projectRoot, ".env.local"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const databaseUrl = process.env.DATABASE_URL.replace(/^"|"$/g, "");

const migrations = [
  "0000_loose_kronos.sql",
  "0001_spotty_leo.sql",
  "0003_small_felicia_hardy.sql",
  "0004_even_edwin_jarvis.sql",
  "0005_change_orders_transaction_flow.sql",
];

const parseMigrationStatements = (sql) =>
  sql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

const run = async () => {
  const client = new Client({ connectionString: databaseUrl });
  const demoSeedPath = resolve(projectRoot, "demo", "demo-seed.json");
  const domainSeedPath = resolve(projectRoot, "demo", "domain-seed.sql");

  const seed = JSON.parse(await readFile(demoSeedPath, "utf8"));
  const domainSeedSql = await readFile(domainSeedPath, "utf8");

  await client.connect();

  try {
    // Guard: require explicit ALLOW_DESTRUCTIVE_SEED to run destructive demo reset
    if (!process.env.ALLOW_DESTRUCTIVE_SEED) {
      throw new Error(
        "Destructive seed disabled. Set ALLOW_DESTRUCTIVE_SEED=1 to enable.",
      );
    }

    await client.query("begin");
    await client.query("drop schema if exists public cascade");
    await client.query("create schema public");
    await client.query("grant all on schema public to public");

    for (const migrationFile of migrations) {
      const sql = await readFile(
        resolve(projectRoot, "drizzle", migrationFile),
        "utf8",
      );

      for (const statement of parseMigrationStatements(sql)) {
        await client.query(statement);
      }
    }

    for (const account of seed.accounts) {
      const passwordHash = await hashPassword(account.password);

      await client.query(
        `
          insert into "user" (id, name, email, email_verified, image, role)
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          account.id,
          account.name,
          account.email.toLowerCase(),
          true,
          null,
          account.role,
        ],
      );

      await client.query(
        `
          insert into account (id, account_id, provider_id, user_id, password)
          values ($1, $2, 'credential', $3, $4)
        `,
        [`account-${account.id}`, account.id, account.id, passwordHash],
      );
    }

    await client.query(domainSeedSql);
    await client.query("commit");

    console.info("Neon reset and seed completed successfully.");
    console.info(
      `Seeded ${seed.accounts.length} auth accounts and domain data for ${seed.projects.length} projects.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
};

await run();
