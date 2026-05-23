export function offsetToMilliseconds(
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number
): number {
  return (
    weeks * 7 * 24 * 60 * 60 * 1000 +
    days * 24 * 60 * 60 * 1000 +
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000 +
    seconds * 1000
  );
}

export function computeSendAt(
  campaignStart: Date,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number
): Date {
  return new Date(
    campaignStart.getTime() +
      offsetToMilliseconds(weeks, days, hours, minutes, seconds)
  );
}
