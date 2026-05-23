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
import type {
  Campaign,
  NavSection,
  Patient,
  PhysicianEntry,
  ProcedureTemplate,
  Role,
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
  templates: ProcedureTemplate[];
  refreshTemplates: () => Promise<void>;
  patientSms: SmsLog[];
  physicianInbox: PhysicianEntry[];
  refreshSms: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  canEditTemplates: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<NavSection>("patient");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<ProcedureTemplate[]>([]);
  const [patientSms, setPatientSms] = useState<SmsLog[]>([]);
  const [physicianInbox, setPhysicianInbox] = useState<PhysicianEntry[]>([]);

  const canEditTemplates = user?.role === "ADMIN" || user?.role === "USER";

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

  const refreshCampaign = useCallback(async () => {
    if (!patient?.id) return;
    const res = await api<{ campaigns: Campaign[] }>(
      `/campaigns?patientId=${patient.id}`
    );
    const active = res.campaigns.find((c) => c.status === "ACTIVE");
    setCampaign(active ?? res.campaigns[0] ?? null);
  }, [patient?.id]);

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshTemplates().catch(console.error);
  }, [user, refreshTemplates]);

  useEffect(() => {
    if (!user || !patient) return;
    refreshCampaign().catch(console.error);
  }, [user, patient, refreshCampaign]);

  useEffect(() => {
    if (!user) return;
    refreshSms().catch(console.error);
    const id = setInterval(() => refreshSms().catch(console.error), 2000);
    return () => clearInterval(id);
  }, [user, refreshSms]);

  useEffect(() => {
    if (!user || !campaign) return;
    const id = setInterval(() => {
      api<{ campaign: Campaign }>(`/campaigns/${campaign.id}`)
        .then((r) => setCampaign(r.campaign))
        .catch(console.error);
    }, 2000);
    return () => clearInterval(id);
  }, [user, campaign?.id]);

  const login = async (username: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPatient(null);
    setCampaign(null);
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
      templates,
      refreshTemplates,
      patientSms,
      physicianInbox,
      refreshSms,
      login,
      logout,
      canEditTemplates,
    }),
    [
      user,
      loading,
      nav,
      patient,
      campaign,
      templates,
      refreshTemplates,
      patientSms,
      physicianInbox,
      refreshSms,
      canEditTemplates,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
