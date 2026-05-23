"use client";

import { useApp } from "@/context/AppContext";
import type { NavSection } from "@/lib/types";

const items: { key: NavSection; label: string }[] = [
  { key: "patient", label: "Patient" },
  { key: "messages", label: "Messages" },
  { key: "templates", label: "Templates" },
  { key: "threads", label: "Threads" },
];

export function SideNav() {
  const { nav, setNav, user, logout } = useApp();

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Menu
      </p>
      <nav className="mt-3 flex flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setNav(item.key)}
            className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              nav === item.key
                ? "bg-brand-600 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700">{user?.username}</p>
        <p className="capitalize">{user?.role?.toLowerCase()}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
          className="mt-2 text-brand-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
