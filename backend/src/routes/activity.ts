import { CampaignStatus, ScheduledMessageStatus } from "@prisma/client";
import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";
import { recordAudit } from "../lib/audit";
import { THREAD_RETENTION_DAYS } from "../lib/threadRetention";

export async function activityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  /** Active threads only: ACTIVE campaigns with pending messages */
  app.get("/activity/tree", async (request) => {
    const user = requireAuth(request);

    const patients = await prisma.patient.findMany({
      where: {
        campaigns: { some: { status: CampaignStatus.ACTIVE } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        campaigns: {
          where: { status: CampaignStatus.ACTIVE },
          include: {
            template: { select: { id: true, name: true } },
            scheduled: {
              where: { status: ScheduledMessageStatus.PENDING },
              orderBy: { sendAt: "asc" },
            },
          },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    await recordAudit({
      userId: user.id,
      action: "activity.tree.read",
      resource: "activity",
      metadata: { patientCount: patients.length },
    });

    return { patients };
  });

  /** Completed / cancelled threads (removed after THREAD_RETENTION_DAYS) */
  app.get("/activity/completed", async (request) => {
    const user = requireAuth(request);

    const threads = await prisma.activeCampaign.findMany({
      where: {
        status: { in: [CampaignStatus.COMPLETED, CampaignStatus.CANCELLED] },
        completedAt: { not: null },
      },
      include: {
        patient: true,
        template: { select: { id: true, name: true } },
        scheduled: { orderBy: { sendAt: "asc" } },
      },
      orderBy: { completedAt: "desc" },
      take: 200,
    });

    await recordAudit({
      userId: user.id,
      action: "activity.completed.read",
      resource: "activity",
      metadata: { count: threads.length },
    });

    return { threads, retentionDays: THREAD_RETENTION_DAYS };
  });
}
