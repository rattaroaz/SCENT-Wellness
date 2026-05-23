import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { canEditTemplates, requireAuth } from "../lib/auth";
import { getLogger } from "../lib/logger";
import { recordAudit } from "../lib/audit";

const log = getLogger("templates");

const messageSchema = z.object({
  body: z.string(),
  weeks: z.number().int().min(0).default(0),
  days: z.number().int().min(0).default(0),
  hours: z.number().int().min(0).default(0),
  minutes: z.number().int().min(0).default(0),
  seconds: z.number().int().min(0).default(0),
});

const templateSchema = z.object({
  name: z.string().min(1),
  messages: z.array(messageSchema).min(1),
});

export async function templateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/templates", async (request) => {
    const user = requireAuth(request);
    const templates = await prisma.procedureTemplate.findMany({
      include: { messages: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });

    await recordAudit({
      userId: user.id,
      action: "template.list",
      resource: "template",
      metadata: { count: templates.length },
    });

    return { templates };
  });

  app.get("/templates/:id", async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const template = await prisma.procedureTemplate.findUnique({
      where: { id },
      include: { messages: { orderBy: { sortOrder: "asc" } } },
    });
    if (!template) {
      log.warn({ userId: user.id, templateId: id }, "template not found");
      return reply.status(404).send({ error: "Template not found" });
    }

    await recordAudit({
      userId: user.id,
      action: "template.read",
      resource: "template",
      resourceId: id,
    });

    return { template };
  });

  app.post("/templates", async (request, reply) => {
    const user = requireAuth(request);
    if (!canEditTemplates(user.role)) {
      return reply.status(403).send({ error: "Guests cannot create templates" });
    }

    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const existing = await prisma.procedureTemplate.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return reply.status(409).send({ error: "Template name already exists" });
    }

    const template = await prisma.procedureTemplate.create({
      data: {
        name: parsed.data.name,
        createdByUserId: user.id,
        messages: {
          create: parsed.data.messages.map((m, i) => ({
            sortOrder: i,
            body: m.body,
            weeks: m.weeks,
            days: m.days,
            hours: m.hours,
            minutes: m.minutes,
            seconds: m.seconds,
          })),
        },
      },
      include: { messages: { orderBy: { sortOrder: "asc" } } },
    });

    await recordAudit({
      userId: user.id,
      action: "template.create",
      resource: "template",
      resourceId: template.id,
      metadata: { name: template.name, messageCount: template.messages.length },
    });

    log.info({ userId: user.id, templateId: template.id, name: template.name }, "template created");
    return { template };
  });

  app.put("/templates/:id", async (request, reply) => {
    const user = requireAuth(request);
    if (!canEditTemplates(user.role)) {
      return reply.status(403).send({ error: "Guests cannot edit templates" });
    }

    const { id } = request.params as { id: string };
    const parsed = templateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const found = await prisma.procedureTemplate.findUnique({ where: { id } });
    if (!found) return reply.status(404).send({ error: "Template not found" });

    if (parsed.data.name !== found.name) {
      const nameTaken = await prisma.procedureTemplate.findUnique({
        where: { name: parsed.data.name },
      });
      if (nameTaken) {
        return reply.status(409).send({ error: "Template name already exists" });
      }
    }

    const template = await prisma.$transaction(async (tx) => {
      const existingMessages = await tx.templateMessage.findMany({
        where: { templateId: id },
        select: { id: true },
      });
      const messageIds = existingMessages.map((m) => m.id);
      if (messageIds.length > 0) {
        await tx.scheduledMessage.deleteMany({
          where: { templateMessageId: { in: messageIds } },
        });
      }
      await tx.templateMessage.deleteMany({ where: { templateId: id } });
      return tx.procedureTemplate.update({
        where: { id },
        data: {
          name: parsed.data.name,
          messages: {
            create: parsed.data.messages.map((m, i) => ({
              sortOrder: i,
              body: m.body,
              weeks: m.weeks,
              days: m.days,
              hours: m.hours,
              minutes: m.minutes,
              seconds: m.seconds,
            })),
          },
        },
        include: { messages: { orderBy: { sortOrder: "asc" } } },
      });
    });

    await recordAudit({
      userId: user.id,
      action: "template.update",
      resource: "template",
      resourceId: id,
      metadata: { name: template.name, messageCount: template.messages.length },
    });

    log.info({ userId: user.id, templateId: id }, "template updated");
    return { template };
  });

  app.delete("/templates/:id", async (request, reply) => {
    const user = requireAuth(request);
    if (!canEditTemplates(user.role)) {
      return reply.status(403).send({ error: "Guests cannot delete templates" });
    }

    const { id } = request.params as { id: string };
    const found = await prisma.procedureTemplate.findUnique({ where: { id } });
    if (!found) {
      return reply.status(404).send({ error: "Template not found" });
    }

    await prisma.procedureTemplate.delete({ where: { id } });

    await recordAudit({
      userId: user.id,
      action: "template.delete",
      resource: "template",
      resourceId: id,
      metadata: { name: found.name },
    });

    log.info({ userId: user.id, templateId: id }, "template deleted");
    return { ok: true };
  });
}
