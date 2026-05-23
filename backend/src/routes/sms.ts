import { FastifyInstance } from "fastify";
import { Role, SmsDirection } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";

const replySchema = z.object({
  outboundLogId: z.string(),
  answer: z.string().min(1),
});

const physicianSchema = z.object({
  physicianPhone: z.string().min(1),
  enabled: z.boolean().optional(),
});

export async function smsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/sms/patient-inbox", async (request) => {
    requireAuth(request);
    const patientId = (request.query as { patientId?: string }).patientId;
    const campaignId = (request.query as { campaignId?: string }).campaignId;

    const logs = await prisma.simulatedSmsLog.findMany({
      where: {
        ...(patientId ? { patientId } : {}),
        ...(campaignId ? { campaignId } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return { logs };
  });

  app.get("/sms/physician-inbox", async (request) => {
    requireAuth(request);
    const entries = await prisma.physicianForwardEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { entries };
  });

  app.get("/sms/physician-config", async (request) => {
    requireAuth(request);
    const configs = await prisma.physicianForward.findMany();
    return { configs };
  });

  app.put("/sms/physician-config/:id", async (request, reply) => {
    const user = requireAuth(request);
    if (user.role !== Role.ADMIN) {
      return reply.status(403).send({ error: "Admin only" });
    }

    const { id } = request.params as { id: string };
    const parsed = physicianSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const config = await prisma.physicianForward.update({
      where: { id },
      data: {
        physicianPhone: parsed.data.physicianPhone,
        enabled: parsed.data.enabled ?? true,
      },
    });

    return { config };
  });

  app.post("/sms/simulate/reply", async (request, reply) => {
    requireAuth(request);
    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const outbound = await prisma.simulatedSmsLog.findUnique({
      where: { id: parsed.data.outboundLogId },
      include: { patient: true, campaign: true },
    });

    if (!outbound || !outbound.patient) {
      return reply.status(404).send({ error: "Outbound message not found" });
    }

    const physician = await prisma.physicianForward.findFirst({
      where: { enabled: true },
    });

    const physicianPhone = physician?.physicianPhone ?? "+15550000000";
    const patient = outbound.patient;
    const questionMessage =
      outbound.questionMessage ?? outbound.body;

    const result = await prisma.$transaction(async (tx) => {
      const inbound = await tx.simulatedSmsLog.create({
        data: {
          direction: SmsDirection.INBOUND,
          fromNumber: patient.cellPhone,
          toNumber: physicianPhone,
          body: parsed.data.answer,
          patientId: patient.id,
          campaignId: outbound.campaignId,
          replyToLogId: outbound.id,
          questionMessage,
        },
      });

      const forward = await tx.physicianForwardEntry.create({
        data: {
          lastName: patient.lastName,
          firstName: patient.firstName,
          dateOfBirth: patient.dateOfBirth,
          mrn: patient.mrn,
          questionMessage,
          patientAnswer: parsed.data.answer,
          inboundLogId: inbound.id,
        },
      });

      return { inbound, forward };
    });

    return result;
  });
}
