"use client";

import { useMemo } from "react";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { useTreeExpansion } from "@/hooks/useTreeExpansion";
import { TreeChevron } from "@/components/tree/TreeChevron";
import { TreeToolbar } from "@/components/tree/TreeToolbar";
import type { CompletedThread, Patient } from "@/lib/types";

type Props = {
  threads: CompletedThread[];
  retentionDays: number;
};

type PatientGroup = {
  patient: Patient;
  threads: CompletedThread[];
};

function patientKey(id: string) {
  return `patient:${id}`;
}

function campaignKey(id: string) {
  return `campaign:${id}`;
}

function purgeDate(completedAt: string, retentionDays: number): Date {
  return new Date(
    new Date(completedAt).getTime() + retentionDays * 24 * 60 * 60 * 1000
  );
}

function groupByPatient(threads: CompletedThread[]): PatientGroup[] {
  const map = new Map<string, PatientGroup>();
  for (const t of threads) {
    if (!t.patient || !t.completedAt) continue;
    const existing = map.get(t.patient.id);
    if (existing) {
      existing.threads.push(t);
    } else {
      map.set(t.patient.id, { patient: t.patient, threads: [t] });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.patient.lastName.localeCompare(b.patient.lastName)
  );
}

export function CompletedThreadsPanel({ threads, retentionDays }: Props) {
  const groups = useMemo(() => groupByPatient(threads), [threads]);

  const treeKeys = useMemo(() => {
    const keys: string[] = [];
    for (const g of groups) {
      keys.push(patientKey(g.patient.id));
      for (const t of g.threads) {
        keys.push(campaignKey(t.id));
      }
    }
    return keys;
  }, [groups]);

  const { isExpanded, toggle, expandAll, collapseAll } = useTreeExpansion(
    treeKeys,
    { storageKey: "scent-completed-tree-expanded", defaultExpanded: false }
  );

  if (threads.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">
        No completed threads. Finished campaigns appear here until they are
        removed automatically after {retentionDays} days.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TreeToolbar onExpandAll={expandAll} onCollapseAll={collapseAll} />
      <ul className="flex-1 overflow-y-auto text-sm" role="tree" aria-label="Completed threads">
        {groups.map(({ patient, threads: patientThreads }) => {
          const pKey = patientKey(patient.id);
          const patientOpen = isExpanded(pKey);

          return (
            <li key={patient.id} role="treeitem" aria-expanded={patientOpen}>
              <div className="flex items-center gap-0.5 border-b border-slate-100 px-2 py-2">
                <TreeChevron
                  expanded={patientOpen}
                  onToggle={() => toggle(pKey)}
                  label={`${patient.lastName}, ${patient.firstName} threads`}
                  hasChildren={patientThreads.length > 0}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">
                    {patient.lastName}, {patient.firstName}
                  </p>
                  <p className="text-xs text-slate-500">
                    MRN {patient.mrn} · {formatPhoneDisplay(patient.cellPhone)}
                  </p>
                </div>
              </div>

              {patientOpen && (
                <ul className="tree-children" role="group">
                  {patientThreads.map((t) => {
                    const cKey = campaignKey(t.id);
                    const campaignOpen = isExpanded(cKey);
                    const templateName = t.template?.name ?? "Procedure";
                    const scheduled = t.scheduled ?? [];
                    const removesAt = purgeDate(t.completedAt!, retentionDays);
                    const daysLeft = Math.max(
                      0,
                      Math.ceil(
                        (removesAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                      )
                    );

                    return (
                      <li key={t.id} role="treeitem" aria-expanded={campaignOpen}>
                        <div className="flex items-start gap-0.5 py-2 pl-7 pr-2">
                          <TreeChevron
                            expanded={campaignOpen}
                            onToggle={() => toggle(cKey)}
                            label={`${templateName} messages`}
                            hasChildren={scheduled.length > 0}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-700">{templateName}</p>
                            <p className="mt-1 flex flex-wrap gap-2 text-xs">
                              <span
                                className={`rounded px-1.5 py-0.5 uppercase ${
                                  t.status === "COMPLETED"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {t.status}
                              </span>
                              <span className="text-slate-400">
                                Completed{" "}
                                {new Date(t.completedAt!).toLocaleDateString()}
                              </span>
                              <span className="text-amber-700">
                                Deletes in {daysLeft} day{daysLeft === 1 ? "" : "s"}
                              </span>
                            </p>
                          </div>
                        </div>

                        {campaignOpen && scheduled.length > 0 && (
                          <ul className="tree-children" role="group">
                            {scheduled.map((msg) => (
                              <li
                                key={msg.id}
                                role="treeitem"
                                className="tree-leaf py-1 pl-14 pr-3 text-xs text-slate-500"
                              >
                                <span className="text-slate-700">{msg.body}</span>
                                <span className="ml-1 text-slate-400">
                                  · {msg.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
