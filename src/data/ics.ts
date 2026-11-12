import type { Alarm } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Texto con escapes y líneas plegadas a 75 caracteres, como pide el formato iCalendar. */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

/**
 * Un evento diario por alarma, con aviso a la hora exacta. Las horas son locales (sin zona),
 * así el teléfono las toma en su hora y sigue sonando con la app cerrada.
 */
export function buildIcs(alarms: Alarm[], date: string, stamp = new Date()): string {
  const d = date.replace(/-/g, '');
  const now = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trazo//Alarmas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Trazo'];
  for (const a of alarms.filter((x) => x.on)) {
    const [h, m] = a.time.split(':').map(Number);
    const end = h * 60 + m + 10;
    lines.push(
      'BEGIN:VEVENT',
      `UID:trazo-${a.id}@personal-tracker`,
      `DTSTAMP:${now}`,
      `DTSTART:${d}T${pad(h)}${pad(m)}00`,
      `DTEND:${d}T${pad(Math.floor(end / 60) % 24)}${pad(end % 60)}00`,
      'RRULE:FREQ=DAILY',
      `SUMMARY:${esc(a.title)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(a.title)}`,
      'TRIGGER:PT0S',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
