import { FastifyInstance } from "fastify";
import { Role, SmsDirection } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import {
  DEFAULT_PHYSICIAN_PHONE,
  formatPhysicianSmsBody,
  normalizePhone,
  phonesMatch,
} from "../lib/physicianPhones";

const replySchema = z.object({
  outboundLogId: z.string(),
  answer: z.string().min(1),
});

const physicianSchema = z.object({
  physicianPhone: z.string().min(1),
  enabled: z.boolean().optional(),
  label: z.string().optional(),
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
    const phone = (request.query as { phone?: string }).phone;

    const entries = await prisma.physicianForwardEntry.findMany({
      orderBy: { createdAt: "asc" },
      take: 300,
    });

    if (phone) {
      return {
        entries: entries.filter((e) => phonesMatch(e.physicianPhone, phone)),
      };
    }

    return { entries };
  });

  app.get("/sms/physician-config", async (request) => {
    requireAuth(request);
    const configs = await prisma.physicianForward.findMany({
      orderBy: { physicianPhone: "asc" },
    });
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
        physicianPhone: normalizePhone(parsed.data.physicianPhone),
        enabled: parsed.data.enabled ?? true,
        label: parsed.data.label,
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

    const patient = outbound.patient;
    const targetPhone = normalizePhone(
      outbound.campaign?.physicianPhone || DEFAULT_PHYSICIAN_PHONE
    );
    const questionMessage = outbound.questionMessage ?? outbound.body;
    const forwardPayload = {
      lastName: patient.lastName,
      firstName: patient.firstName,
      dateOfBirth: patient.dateOfBirth,
      mrn: patient.mrn,
      questionMessage,
      patientAnswer: parsed.data.answer,
    };
    const smsBody = formatPhysicianSmsBody(forwardPayload);

    const result = await prisma.$transaction(async (tx) => {
      const inbound = await tx.simulatedSmsLog.create({
        data: {
          direction: SmsDirection.INBOUND,
          fromNumber: patient.cellPhone,
          toNumber: targetPhone,
          body: smsBody,
          patientId: patient.id,
          campaignId: outbound.campaignId,
          replyToLogId: outbound.id,
          questionMessage,
        },
      });

      const forward = await tx.physicianForwardEntry.create({
        data: {
          physicianPhone: targetPhone,
          ...forwardPayload,
          inboundLogId: inbound.id,
        },
      });

      return { inbound, forward };
    });

    return result;
  });
}
