// Minimal RFC 5545 iCalendar builder. Pure JS, no deps.

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  /** IANA zone, e.g. "America/New_York". Use "UTC" for floating UTC. */
  timezone: string;
  rrule?: string | null;
  url?: string | null;
};

const CRLF = "\r\n";

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** UTC stamp: 20260420T143000Z */
function formatUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Local stamp (no Z) for use with TZID parameter. */
function formatLocal(d: Date, timezone: string): string {
  // Get parts in target timezone via Intl
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  return `${parts.year}${parts.month}${parts.day}T${parts.hour === "24" ? "00" : parts.hour}${parts.minute}${parts.second}`;
}

/** Fold lines at 75 octets per RFC 5545. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join(CRLF);
}

/** Build a minimal VTIMEZONE block. We embed a generic block — clients use their
 * own zone DB when TZID matches an IANA zone, which is the common modern path. */
function vtimezone(tzid: string): string[] {
  if (tzid === "UTC") return [];
  return ["BEGIN:VTIMEZONE", `TZID:${tzid}`, "X-LIC-LOCATION:" + tzid, "END:VTIMEZONE"];
}

export function buildIcs(opts: {
  calName: string;
  calDescription?: string;
  events: IcsEvent[];
  /** Refresh hint in minutes. Apple/Outlook honor this. */
  refreshMinutes?: number;
}): string {
  const { calName, calDescription, events, refreshMinutes = 60 } = opts;
  const now = new Date();
  const dtstamp = formatUtc(now);

  const tzids = Array.from(
    new Set(events.map((e) => e.timezone).filter((tz) => tz && tz !== "UTC")),
  );

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SanctumIQ//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
    `NAME:${escapeText(calName)}`,
    ...(calDescription
      ? [`X-WR-CALDESC:${escapeText(calDescription)}`, `DESCRIPTION:${escapeText(calDescription)}`]
      : []),
    `REFRESH-INTERVAL;VALUE=DURATION:PT${refreshMinutes}M`,
    `X-PUBLISHED-TTL:PT${refreshMinutes}M`,
  ];

  tzids.forEach((tz) => lines.push(...vtimezone(tz)));

  for (const ev of events) {
    const isUtc = ev.timezone === "UTC";
    const dtStart = isUtc
      ? `DTSTART:${formatUtc(ev.startsAt)}`
      : `DTSTART;TZID=${ev.timezone}:${formatLocal(ev.startsAt, ev.timezone)}`;
    const dtEnd = isUtc
      ? `DTEND:${formatUtc(ev.endsAt)}`
      : `DTEND;TZID=${ev.timezone}:${formatLocal(ev.endsAt, ev.timezone)}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(dtStart);
    lines.push(dtEnd);
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.url) lines.push(`URL:${ev.url}`);
    if (ev.rrule) lines.push(`RRULE:${ev.rrule}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join(CRLF) + CRLF;
}
