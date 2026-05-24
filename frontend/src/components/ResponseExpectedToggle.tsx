"use client";

type Props = {
  checked: boolean;
  disabled?: boolean;
  /** When true, shows state only (no click handler required). */
  readOnly?: boolean;
  onChange?: (expectsResponse: boolean) => void;
  compact?: boolean;
};

/** Toggle whether the patient can reply to this outbound message. */
export function ResponseExpectedToggle({
  checked,
  disabled,
  readOnly,
  onChange,
  compact,
}: Props) {
  const size = compact ? "h-4 w-4" : "h-5 w-5";
  const inactive = disabled || readOnly || !onChange;

  return (
    <button
      type="button"
      role="checkbox"
      disabled={inactive}
      onClick={() => onChange?.(!checked)}
      title={
        checked
          ? "Patient can reply — uncheck to disable replies"
          : "Patient cannot reply — check to allow replies"
      }
      aria-checked={checked}
      aria-label={checked ? "Patient can respond" : "Patient cannot respond"}
      className={`shrink-0 rounded transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "text-brand-600 hover:text-brand-700"
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <rect x="4" y="4" width="16" height="16" rx="2" />
        {checked && (
          <path
            d="M8 12.5l2.5 2.5L16 9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
