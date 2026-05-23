"use client";

type Props = {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  hasChildren: boolean;
};

export function TreeChevron({ expanded, onToggle, label, hasChildren }: Props) {
  if (!hasChildren) {
    return <span className="inline-block w-5 shrink-0" aria-hidden />;
  }

  return (
    <button
      type="button"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-expanded={expanded}
      aria-label={expanded ? `Hide ${label}` : `Show ${label}`}
    >
      <svg
        viewBox="0 0 16 16"
        className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 4l4 4-4 4V4z" />
      </svg>
    </button>
  );
}
