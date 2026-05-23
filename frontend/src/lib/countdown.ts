export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Sending now…";
  const totalSec = Math.floor(ms / 1000);
  const weeks = Math.floor(totalSec / (7 * 24 * 3600));
  const days = Math.floor((totalSec % (7 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((totalSec % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts: string[] = [];
  if (weeks) parts.push(`${weeks}w`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}
