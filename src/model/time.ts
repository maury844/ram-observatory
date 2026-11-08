/** Fractional UTC hour of day, 0 ≤ h < 24. */
export const utcHours = (d: Date): number =>
  d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;

export const SF_TIME_ZONE = 'America/Los_Angeles';

// Constructing Intl.DateTimeFormat is expensive (~tens of µs); the envelope calls this 144×
// per recompute, so build it once. hourCycle h23 avoids engines that print midnight as "24".
const sfFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SF_TIME_ZONE,
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

/** Wall-clock time in San Francisco (DST-aware, via the IANA tz database). */
export function sfClock(d: Date): { hour: number; minute: number } {
  let hour = 0;
  let minute = 0;
  for (const p of sfFormatter.formatToParts(d)) {
    if (p.type === 'hour') hour = Number(p.value) % 24;
    else if (p.type === 'minute') minute = Number(p.value);
  }
  return { hour, minute };
}

export const sfHour = (d: Date): number => sfClock(d).hour;

/** The Chief RAM Officer sleeps 23:00–06:00 San Francisco time. */
export function isSFNight(d: Date): boolean {
  const h = sfHour(d);
  return h >= 23 || h < 6;
}

/** Start of the UTC day containing d. */
export function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
