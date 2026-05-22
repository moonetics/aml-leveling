export function getDateKeyInTimezone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function isSameDateInTimezone(date: Date | null | undefined, now: Date, timezone: string): boolean {
  if (!date) {
    return false;
  }

  return getDateKeyInTimezone(date, timezone) === getDateKeyInTimezone(now, timezone);
}

