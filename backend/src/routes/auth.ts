import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";

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
      return reply.status(401).send({ error: "Invalid username or password" });
    }

    const token = app.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role,
    });

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
