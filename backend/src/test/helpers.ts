import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { Role, SmsDirection } from "@prisma/client";

export async function createTestUser(role: Role = Role.USER) {
  const hash = await bcrypt.hash("password", 10);
  return prisma.user.upsert({
    where: { username: `test-${role.toLowerCase()}` },
    update: { role, passwordHash: hash },
    create: {
      username: `test-${role.toLowerCase()}`,
      role,
      passwordHash: hash,
    },
  });
}

export async function createTestPatient(overrides: Partial<{
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  mrn: string;
  cellPhone: string;
}> = {}) {
  return prisma.patient.create({
    data: {
      lastName: "Test",
      firstName: "Patient",
      dateOfBirth: "1990-01-01",
      mrn: `MRN-${Date.now()}`,
      cellPhone: "555-123-4567",
      ...overrides,
    },
  });
}

export async function createTestTemplate(messages: Array<{
  body: string;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  expectsResponse?: boolean;
}>) {
  return prisma.procedureTemplate.create({
    data: {
      name: `Template-${Date.now()}`,
      messages: {
        create: messages.map((m, i) => ({
          sortOrder: i,
          body: m.body,
          weeks: m.weeks ?? 0,
          days: m.days ?? 0,
          hours: m.hours ?? 0,
          minutes: m.minutes ?? 0,
          seconds: m.seconds ?? 0,
          expectsResponse: m.expectsResponse ?? true,
        })),
      },
    },
    include: { messages: true },
  });
}

export function getAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function loginAs(app: { inject: (opts: object) => Promise<{ body: string }> }, username: string, password = "password") {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { username, password },
  });
  return JSON.parse(res.body).token as string;
}

export async function createOutboundSmsLog(params: {
  patientId: string;
  campaignId?: string | null;
  body?: string;
  questionMessage?: string;
}) {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { id: params.patientId },
  });
  return prisma.simulatedSmsLog.create({
    data: {
      direction: SmsDirection.OUTBOUND,
      fromNumber: "SCENT-App",
      toNumber: patient.cellPhone,
      body: params.body ?? "How are you feeling?",
      questionMessage: params.questionMessage ?? params.body ?? "How are you feeling?",
      patientId: params.patientId,
      campaignId: params.campaignId ?? undefined,
    },
  });
}
