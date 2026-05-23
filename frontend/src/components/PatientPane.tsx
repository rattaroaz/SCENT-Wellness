"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { Patient } from "@/lib/types";

export function PatientPane() {
  const { setPatient, setNav } = useApp();
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    dateOfBirth: "",
    mrn: "",
    cellPhone: "",
  });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api<{ patients: Patient[] }>(`/patients?query=${encodeURIComponent(search)}`)
        .then((r) => setResults(r.patients))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function selectPatient(p: Patient) {
    setForm({
      lastName: p.lastName,
      firstName: p.firstName,
      dateOfBirth: p.dateOfBirth,
      mrn: p.mrn,
      cellPhone: p.cellPhone,
    });
    setPatient(p);
    setNav("messages");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api<{ patient: Patient }>("/patients", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setPatient(res.patient);
      setNav("messages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-brand-700">Patient</h2>

      <form onSubmit={handleSubmit} className="mt-4 grid max-w-xl gap-3">
        {(
          [
            ["lastName", "Last Name"],
            ["firstName", "First Name"],
            ["dateOfBirth", "Date of Birth"],
            ["mrn", "MRN"],
            ["cellPhone", "Cell Phone"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="text-sm font-medium">{label}</label>
            <input
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Submit
          </button>
        </div>
      </form>

      <div className="mt-8">
        <label className="text-sm font-medium">Search</label>
        <input
          className="mt-1 w-full max-w-xl rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Name, MRN, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className="mt-2 max-w-xl divide-y rounded-lg border border-slate-200 bg-white">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => selectPatient(p)}
              >
                {p.lastName}, {p.firstName} — MRN {p.mrn}
              </button>
            </li>
          ))}
          {search && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
          )}
        </ul>
      </div>
    </div>
  );
}
