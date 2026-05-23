import { CampaignStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { computeSendAt } from "../lib/time";
import { requireAuth } from "../lib/auth";
import { DEFAULT_PHYSICIAN_PHONE, normalizePhone } from "../lib/physicianPhones";
import { getLogger } from "../lib/logger";
import { recordAudit } from "../lib/audit";

const log = getLogger("campaigns");

const startSchema = z.object({
  patientId: z.string(),
  templateId: z.string(),
  physicianPhone: z.string().min(7).optional().or(z.literal("")),
});

export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/campaigns", async (request) => {
    const user = requireAuth(request);
    const patientId = (request.query as { patientId?: string }).patientId;

    const campaigns = await prisma.activeCampaign.findMany({
      where: patientId ? { patientId } : undefined,
      include: {
        template: true,
        patient: true,
        scheduled: { orderBy: { sendAt: "asc" } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    });

    await recordAudit({
      userId: user.id,
      action: "campaign.read",
      resource: "campaign",
      metadata: { patientId, count: campaigns.length },
    });

    return { campaigns };
  });

  app.get("/campaigns/:id", async (request, reply) => {
    const user = requireAuth(request);
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

    await recordAudit({
      userId: user.id,
      action: "campaign.read",
      resource: "campaign",
      resourceId: id,
    });

    return { campaign };
  });

  app.post("/campaigns", async (request, reply) => {
    const user = requireAuth(request);
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
      log.info({ campaignId: existing.id }, "campaign already active");
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

    await recordAudit({
      userId: user.id,
      action: "campaign.start",
      resource: "campaign",
      resourceId: campaign.id,
      metadata: {
        patientId: parsed.data.patientId,
        templateId: parsed.data.templateId,
        physicianPhone,
      },
    });

    log.info(
      { campaignId: campaign.id, patientId: parsed.data.patientId, templateId: parsed.data.templateId },
      "campaign started"
    );
    return { campaign, alreadyActive: false };
  });

  app.post("/campaigns/:id/cancel", async (request, reply) => {
    const user = requireAuth(request);
    const { id } = request.params as { id: string };
    const campaign = await prisma.activeCampaign.findUnique({ where: { id } });
    if (!campaign) return reply.status(404).send({ error: "Campaign not found" });

    const updated = await prisma.activeCampaign.update({
      where: { id },
      data: {
        status: CampaignStatus.CANCELLED,
        completedAt: new Date(),
      },
      include: { scheduled: true, patient: true, template: true },
    });

    await recordAudit({
      userId: user.id,
      action: "campaign.cancel",
      resource: "campaign",
      resourceId: id,
    });

    log.info({ campaignId: id }, "campaign cancelled");
    return { campaign: updated };
  });
}
