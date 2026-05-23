import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { patientRoutes } from "./routes/patients";
import { templateRoutes } from "./routes/templates";
import { campaignRoutes } from "./routes/campaigns";
import { smsRoutes } from "./routes/sms";
import { startScheduler } from "./services/scheduler";
import type { JwtUser } from "./lib/auth";
import { authenticate } from "./plugins/authenticate";

const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: FRONTEND_URL,
    credentials: true,
  });

  await app.register(jwt, { secret: JWT_SECRET });

  app.decorate("authenticate", authenticate);

  app.get("/health", async () => ({ ok: true, service: "scent-wellness-api" }));

  await app.register(authRoutes);
  await app.register(patientRoutes);
  await app.register(templateRoutes);
  await app.register(campaignRoutes);
  await app.register(smsRoutes);

  return app;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

async function main() {
  const app = await buildApp();
  startScheduler(1000);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
