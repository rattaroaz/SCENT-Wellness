"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/app" : "/login");
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Loading…</p>
    </div>
  );
}
