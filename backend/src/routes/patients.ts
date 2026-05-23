import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../lib/auth";

const patientSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  dateOfBirth: z.string().min(1),
  mrn: z.string().min(1),
  cellPhone: z.string().min(1),
});

export async function patientRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/patients", async (request) => {
    requireAuth(request);
    const query = (request.query as { query?: string }).query?.trim();

    const patients = await prisma.patient.findMany({
      where: query
        ? {
            OR: [
              { lastName: { contains: query } },
              { firstName: { contains: query } },
              { mrn: { contains: query } },
              { cellPhone: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { lastName: "asc" },
      take: 50,
    });

    return { patients };
  });

  app.get("/patients/:id", async (request, reply) => {
    requireAuth(request);
    const { id } = request.params as { id: string };
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return reply.status(404).send({ error: "Patient not found" });
    return { patient };
  });

  app.post("/patients", async (request, reply) => {
    requireAuth(request);
    const parsed = patientSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const patient = await prisma.patient.upsert({
      where: { mrn: parsed.data.mrn },
      update: parsed.data,
      create: parsed.data,
    });

    return { patient };
  });
}
