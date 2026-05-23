"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, setToken } from "@/lib/api";
import { clientLogger, setClientLogContext, clearClientLogField } from "@/lib/logger";
import type {
  ActivityTreePatient,
  Campaign,
  CompletedThread,
  NavSection,
  Patient,
  PhysicianEntry,
  ProcedureTemplate,
  SmsLog,
  User,
} from "@/lib/types";

type AppContextValue = {
  user: User | null;
  loading: boolean;
  nav: NavSection;
  setNav: (n: NavSection) => void;
  patient: Patient | null;
  setPatient: (p: Patient | null) => void;
  campaign: Campaign | null;
  setCampaign: (c: Campaign | null) => void;
  activityTree: ActivityTreePatient[];
  completedThreads: CompletedThread[];
  threadRetentionDays: number;
  refreshActivityTree: () => Promise<void>;
  refreshCompletedThreads: () => Promise<void>;
  templates: ProcedureTemplate[];
  refreshTemplates: () => Promise<void>;
  patientSms: SmsLog[];
  physicianInbox: PhysicianEntry[];
  refreshSms: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  canEditTemplates: boolean;
  canManagePatients: boolean;
  deletePatient: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<NavSection>("patient");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [activityTree, setActivityTree] = useState<ActivityTreePatient[]>([]);
  const [completedThreads, setCompletedThreads] = useState<CompletedThread[]>([]);
  const [threadRetentionDays, setThreadRetentionDays] = useState(30);
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [patientSms, setPatientSms] = useState<SmsLog[]>([]);
  const [physicianInbox, setPhysicianInbox] = useState<PhysicianEntry[]>([]);

  const canEditTemplates = user?.role === "ADMIN" || user?.role === "USER";
  const canManagePatients = canEditTemplates;

  const refreshActivityTree = useCallback(async () => {
    try {
      const res = await api<{ patients: ActivityTreePatient[] }>("/activity/tree");
      setActivityTree(res.patients ?? []);
    } catch (err) {
      clientLogger.warn("activity tree refresh failed", { err: String(err) });
      setActivityTree([]);
    }
  }, []);

  const refreshCompletedThreads = useCallback(async () => {
    try {
      const res = await api<{
        threads: CompletedThread[];
        retentionDays: number;
      }>("/activity/completed");
      setCompletedThreads(res.threads ?? []);
      setThreadRetentionDays(res.retentionDays ?? 30);
    } catch (err) {
      clientLogger.warn("completed threads refresh failed", { err: String(err) });
      setCompletedThreads([]);
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    const res = await api<{ templates: ProcedureTemplate[] }>("/templates");
    setTemplates(res.templates);
  }, []);

  const refreshSms = useCallback(async () => {
    const params = new URLSearchParams();
    if (patient?.id) params.set("patientId", patient.id);
    if (campaign?.id) params.set("campaignId", campaign.id);
    const q = params.toString() ? `?${params}` : "";

    const [sms, phys] = await Promise.all([
      api<{ logs: SmsLog[] }>(`/sms/patient-inbox${q}`),
      api<{ entries: PhysicianEntry[] }>("/sms/physician-inbox"),
    ]);
    setPatientSms(sms.logs);
    setPhysicianInbox(phys.entries);
  }, [patient?.id, campaign?.id]);

  const deletePatient = useCallback(
    async (id: string) => {
      await api(`/patients/${id}`, { method: "DELETE" });
      if (patient?.id === id) {
        setPatient(null);
        setCampaign(null);
      }
      await Promise.all([refreshActivityTree(), refreshCompletedThreads()]);
    },
    [patient?.id, refreshActivityTree, refreshCompletedThreads]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      await api(`/templates/${id}`, { method: "DELETE" });
      await refreshTemplates();
      await Promise.all([refreshActivityTree(), refreshCompletedThreads()]);
    },
    [refreshTemplates, refreshActivityTree, refreshCompletedThreads]
  );

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshTemplates().catch(console.error);
    refreshActivityTree().catch(console.error);
    refreshCompletedThreads().catch(console.error);
  }, [user, refreshTemplates, refreshActivityTree, refreshCompletedThreads]);

  useEffect(() => {
    if (!user) return;
    refreshSms().catch(console.error);
    const id = setInterval(() => refreshSms().catch(console.error), 2000);
    return () => clearInterval(id);
  }, [user, refreshSms]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      refreshActivityTree().catch(console.error);
      refreshCompletedThreads().catch(console.error);
      if (campaign?.id) {
        api<{ campaign: Campaign }>(`/campaigns/${campaign.id}`)
          .then((r) => {
            if (r.campaign.status === "ACTIVE") {
              setCampaign(r.campaign);
            } else {
              setCampaign(null);
              refreshActivityTree().catch(console.error);
              refreshCompletedThreads().catch(console.error);
            }
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : "";
            if (msg.includes("not found") || msg.includes("Not Found")) {
              setCampaign(null);
            }
          });
      }
    }, 2000);
    return () => clearInterval(id);
  }, [user, campaign?.id, refreshActivityTree, refreshCompletedThreads]);

  const login = async (username: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token);
    setUser(res.user);
    setClientLogContext({ userId: res.user.id, role: res.user.role });
    clientLogger.info("user logged in", { userId: res.user.id });
  };

  const logout = () => {
    clientLogger.info("user logged out", { userId: user?.id });
    setToken(null);
    setUser(null);
    setPatient(null);
    setCampaign(null);
    setActivityTree([]);
    setCompletedThreads([]);
    clearClientLogField("userId");
    clearClientLogField("role");
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      nav,
      setNav,
      patient,
      setPatient,
      campaign,
      setCampaign,
      activityTree,
      completedThreads,
      threadRetentionDays,
      refreshActivityTree,
      refreshCompletedThreads,
      templates,
      refreshTemplates,
      patientSms,
      physicianInbox,
      refreshSms,
      login,
      logout,
      canEditTemplates,
      canManagePatients,
      deletePatient,
      deleteTemplate,
    }),
    [
      user,
      loading,
      nav,
      patient,
      campaign,
      activityTree,
      completedThreads,
      threadRetentionDays,
      refreshActivityTree,
      refreshCompletedThreads,
      templates,
      refreshTemplates,
      patientSms,
      physicianInbox,
      refreshSms,
      canEditTemplates,
      canManagePatients,
      deletePatient,
      deleteTemplate,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
