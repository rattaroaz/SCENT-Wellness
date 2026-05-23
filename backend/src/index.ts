import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { patientRoutes } from "./routes/patients";
import { templateRoutes } from "./routes/templates";
import { campaignRoutes } from "./routes/campaigns";
import { smsRoutes } from "./routes/sms";
import { activityRoutes } from "./routes/activity";
import { startScheduler } from "./services/scheduler";
import type { JwtUser } from "./lib/auth";
import { authenticate } from "./plugins/authenticate";
import { getLogger } from "./lib/logger";
import { registerLogging } from "./plugins/logging";

const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const appLogger = getLogger("app");

export async function buildApp() {
  const app = Fastify({
    logger: false,
    genReqId: (req) =>
      req.headers["x-request-id"]?.toString() || crypto.randomUUID(),
  });

  await app.register(cors, {
    origin: FRONTEND_URL,
    credentials: true,
  });

  await app.register(jwt, { secret: JWT_SECRET });

  await registerLogging(app);

  app.decorate("authenticate", authenticate);

  app.get("/health", async () => ({ ok: true, service: "scent-wellness-api" }));

  await app.register(authRoutes);
  await app.register(patientRoutes);
  await app.register(templateRoutes);
  await app.register(campaignRoutes);
  await app.register(smsRoutes);
  await app.register(activityRoutes);

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

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE") {
      appLogger.fatal(
        { port: PORT, err },
        `Port ${PORT} is already in use. Run "npm run dev:clean" from the project root, then try again.`
      );
      process.exit(1);
    }
    throw err;
  }
  appLogger.info({ port: PORT }, "API listening");
}

// Only run main() when this file is executed directly (not when imported by tests)
const isMainModule = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isMainModule && process.env.NODE_ENV !== "test") {
  main().catch((err) => {
    appLogger.fatal({ err }, "Fatal startup error");
    process.exit(1);
  });
}
