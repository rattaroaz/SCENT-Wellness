"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { formatCountdown } from "@/lib/countdown";
import type { Campaign, ProcedureTemplate } from "@/lib/types";

export function MessagesPane() {
  const { patient, templates, campaign, setCampaign, refreshSms } = useApp();
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!patient) {
    return (
      <div className="p-6 text-slate-500">
        Select or submit a patient first (Patient menu).
      </div>
    );
  }

  async function startCampaign() {
    if (!patient) return;
    if (!templateId) {
      setError("Select a procedure template");
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
          }),
        }
      );
      setCampaign(res.campaign);
      await refreshSms();
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
      setCampaign(res.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-brand-700">Messages</h2>

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
          <span className="font-medium">Phone:</span> {patient.cellPhone}
        </p>
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

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={starting}
          onClick={startCampaign}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Submit — Start messaging
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

      {campaign && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700">
            Campaign: {campaign.template.name}{" "}
            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-normal">
              {campaign.status}
            </span>
          </h3>
          <ul className="mt-3 space-y-2">
            {campaign.scheduled.map((s) => {
              const sendAt = new Date(s.sendAt).getTime();
              const remaining = sendAt - now;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-800">{s.body}</p>
                  <p className="text-xs text-slate-500">
                    Send at: {new Date(s.sendAt).toLocaleString()} —{" "}
                    <span
                      className={
                        s.status === "SENT"
                          ? "text-green-600"
                          : "text-brand-600"
                      }
                    >
                      {s.status === "SENT"
                        ? "Sent"
                        : formatCountdown(remaining)}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
