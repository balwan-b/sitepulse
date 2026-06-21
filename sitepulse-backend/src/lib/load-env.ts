import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "..", "..");

config({ path: resolve(projectRoot, ".env") });
config({ path: resolve(projectRoot, ".env.local"), override: true });
