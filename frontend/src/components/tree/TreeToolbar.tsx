"use client";

type Props = {
  onExpandAll: () => void;
  onCollapseAll: () => void;
};

export function TreeToolbar({ onExpandAll, onCollapseAll }: Props) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2 border-b border-slate-100 px-3 py-1.5">
      <button
        type="button"
        onClick={onExpandAll}
        className="text-xs text-brand-600 hover:text-brand-800 hover:underline"
      >
        Expand all
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={onCollapseAll}
        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
      >
        Collapse all
      </button>
    </div>
  );
}
