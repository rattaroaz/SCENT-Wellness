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
  createdAt?: string;
};

export type TemplateMessage = {
  id?: string;
  body: string;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expectsResponse?: boolean;
  sortOrder?: number;
};

export type ProcedureTemplate = {
  id: string;
  name: string;
  noReplyMessage?: string;
  messages: TemplateMessage[];
};

export type ScheduledMessage = {
  id: string;
  sendAt: string;
  sentAt: string | null;
  status: "PENDING" | "SENT" | "FAILED";
  body: string;
  expectsResponse?: boolean;
};

export type Campaign = {
  id: string;
  physicianPhone: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  startedAt: string;
  completedAt?: string | null;
  patient?: Patient;
  template: Pick<ProcedureTemplate, "id" | "name"> & {
    messages?: TemplateMessage[];
  };
  scheduled: ScheduledMessage[];
};

export type CompletedThread = Campaign & {
  patient: Patient;
  completedAt: string;
};

export type SmsLog = {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  fromNumber: string;
  toNumber: string;
  body: string;
  questionMessage?: string | null;
  expectsResponse?: boolean;
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

export type ActivityTreePatient = Patient & {
  campaigns: Campaign[];
};

export type NavSection = "patient" | "threads" | "messages" | "templates";
