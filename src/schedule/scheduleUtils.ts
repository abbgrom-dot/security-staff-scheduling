import type { ScheduleKind } from "@/types";

// ISO дата "YYYY-MM-DD" из объекта Date (по локальному времени)
export function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ruMonth(d: Date): string {
  return d.toLocaleDateString("ru-RU", { month: "long" });
}

export function ruWeekday(d: Date): string {
  return d.toLocaleDateString("ru-RU", { weekday: "long" });
}

export const KIND_META: Record<ScheduleKind, { label: string; dot: string; badge: string; short: string; shift: string }> = {
  day:   { label: "Дневная", dot: "bg-primary", badge: "bg-primary/20 text-primary border-primary/30", short: "Дн", shift: "08:00 – 20:00" },
  night: { label: "Ночная",  dot: "bg-indigo-500", badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", short: "Ноч", shift: "20:00 – 08:00" },
  off:   { label: "Выходной", dot: "bg-muted-foreground/40", badge: "bg-muted text-muted-foreground border-border", short: "Вых", shift: "Выходной" },
};
