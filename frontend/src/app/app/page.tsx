"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { SideNav } from "@/components/SideNav";
import { PatientPane } from "@/components/PatientPane";
import { MessagesPane } from "@/components/MessagesPane";
import { ThreadsPane } from "@/components/ThreadsPane";
import { TemplatesPane } from "@/components/TemplatesPane";
import { SmsSimulator } from "@/components/SmsSimulator";
import { ResizableSplit } from "@/components/resize/ResizableSplit";
import type { NavSection } from "@/lib/types";

function CenterPanel({ nav }: { nav: NavSection }) {
  if (nav === "threads") {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
        <ThreadsPane />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {nav === "patient" && <PatientPane />}
      {nav === "messages" && <MessagesPane />}
      {nav === "templates" && <TemplatesPane />}
    </div>
  );
}

export default function AppPage() {
  const { user, loading, nav } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-brand-700">SCENT Wellness</h1>
      </header>
      <ResizableSplit
        direction="horizontal"
        initialSize={192}
        minSize={120}
        maxSize={400}
        storageKey="scent-nav-width"
        className="min-h-0 flex-1"
        first={<SideNav />}
        second={
          <ResizableSplit
            direction="vertical"
            initialSize={320}
            minSize={160}
            maxSize={2000}
            minSecondary={200}
            storageKey="scent-simulator-height"
            className="h-full min-h-0"
            first={<CenterPanel nav={nav} />}
            second={
              <div className="h-full min-h-[160px]">
                <SmsSimulator />
              </div>
            }
          />
        }
      />
    </div>
  );
}
