import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { getLogger } from "../lib/logger";
import { recordAudit } from "../lib/audit";

const log = getLogger("auth");

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid credentials payload" });
    }

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      log.warn({ username: parsed.data.username }, "failed login attempt");
      await recordAudit({
        action: "auth.login_failed",
        resource: "auth",
        metadata: { username: parsed.data.username },
      });
      return reply.status(401).send({ error: "Invalid username or password" });
    }

    const token = app.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    await recordAudit({
      userId: user.id,
      action: "auth.login",
      resource: "auth",
      resourceId: user.id,
      metadata: { role: user.role },
    });

    log.info({ userId: user.id, role: user.role }, "user logged in");

    return {
      token,
      user: { id: user.id, username: user.username, role: user.role },
    };
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (request) => {
    const user = requireAuth(request);
    return { user };
  });

  app.post("/auth/logout", async () => {
    return { ok: true };
  });
}
