"use client";

import { useApp } from "@/context/AppContext";
import { ActivityTree } from "@/components/ActivityTree";
import { CompletedThreadsPanel } from "@/components/CompletedThreadsPanel";
import { ResizableSplit } from "@/components/resize/ResizableSplit";
import type { ActivityTreePatient, Campaign } from "@/lib/types";

export function ThreadsPane() {
  const {
    patient,
    setPatient,
    campaign,
    setCampaign,
    activityTree,
    completedThreads,
    threadRetentionDays,
    canManagePatients,
    deletePatient,
  } = useApp();

  function selectTreePatient(p: ActivityTreePatient) {
    setPatient(p);
    setCampaign(null);
  }

  function selectTreeCampaign(p: ActivityTreePatient, c: Campaign) {
    setPatient(p);
    setCampaign(c);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h2 className="text-lg font-semibold text-brand-700">Threads</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Active threads on the left; completed threads are kept for{" "}
          {threadRetentionDays} days, then removed automatically.
        </p>
      </div>
      <ResizableSplit
        direction="horizontal"
        initialSize={320}
        minSize={220}
        maxSize={600}
        storageKey="scent-threads-split-width"
        className="min-h-0 flex-1"
        first={
          <div className="flex h-full flex-col border-r border-slate-200 bg-white">
            <p className="shrink-0 border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Active threads
            </p>
            <div className="flex min-h-0 flex-1 flex-col">
              <ActivityTree
                patients={activityTree}
                selectedPatientId={patient?.id ?? null}
                selectedCampaignId={campaign?.id ?? null}
                onSelectPatient={selectTreePatient}
                onSelectCampaign={selectTreeCampaign}
                onDeletePatient={deletePatient}
                canManage={canManagePatients}
                emptyLabel="No active threads. Start a campaign under Messages."
              />
            </div>
          </div>
        }
        second={
          <div className="flex h-full flex-col bg-slate-50">
            <p className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Completed (auto-delete in {threadRetentionDays} days)
            </p>
            <div className="flex min-h-0 flex-1 flex-col">
              <CompletedThreadsPanel
                threads={completedThreads}
                retentionDays={threadRetentionDays}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
