import { z } from "zod";

/** Shared API response contracts — validated in contract tests and usable for OpenAPI generation. */

export const roleSchema = z.enum(["ADMIN", "USER", "GUEST"]);

export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  role: roleSchema,
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string(),
});

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: userSchema,
});

export const authMeResponseSchema = z.object({
  user: userSchema,
});

export const errorResponseSchema = z.object({
  error: z.union([z.string(), z.record(z.unknown())]),
});

export const patientSchema = z.object({
  id: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  dateOfBirth: z.string(),
  mrn: z.string(),
  cellPhone: z.string(),
  createdAt: z.string().optional(),
});

export const patientsListResponseSchema = z.object({
  patients: z.array(patientSchema),
});

export const patientCreateResponseSchema = z.object({
  patient: patientSchema,
});

export const templateMessageSchema = z.object({
  id: z.string().optional(),
  body: z.string(),
  weeks: z.number(),
  days: z.number(),
  hours: z.number(),
  minutes: z.number(),
  seconds: z.number(),
  expectsResponse: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const procedureTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  noReplyMessage: z.string().optional(),
  messages: z.array(templateMessageSchema),
});

export const templatesListResponseSchema = z.object({
  templates: z.array(procedureTemplateSchema),
});

export const scheduledMessageSchema = z.object({
  id: z.string(),
  sendAt: z.string(),
  sentAt: z.string().nullable(),
  status: z.enum(["PENDING", "SENT", "FAILED"]),
  body: z.string(),
  expectsResponse: z.boolean().optional(),
});

export const campaignSchema = z.object({
  id: z.string(),
  physicianPhone: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  patient: patientSchema.optional(),
  template: z.object({
    id: z.string(),
    name: z.string(),
    messages: z.array(templateMessageSchema).optional(),
  }),
  scheduled: z.array(scheduledMessageSchema),
});

export const campaignStartResponseSchema = z.object({
  campaign: campaignSchema,
  alreadyActive: z.boolean(),
});

export const smsLogSchema = z.object({
  id: z.string(),
  direction: z.enum(["OUTBOUND", "INBOUND"]),
  fromNumber: z.string(),
  toNumber: z.string(),
  body: z.string(),
  questionMessage: z.string().nullable().optional(),
  expectsResponse: z.boolean().optional(),
  createdAt: z.string(),
  replyToLogId: z.string().nullable().optional(),
});

export const patientInboxResponseSchema = z.object({
  logs: z.array(smsLogSchema),
});

export const physicianEntrySchema = z.object({
  id: z.string(),
  physicianPhone: z.string(),
  lastName: z.string(),
  firstName: z.string(),
  dateOfBirth: z.string(),
  mrn: z.string(),
  questionMessage: z.string(),
  patientAnswer: z.string(),
  createdAt: z.string(),
});

export const physicianInboxResponseSchema = z.object({
  entries: z.array(physicianEntrySchema),
});

export const simulateClearResponseSchema = z.object({
  ok: z.literal(true),
  logs: z.number(),
  forwards: z.number(),
});

export function parseContract<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `Contract violation (${label}): ${result.error.message}`
    );
  }
  return result.data;
}
