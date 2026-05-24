import { FastifyInstance } from "fastify";
import { Role, SmsDirection } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import {
  DEFAULT_PHYSICIAN_PHONE,
  normalizePhone,
  phonesMatch,
} from "../lib/physicianPhones";
import { getLogger } from "../lib/logger";
import { recordAudit } from "../lib/audit";
import { DEFAULT_NO_REPLY_MESSAGE } from "../lib/smsDefaults";

const APP_FROM = "SCENT-App";

const log = getLogger("sms");

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
    const user = requireAuth(request);
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

    await recordAudit({
      userId: user.id,
      action: "sms.inbox.read",
      resource: "sms",
      resourceId: patientId,
      metadata: { campaignId, count: logs.length },
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
    const user = requireAuth(request);
    const configs = await prisma.physicianForward.findMany({
      orderBy: { physicianPhone: "asc" },
    });
    await recordAudit({
      userId: user.id,
      action: "physician.config.read",
      resource: "physician_forward",
      reqId: request.id,
      metadata: { count: configs.length },
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

    await recordAudit({
      userId: user.id,
      action: "physician.config.update",
      resource: "physician_forward",
      resourceId: id,
      metadata: { physicianPhone: config.physicianPhone, enabled: config.enabled },
    });

    log.info({ userId: user.id, configId: id }, "physician config updated");
    return { config };
  });

  app.post("/sms/simulate/reply", async (request, reply) => {
    const user = requireAuth(request);
    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const outbound = await prisma.simulatedSmsLog.findUnique({
      where: { id: parsed.data.outboundLogId },
      include: {
        patient: true,
        campaign: { include: { template: true } },
      },
    });

    if (!outbound || !outbound.patient) {
      log.warn({ outboundLogId: parsed.data.outboundLogId }, "outbound message not found for reply");
      return reply.status(404).send({ error: "Outbound message not found" });
    }

    if (outbound.direction !== SmsDirection.OUTBOUND) {
      return reply.status(400).send({ error: "Can only reply to clinic messages" });
    }

    const existingReply = await prisma.simulatedSmsLog.findFirst({
      where: {
        replyToLogId: outbound.id,
        direction: SmsDirection.INBOUND,
      },
    });
    if (existingReply) {
      return reply.status(409).send({
        error: "A reply was already recorded for this message",
      });
    }

    const patient = outbound.patient;
    const questionMessage = outbound.questionMessage ?? outbound.body;
    const patientAnswer = parsed.data.answer.trim();

    if (!outbound.expectsResponse) {
      const autoReplyBody =
        outbound.campaign?.template?.noReplyMessage?.trim() ||
        DEFAULT_NO_REPLY_MESSAGE;

      const result = await prisma.$transaction(async (tx) => {
        const inbound = await tx.simulatedSmsLog.create({
          data: {
            direction: SmsDirection.INBOUND,
            fromNumber: patient.cellPhone,
            toNumber: APP_FROM,
            body: patientAnswer,
            patientId: patient.id,
            campaignId: outbound.campaignId,
            replyToLogId: outbound.id,
            questionMessage,
            expectsResponse: false,
          },
        });

        const autoReply = await tx.simulatedSmsLog.create({
          data: {
            direction: SmsDirection.OUTBOUND,
            fromNumber: APP_FROM,
            toNumber: patient.cellPhone,
            body: autoReplyBody,
            patientId: patient.id,
            campaignId: outbound.campaignId,
            expectsResponse: false,
            questionMessage: autoReplyBody,
          },
        });

        return { inbound, autoReply, forwarded: false as const };
      });

      await recordAudit({
        userId: user.id,
        action: "sms.reply",
        resource: "sms",
        resourceId: outbound.id,
        reqId: request.id,
        metadata: {
          patientId: patient.id,
          campaignId: outbound.campaignId,
          expectsResponse: false,
          autoReply: true,
        },
      });

      log.info(
        {
          userId: user.id,
          patientId: patient.id,
          outboundLogId: outbound.id,
        },
        "patient reply to non-response message; auto-reply sent"
      );

      return result;
    }

    const targetPhone = normalizePhone(
      outbound.campaign?.physicianPhone || DEFAULT_PHYSICIAN_PHONE
    );
    const forwardPayload = {
      lastName: patient.lastName,
      firstName: patient.firstName,
      dateOfBirth: patient.dateOfBirth,
      mrn: patient.mrn,
      questionMessage,
      patientAnswer,
    };
    const result = await prisma.$transaction(async (tx) => {
      const inbound = await tx.simulatedSmsLog.create({
        data: {
          direction: SmsDirection.INBOUND,
          fromNumber: patient.cellPhone,
          toNumber: targetPhone,
          body: patientAnswer,
          patientId: patient.id,
          campaignId: outbound.campaignId,
          replyToLogId: outbound.id,
          questionMessage,
          expectsResponse: true,
        },
      });

      const forward = await tx.physicianForwardEntry.create({
        data: {
          physicianPhone: targetPhone,
          ...forwardPayload,
          inboundLogId: inbound.id,
        },
      });

      return { inbound, forward, forwarded: true as const };
    });

    await recordAudit({
      userId: user.id,
      action: "sms.reply",
      resource: "sms",
      resourceId: outbound.id,
      reqId: request.id,
      metadata: {
        patientId: patient.id,
        campaignId: outbound.campaignId,
        physicianPhone: targetPhone,
        expectsResponse: true,
      },
    });

    log.info(
      {
        userId: user.id,
        patientId: patient.id,
        outboundLogId: outbound.id,
        physicianPhone: targetPhone,
      },
      "patient reply forwarded to physician"
    );

    return result;
  });

  app.post("/sms/simulate/clear", async (request) => {
    const user = requireAuth(request);
    const patientId = (request.query as { patientId?: string }).patientId;

    const cleared = await prisma.$transaction(async (tx) => {
      if (patientId) {
        const patient = await tx.patient.findUnique({ where: { id: patientId } });
        const logIds = (
          await tx.simulatedSmsLog.findMany({
            where: { patientId },
            select: { id: true },
          })
        ).map((l) => l.id);
        const forwardWhere = patient
          ? {
              OR: [
                ...(logIds.length > 0
                  ? [{ inboundLogId: { in: logIds } as const }]
                  : []),
                { mrn: patient.mrn },
              ],
            }
          : logIds.length > 0
            ? { inboundLogId: { in: logIds } }
            : { id: { in: [] as string[] } };
        const forwards = await tx.physicianForwardEntry.deleteMany({
          where: forwardWhere,
        });
        const logs = await tx.simulatedSmsLog.deleteMany({ where: { patientId } });
        return { logs: logs.count, forwards: forwards.count };
      }
      const forwards = await tx.physicianForwardEntry.deleteMany();
      const logs = await tx.simulatedSmsLog.deleteMany();
      return { logs: logs.count, forwards: forwards.count };
    });

    await recordAudit({
      userId: user.id,
      action: "sms.simulator.clear",
      resource: "sms",
      resourceId: patientId,
      reqId: request.id,
      metadata: cleared,
    });

    log.info({ userId: user.id, patientId, ...cleared }, "simulator messages cleared");
    return { ok: true, ...cleared };
  });
}
