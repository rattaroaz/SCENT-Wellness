"use client";

import { useMemo } from "react";
import { formatCountdown } from "@/lib/countdown";
import { useNow } from "@/hooks/useNow";
import { useTreeExpansion } from "@/hooks/useTreeExpansion";
import { TreeChevron } from "@/components/tree/TreeChevron";
import { TreeToolbar } from "@/components/tree/TreeToolbar";
import type { ActivityTreePatient, Campaign } from "@/lib/types";

type Props = {
  patients: ActivityTreePatient[];
  selectedPatientId: string | null;
  selectedCampaignId: string | null;
  onSelectPatient: (patient: ActivityTreePatient) => void;
  onSelectCampaign: (patient: ActivityTreePatient, campaign: Campaign) => void;
  onDeletePatient?: (patientId: string) => void;
  canManage?: boolean;
  emptyLabel?: string;
};

function patientKey(id: string) {
  return `patient:${id}`;
}

function campaignKey(id: string) {
  return `campaign:${id}`;
}

function statusColor(status: Campaign["status"]) {
  if (status === "ACTIVE") return "text-green-700 bg-green-50";
  if (status === "COMPLETED") return "text-slate-600 bg-slate-100";
  return "text-red-700 bg-red-50";
}

export function ActivityTree({
  patients,
  selectedPatientId,
  selectedCampaignId,
  onSelectPatient,
  onSelectCampaign,
  onDeletePatient,
  canManage,
  emptyLabel = "No patients yet. Add a patient to start.",
}: Props) {
  const treeKeys = useMemo(() => {
    const keys: string[] = [];
    for (const p of patients) {
      keys.push(patientKey(p.id));
      for (const c of p.campaigns ?? []) {
        keys.push(campaignKey(c.id));
      }
    }
    return keys;
  }, [patients]);

  const { isExpanded, toggle, expandAll, collapseAll } = useTreeExpansion(
    treeKeys,
    { storageKey: "scent-active-tree-expanded" }
  );
  const now = useNow();

  if (patients.length === 0) {
    return <p className="p-4 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TreeToolbar onExpandAll={expandAll} onCollapseAll={collapseAll} />
      <ul className="flex-1 overflow-y-auto text-sm" role="tree" aria-label="Active threads">
        {patients.map((p) => {
          const pKey = patientKey(p.id);
          const patientOpen = isExpanded(pKey);
          const campaigns = p.campaigns ?? [];
          const isPatientSelected =
            selectedPatientId === p.id && !selectedCampaignId;

          return (
            <li key={p.id} role="treeitem" aria-expanded={patientOpen}>
              <div
                className={`flex items-center gap-0.5 border-b border-slate-100 px-2 py-2 ${
                  isPatientSelected ? "bg-brand-50" : ""
                }`}
              >
                <TreeChevron
                  expanded={patientOpen}
                  onToggle={() => toggle(pKey)}
                  label={`${p.lastName}, ${p.firstName} campaigns`}
                  hasChildren={campaigns.length > 0}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left font-medium text-slate-800 hover:text-brand-700"
                  onClick={() => onSelectPatient(p)}
                >
                  {p.lastName}, {p.firstName}
                  {campaigns.length > 0 && (
                    <span className="ml-1 rounded bg-green-100 px-1.5 text-xs font-normal text-green-800">
                      {campaigns.length} active
                    </span>
                  )}
                </button>
                {canManage && onDeletePatient && (
                  <button
                    type="button"
                    className="shrink-0 rounded px-1.5 text-xs text-red-600 hover:bg-red-50"
                    title="Delete patient"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          `Delete ${p.lastName}, ${p.firstName}? All campaigns and messages will be removed.`
                        )
                      ) {
                        onDeletePatient(p.id);
                      }
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {patientOpen && campaigns.length > 0 && (
                <ul className="tree-children" role="group">
                  {campaigns.map((c) => {
                    const cKey = campaignKey(c.id);
                    const campaignOpen = isExpanded(cKey);
                    const scheduled = c.scheduled ?? [];
                    const templateName = c.template?.name ?? "Procedure";

                    return (
                      <li key={c.id} role="treeitem" aria-expanded={campaignOpen}>
                        <div
                          className={`flex items-center gap-0.5 py-1.5 pl-7 pr-2 ${
                            selectedCampaignId === c.id
                              ? "bg-brand-100 ring-1 ring-inset ring-brand-300"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <TreeChevron
                            expanded={campaignOpen}
                            onToggle={() => toggle(cKey)}
                            label={`${templateName} messages`}
                            hasChildren={scheduled.length > 0}
                          />
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => onSelectCampaign(p, c)}
                          >
                            <span className="font-medium text-slate-700">
                              {templateName}
                            </span>
                            <span
                              className={`ml-1.5 rounded px-1 text-[10px] uppercase ${statusColor(c.status)}`}
                            >
                              {c.status}
                            </span>
                          </button>
                        </div>

                        {campaignOpen && scheduled.length > 0 && (
                          <ul className="tree-children" role="group">
                            {scheduled.map((msg) => {
                              const remaining =
                                now === null
                                  ? 0
                                  : new Date(msg.sendAt).getTime() - now;
                              return (
                                <li
                                  key={msg.id}
                                  role="treeitem"
                                  className="tree-leaf py-1 pl-14 pr-3 text-xs text-slate-600"
                                >
                                  <span className="text-slate-700">{msg.body}</span>
                            <span className="ml-1 text-slate-400">
                              {msg.expectsResponse === false && (
                                <span className="text-amber-600">· no reply · </span>
                              )}
                              {msg.status === "SENT"
                                ? "sent"
                                : now === null
                                  ? "…"
                                  : formatCountdown(remaining)}
                            </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {patientOpen && campaigns.length === 0 && (
                <p className="tree-leaf py-1 pl-14 text-xs text-slate-400">
                  No active campaigns
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
