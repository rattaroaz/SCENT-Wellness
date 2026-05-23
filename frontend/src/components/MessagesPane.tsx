"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { formatCountdown } from "@/lib/countdown";
import { formatPhoneDisplay, formatPhoneInput } from "@/lib/phoneFormat";
import {
  DEFAULT_PHYSICIAN_PHONE,
  normalizePhone,
  PHYSICIAN_PHONES,
} from "@/lib/physicianPhones";
import {
  loadPhysicianPhonePreference,
  savePhysicianPhonePreference,
} from "@/lib/physicianPhonePreference";
import type { Campaign, ProcedureTemplate } from "@/lib/types";

export function MessagesPane() {
  const {
    patient,
    templates,
    campaign,
    setCampaign,
    refreshSms,
    refreshActivityTree,
    refreshCompletedThreads,
    setNav,
  } = useApp();
  const [templateId, setTemplateId] = useState("");
  const [physicianPhone, setPhysicianPhone] = useState(
    formatPhoneDisplay(DEFAULT_PHYSICIAN_PHONE)
  );
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setPhysicianPhone(loadPhysicianPhonePreference());
  }, []);

  useEffect(() => {
    if (campaign?.physicianPhone) {
      setPhysicianPhone(formatPhoneDisplay(campaign.physicianPhone));
    }
  }, [campaign?.id, campaign?.physicianPhone]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function handlePhysicianPhoneChange(value: string) {
    const formatted = formatPhoneInput(value);
    setPhysicianPhone(formatted);
    savePhysicianPhonePreference(formatted);
  }

  async function startCampaign() {
    if (!patient) return;
    if (!templateId) {
      setError("Select a procedure template");
      return;
    }
    const phone = normalizePhone(physicianPhone);
    if (phone.length < 7) {
      setError("Enter a valid physician SMS number (at least 7 digits)");
      return;
    }
    setError("");
    setStarting(true);
    try {
      const res = await api<{ campaign: Campaign; alreadyActive: boolean }>(
        "/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            patientId: patient.id,
            templateId,
            physicianPhone: phone,
          }),
        }
      );
      setCampaign(res.campaign);
      savePhysicianPhonePreference(phone);
      await refreshSms().catch(console.error);
      await Promise.all([
        refreshActivityTree(),
        refreshCompletedThreads(),
      ]).catch(console.error);
      setNav("threads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }

  async function cancelCampaign() {
    if (!campaign) return;
    try {
      const res = await api<{ campaign: Campaign }>(
        `/campaigns/${campaign.id}/cancel`,
        { method: "POST" }
      );
      setCampaign(null);
      await Promise.all([
        refreshActivityTree(),
        refreshCompletedThreads(),
      ]).catch(console.error);
      void res;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-lg font-semibold text-brand-700">Messages</h2>
      <p className="mt-1 text-xs text-slate-500">
        Start campaigns here. View and manage active threads under{" "}
        <strong>Threads</strong> in the menu.
      </p>

      {!patient ? (
        <p className="mt-6 text-slate-500">
          Select a patient under <strong>Patient</strong>, or pick an active
          thread under <strong>Threads</strong>.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              <span className="font-medium">Patient:</span> {patient.lastName},{" "}
              {patient.firstName}
            </p>
            <p>
              <span className="font-medium">DOB:</span> {patient.dateOfBirth}
            </p>
            <p>
              <span className="font-medium">MRN:</span> {patient.mrn}
            </p>
            <p>
              <span className="font-medium">Phone:</span>{" "}
              {formatPhoneDisplay(patient.cellPhone)}
            </p>
          </div>

          <div className="mt-4 max-w-md">
            <label className="text-sm font-medium">Physician SMS number</label>
            <input
              type="tel"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={physicianPhone}
              onChange={(e) => handlePhysicianPhoneChange(e.target.value)}
              placeholder={formatPhoneDisplay(DEFAULT_PHYSICIAN_PHONE)}
              list="physician-phone-suggestions"
              maxLength={12}
            />
            <datalist id="physician-phone-suggestions">
              {PHYSICIAN_PHONES.map((line) => (
                <option key={line.number} value={formatPhoneDisplay(line.number)}>
                  {line.label}
                </option>
              ))}
            </datalist>
          </div>

          <div className="mt-4 max-w-md">
            <label className="text-sm font-medium">Procedure template</label>
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">Select template…</option>
              {templates.map((t: ProcedureTemplate) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <p className="mt-2 text-xs text-slate-500">
              {selectedTemplate.messages.length} scheduled message(s) in template
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={starting}
              onClick={startCampaign}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Start campaign
            </button>
            {campaign?.status === "ACTIVE" && (
              <button
                type="button"
                onClick={cancelCampaign}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                Cancel campaign
              </button>
            )}
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          {campaign?.status === "ACTIVE" && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-700">
                {campaign.template?.name ?? "Campaign"}{" "}
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-normal text-green-800">
                  ACTIVE
                </span>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Open <strong>Threads</strong> to see this campaign in the active
                tree.
              </p>
              <ul className="mt-3 space-y-2">
                {(campaign.scheduled ?? []).map((s) => {
                  const remaining = new Date(s.sendAt).getTime() - now;
                  return (
                    <li
                      key={s.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-slate-800">{s.body}</p>
                      <p className="text-xs text-slate-500">
                        {s.status === "SENT"
                          ? "Sent"
                          : formatCountdown(remaining)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
