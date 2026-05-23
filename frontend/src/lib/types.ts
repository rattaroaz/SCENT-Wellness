export type Role = "ADMIN" | "USER" | "GUEST";

export type User = {
  id: string;
  username: string;
  role: Role;
};

export type Patient = {
  id: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  mrn: string;
  cellPhone: string;
};

export type TemplateMessage = {
  id?: string;
  body: string;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  sortOrder?: number;
};

export type ProcedureTemplate = {
  id: string;
  name: string;
  messages: TemplateMessage[];
};

export type ScheduledMessage = {
  id: string;
  sendAt: string;
  sentAt: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  body: string;
};

export type Campaign = {
  id: string;
  physicianPhone: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startedAt: string;
  patient: Patient;
  template: ProcedureTemplate;
  scheduled: ScheduledMessage[];
};

export type SmsLog = {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  fromNumber: string;
  toNumber: string;
  body: string;
  questionMessage?: string | null;
  createdAt: string;
  replyToLogId?: string | null;
};

export type PhysicianEntry = {
  id: string;
  physicianPhone: string;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  mrn: string;
  questionMessage: string;
  patientAnswer: string;
  createdAt: string;
};

export type NavSection = "patient" | "messages" | "templates";
