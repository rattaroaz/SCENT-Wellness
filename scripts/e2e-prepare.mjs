import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const env = {
  ...process.env,
  DATABASE_URL: "file:./prisma/e2e.db",
  JWT_SECRET: process.env.JWT_SECRET || "e2e-jwt-secret",
};

console.log("E2E: applying migrations to e2e.db…");
execSync("npx prisma migrate deploy", { cwd: backend, env, stdio: "inherit" });

console.log("E2E: seeding e2e.db…");
execSync("npx tsx prisma/seed.ts", { cwd: backend, env, stdio: "inherit" });

console.log("E2E: database ready.");
