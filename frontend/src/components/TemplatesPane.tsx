"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { ProcedureTemplate, TemplateMessage } from "@/lib/types";

const emptyRow = (): TemplateMessage => ({
  body: "",
  weeks: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
});

export function TemplatesPane() {
  const { templates, refreshTemplates, canEditTemplates, deleteTemplate } =
    useApp();
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [rows, setRows] = useState<TemplateMessage[]>(
    Array.from({ length: 5 }, emptyRow)
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    const t = templates.find((x) => x.id === selectedId);
    if (t) {
      setName(t.name);
      setRows(
        t.messages.length > 0
          ? t.messages.map((m) => ({
              body: m.body,
              weeks: m.weeks,
              days: m.days,
              hours: m.hours,
              minutes: m.minutes,
              seconds: m.seconds,
            }))
          : Array.from({ length: 5 }, emptyRow)
      );
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || saving) return;
    const t = templates.find((x) => x.id === selectedId);
    if (!t) return;
    setName(t.name);
  }, [templates, selectedId, saving]);

  function updateRow(i: number, field: keyof TemplateMessage, value: string) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i
          ? {
              ...r,
              [field]:
                field === "body"
                  ? value
                  : Math.max(0, parseInt(value, 10) || 0),
            }
          : r
      )
    );
  }

  async function handleSave() {
    if (!canEditTemplates) return;
    setError("");
    setSaving(true);
    const payload = {
      name: name.trim(),
      messages: rows.filter((r) => r.body.trim()),
    };
    if (!payload.name || payload.messages.length === 0) {
      setError("Name and at least one message required");
      setSaving(false);
      return;
    }
    try {
      if (selectedId) {
        await api(`/templates/${selectedId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const res = await api<{ template: ProcedureTemplate }>("/templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSelectedId(res.template.id);
      }
      await refreshTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-brand-700">Templates</h2>
      {!canEditTemplates && (
        <p className="mt-1 text-sm text-amber-700">
          Guest accounts can view templates only.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm font-medium">Procedure name</label>
          <select
            className="mt-1 block min-w-[200px] rounded border border-slate-300 px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              if (!e.target.value) setName("");
            }}
          >
            <option value="">— New template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium">Or type name</label>
          <input
            disabled={!canEditTemplates}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Procedure name"
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="pb-2 pr-2">Message</th>
              <th className="pb-2 px-1 w-14">Weeks</th>
              <th className="pb-2 px-1 w-14">Days</th>
              <th className="pb-2 px-1 w-14">Hours</th>
              <th className="pb-2 px-1 w-14">Min</th>
              <th className="pb-2 px-1 w-14">Sec</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  <input
                    disabled={!canEditTemplates}
                    className="w-full rounded border border-slate-300 px-2 py-1"
                    placeholder="Message text"
                    value={row.body}
                    onChange={(e) => updateRow(i, "body", e.target.value)}
                  />
                </td>
                {(["weeks", "days", "hours", "minutes", "seconds"] as const).map(
                  (f) => (
                    <td key={f} className="px-1 py-2">
                      <input
                        type="number"
                        min={0}
                        disabled={!canEditTemplates}
                        className="w-14 rounded border border-slate-300 px-1 py-1 text-center"
                        value={row[f]}
                        onChange={(e) => updateRow(i, f, e.target.value)}
                      />
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEditTemplates && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => setRows((r) => [...r, emptyRow()])}
          >
            Add message
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Save
          </button>
          {selectedId && (
            <button
              type="button"
              className="rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50"
              onClick={async () => {
                if (
                  !confirm(
                    "Delete this procedure template? Active campaigns using it will also be removed."
                  )
                ) {
                  return;
                }
                try {
                  await deleteTemplate(selectedId);
                  setSelectedId("");
                  setName("");
                  setRows(Array.from({ length: 5 }, emptyRow));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Delete failed");
                }
              }}
            >
              Delete template
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
