import { addDays, format, parseISO, startOfDay } from "date-fns";

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface SwimClassException {
  original_date: string;
  status: string;
  new_date: string | null;
  new_start_time: string | null;
  new_end_time: string | null;
  reason: string | null;
}

export interface SwimClassLike {
  id: string;
  title?: string | null;
  program?: string | null;
  coach_name?: string | null;
  pool_name?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date?: string | null;
  exceptions?: SwimClassException[] | null;
}

export interface Occurrence {
  classId: string;
  className: string;
  program: string | null;
  coach: string | null;
  pool: string | null;
  date: string;
  originalDate: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "cancelled" | "rescheduled";
  reason: string | null;
}

export const formatTime = (t?: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
};

/** Expand recurring weekly classes into dated occurrences, applying cancellations and reschedules. */
export function expandClassOccurrences(
  classes: SwimClassLike[],
  from: Date,
  to: Date,
): Occurrence[] {
  const out: Occurrence[] = [];
  const start = startOfDay(from);
  const end = startOfDay(to);

  for (const cl of classes) {
    const classStart = startOfDay(parseISO(cl.start_date));
    const classEnd = cl.end_date ? startOfDay(parseISO(cl.end_date)) : null;
    const exceptions = cl.exceptions ?? [];

    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      if (d < classStart) continue;
      if (classEnd && d > classEnd) continue;
      if (d.getDay() !== cl.day_of_week) continue;

      const dateStr = format(d, "yyyy-MM-dd");
      const ex = exceptions.find((e) => e.original_date === dateStr);

      const base: Occurrence = {
        classId: cl.id,
        className: cl.title || cl.program || "Swimming Class",
        program: cl.program ?? null,
        coach: cl.coach_name ?? null,
        pool: cl.pool_name ?? null,
        date: dateStr,
        originalDate: dateStr,
        startTime: cl.start_time,
        endTime: cl.end_time,
        status: "scheduled",
        reason: null,
      };

      if (!ex) {
        out.push(base);
        continue;
      }

      if (ex.status === "cancelled") {
        out.push({ ...base, status: "cancelled", reason: ex.reason ?? null });
        continue;
      }

      out.push({
        ...base,
        status: "rescheduled",
        date: ex.new_date ?? dateStr,
        startTime: ex.new_start_time ?? cl.start_time,
        endTime: ex.new_end_time ?? cl.end_time,
        reason: ex.reason ?? null,
      });
    }
  }

  return out.sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date),
  );
}

const icsStamp = (date: string, time: string) =>
  `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;

export function buildIcs(occurrences: Occurrence[], childName: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Asatheer Sports Academy//Swimming//EN",
    "CALSCALE:GREGORIAN",
  ];

  occurrences
    .filter((o) => o.status !== "cancelled")
    .forEach((o, i) => {
      lines.push(
        "BEGIN:VEVENT",
        `UID:${o.classId}-${o.date}-${i}@asatheer`,
        `DTSTART:${icsStamp(o.date, o.startTime)}`,
        `DTEND:${icsStamp(o.date, o.endTime)}`,
        `SUMMARY:Swimming - ${childName}`,
        `DESCRIPTION:${[o.program, o.coach && `Coach ${o.coach}`, o.pool]
          .filter(Boolean)
          .join(" / ")}`,
        `LOCATION:${o.pool || "Asatheer Sports Academy"}`,
        "END:VEVENT",
      );
    });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(occurrences: Occurrence[], childName: string) {
  const blob = new Blob([buildIcs(occurrences, childName)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${childName.replace(/\s+/g, "-").toLowerCase()}-swimming.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildWhatsAppMessage(
  childName: string,
  programName: string | null,
  link: string,
) {
  return [
    "🏊 *Asatheer Swimming Academy*",
    "",
    "Hello, your child's swimming schedule is now available.",
    "",
    `👦 Child: ${childName}`,
    `🏊 Program: ${programName || "Swimming"}`,
    "",
    "📅 View the swimming calendar:",
    link,
    "",
    "You can use this link anytime to check upcoming classes and schedule updates.",
    "",
    "Thank you,",
    "*Asatheer Sports Academy*",
  ].join("\n");
}

export function whatsAppUrl(phone: string | null | undefined, message: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
