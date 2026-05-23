import { CampaignStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { computeSendAt } from "../lib/time";
import { requireAuth } from "../lib/auth";
import { DEFAULT_PHYSICIAN_PHONE, normalizePhone } from "../lib/physicianPhones";

const startSchema = z.object({
  patientId: z.string(),
  templateId: z.string(),
  physicianPhone: z.string().min(7).optional(),
});

export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/campaigns", async (request) => {
    requireAuth(request);
    const patientId = (request.query as { patientId?: string }).patientId;

    const campaigns = await prisma.activeCampaign.findMany({
      where: patientId ? { patientId } : undefined,
      include: {
        template: true,
        patient: true,
        scheduled: { orderBy: { sendAt: "asc" } },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    return { campaigns };
  });

  app.get("/campaigns/:id", async (request, reply) => {
    requireAuth(request);
    const { id } = request.params as { id: string };
    const campaign = await prisma.activeCampaign.findUnique({
      where: { id },
      include: {
        template: { include: { messages: true } },
        patient: true,
        scheduled: { orderBy: { sendAt: "asc" } },
      },
    });
    if (!campaign) return reply.status(404).send({ error: "Campaign not found" });
    return { campaign };
  });

  app.post("/campaigns", async (request, reply) => {
    requireAuth(request);
    const parsed = startSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const existing = await prisma.activeCampaign.findFirst({
      where: {
        patientId: parsed.data.patientId,
        templateId: parsed.data.templateId,
        status: CampaignStatus.ACTIVE,
      },
    });

    if (existing) {
      const full = await prisma.activeCampaign.findUnique({
        where: { id: existing.id },
        include: {
          scheduled: { orderBy: { sendAt: "asc" } },
          patient: true,
          template: true,
        },
      });
      return { campaign: full, alreadyActive: true };
    }

    const template = await prisma.procedureTemplate.findUnique({
      where: { id: parsed.data.templateId },
      include: { messages: { orderBy: { sortOrder: "asc" } } },
    });

    if (!template || template.messages.length === 0) {
      return reply.status(400).send({ error: "Template has no messages" });
    }

    const startedAt = new Date();
    const physicianPhone = normalizePhone(
      parsed.data.physicianPhone?.trim() || DEFAULT_PHYSICIAN_PHONE
    );

    const campaign = await prisma.activeCampaign.create({
      data: {
        patientId: parsed.data.patientId,
        templateId: parsed.data.templateId,
        physicianPhone,
        status: CampaignStatus.ACTIVE,
        startedAt,
        scheduled: {
          create: template.messages.map((m) => ({
            templateMessageId: m.id,
            body: m.body,
            sendAt: computeSendAt(
              startedAt,
              m.weeks,
              m.days,
              m.hours,
              m.minutes,
              m.seconds
            ),
          })),
        },
      },
      include: {
        scheduled: { orderBy: { sendAt: "asc" } },
        patient: true,
        template: true,
      },
    });

    return { campaign, alreadyActive: false };
  });

  app.post("/campaigns/:id/cancel", async (request, reply) => {
    requireAuth(request);
    const { id } = request.params as { id: string };
    const campaign = await prisma.activeCampaign.findUnique({ where: { id } });
    if (!campaign) return reply.status(404).send({ error: "Campaign not found" });

    const updated = await prisma.activeCampaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
      include: { scheduled: true, patient: true, template: true },
    });

    return { campaign: updated };
  });
}
