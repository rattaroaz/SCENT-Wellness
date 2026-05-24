"use client";

import { useEffect, useState } from "react";
import { useNow } from "@/hooks/useNow";
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
import { ResponseExpectedToggle } from "@/components/ResponseExpectedToggle";
import type { Campaign, ProcedureTemplate, ScheduledMessage } from "@/lib/types";

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
  const now = useNow();
  const [updatingScheduledId, setUpdatingScheduledId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setPhysicianPhone(loadPhysicianPhonePreference());
  }, []);

  useEffect(() => {
    if (campaign?.physicianPhone) {
      setPhysicianPhone(formatPhoneDisplay(campaign.physicianPhone));
    }
  }, [campaign?.id, campaign?.physicianPhone]);

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

  async function toggleScheduledResponse(
    scheduled: ScheduledMessage,
    expectsResponse: boolean
  ) {
    if (!campaign || campaign.status !== "ACTIVE") return;
    setUpdatingScheduledId(scheduled.id);
    try {
      const res = await api<{ scheduled: ScheduledMessage }>(
        `/scheduled-messages/${scheduled.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ expectsResponse }),
        }
      );
      setCampaign({
        ...campaign,
        scheduled: (campaign.scheduled ?? []).map((s) =>
          s.id === scheduled.id ? res.scheduled : s
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update message");
    } finally {
      setUpdatingScheduledId(null);
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

          {selectedTemplate && !campaign && (
            <div className="mt-4 max-w-2xl">
              <p className="text-xs font-medium text-slate-600">
                Template preview ({selectedTemplate.messages.length} message
                {selectedTemplate.messages.length === 1 ? "" : "s"})
              </p>
              <ul className="mt-2 space-y-2">
                {selectedTemplate.messages.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <ResponseExpectedToggle
                      checked={m.expectsResponse !== false}
                      readOnly
                      compact
                    />
                    <span className="min-w-0 flex-1 text-slate-800">{m.body}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {m.expectsResponse !== false ? "Replies on" : "No replies"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
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
              <p className="mt-1 text-xs text-slate-500">
                Use the checkbox to allow or block patient replies for each
                message.
              </p>
              <ul className="mt-3 space-y-2">
                {(campaign.scheduled ?? []).map((s) => {
                  const remaining =
                    now === null ? 0 : new Date(s.sendAt).getTime() - now;
                  const expectsResponse = s.expectsResponse !== false;
                  return (
                    <li
                      key={s.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 font-medium text-slate-800">
                          {s.body}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <ResponseExpectedToggle
                            checked={expectsResponse}
                            disabled={updatingScheduledId === s.id}
                            compact
                            onChange={(next) =>
                              toggleScheduledResponse(s, next)
                            }
                          />
                          <span className="min-w-[4.5rem] text-right text-xs text-slate-500">
                            {s.status === "SENT"
                              ? "Sent"
                              : now === null
                                ? "…"
                                : formatCountdown(remaining)}
                          </span>
                        </div>
                      </div>
                      {!expectsResponse && (
                        <p className="mt-1 text-xs text-amber-700">
                          No patient replies — auto-reply if they text back
                        </p>
                      )}
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
