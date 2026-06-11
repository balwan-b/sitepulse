import "../lib/load-env.js";
import { drizzle } from "drizzle-orm/node-postgres";

import { pgPool } from "./pg.js";

export const db = drizzle(pgPool);
