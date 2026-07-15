import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { KIND_META, iso, ruMonth, ruWeekday } from "@/schedule/scheduleUtils";
import DayPlanner from "@/schedule/DayPlanner";

export function Schedule() {
  const { schedule, employees, can } = useApp();
  const editable = can("schedule:edit");

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(iso(today));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Строим сетку месяца (недели с Пн)
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Пн=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));

  // Сводка по дню
  const dayEntries = (dateIso: string) => schedule.filter(s => s.date === dateIso);

  const selEntries = dayEntries(selected);
  const working = selEntries.filter(s => s.kind !== "off");
  const offDay = selEntries.filter(s => s.kind === "off");

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">График дежурств</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Планирование смен и выходных по датам — основа для расстановок
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center">
            <Icon name="ChevronLeft" size={18} className="text-foreground" />
          </button>
          <div className="min-w-[160px] text-center font-semibold text-foreground capitalize">
            {ruMonth(cursor)} {year}
          </div>
          <button onClick={() => move(1)} className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center">
            <Icon name="ChevronRight" size={18} className="text-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
        {/* Календарь */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-semibold uppercase tracking-wider py-1 ${i >= 5 ? "text-red-400/70" : "text-muted-foreground"}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const dIso = iso(date);
              const ents = dayEntries(dIso);
              const work = ents.filter(e => e.kind !== "off").length;
              const off = ents.filter(e => e.kind === "off").length;
              const isToday = dIso === iso(today);
              const isSel = dIso === selected;
              const weekend = i % 7 >= 5;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dIso)}
                  className={`aspect-square rounded-xl border p-1.5 flex flex-col items-start transition-all
                    ${isSel ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/60"}`}
                >
                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : weekend ? "text-red-400/80" : "text-foreground"}`}>
                    {date.getDate()}
                    {isToday && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />}
                  </span>
                  <div className="mt-auto flex flex-wrap gap-0.5">
                    {work > 0 && <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-400">{work}</span>}
                    {off > 0 && <span className="text-[9px] font-mono px-1 rounded bg-muted text-muted-foreground">{off}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Легенда */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border flex-wrap">
            {(Object.keys(KIND_META) as (keyof typeof KIND_META)[]).map(k => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded ${KIND_META[k].dot}`} />
                <span className="text-[11px] text-muted-foreground">{KIND_META[k].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Панель дня */}
        <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{ruWeekday(new Date(selected))}</p>
            <h3 className="font-bold text-foreground capitalize">
              {new Date(selected).getDate()} {ruMonth(new Date(selected))} {new Date(selected).getFullYear()}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-emerald-400 font-mono">{working.length} в смене</span>
              <span className="text-muted-foreground font-mono">{offDay.length} выходной</span>
              <span className="text-muted-foreground/60 font-mono">{employees.length - selEntries.length} без плана</span>
            </div>
          </div>

          <DayPlanner date={selected} editable={editable} />
        </div>
      </div>
    </div>
  );
}
