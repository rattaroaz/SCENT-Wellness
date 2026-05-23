import { execSync } from "child_process";
import { join } from "path";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../lib/prisma";

const backendRoot = join(__dirname, "../..");

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "file:./test.db";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

  execSync("npx prisma migrate deploy", {
    cwd: backendRoot,
    env: { ...process.env },
    stdio: "pipe",
  });

  execSync("npx tsx prisma/seed.ts", {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: "pipe",
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.physicianForwardEntry.deleteMany();
  await prisma.simulatedSmsLog.deleteMany();
  await prisma.scheduledMessage.deleteMany();
  await prisma.activeCampaign.deleteMany();
});
