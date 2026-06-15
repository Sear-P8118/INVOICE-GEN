// True during Sami's birthday window: 15 June 00:00:00 → 16 June 23:59:59,
// in Australia/Perth time, every year. Independent of the device's own time zone.
export function isBirthdayWindow(now: Date = new Date()): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Perth',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(now);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return month === 6 && (day === 15 || day === 16);
  } catch {
    return false; // never block the app if Intl/timezone lookup fails
  }
}
