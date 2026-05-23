"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const { login, user, loading } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.replace("/app");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-brand-700">SCENT Wellness</h1>
        <p className="mt-1 text-sm text-slate-500">
          Patient SMS messaging portal
        </p>

        <label className="mt-6 block text-sm font-medium">Username</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Default: admin/password, user/password, guest/password
        </p>
      </form>
    </div>
  );
}
