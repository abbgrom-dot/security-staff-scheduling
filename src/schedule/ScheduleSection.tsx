import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { iso, ruMonth, ruWeekday, shiftHours } from "@/schedule/scheduleUtils";
import ObjectDayBoard from "@/schedule/ObjectDayBoard";

export function Schedule() {
  const { schedule, locations, can } = useApp();
  const editable = can("schedule:edit");

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(iso(today));
  const [locId, setLocId] = useState<number | null>(locations[0]?.id ?? null);

  // если объекты подгрузились позже — выбираем первый
  if (locId === null && locations.length > 0) setLocId(locations[0].id);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Пн = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));

  // Смены выбранного объекта по датам
  const locSchedule = schedule.filter(s => s.kind !== "off" && (locId === null || s.locationId === locId));

  const selDate = new Date(selected);
  const selShifts = locSchedule.filter(s => s.date === selected);
  const selHours = selShifts.reduce((sum, s) => sum + shiftHours(s.shift), 0);
  const selExtra = selShifts.filter(s => s.isExtra).length;

  if (locations.length === 0) return (
    <div className="section-enter text-center py-20">
      <Icon name="MapPin" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-muted-foreground">Сначала добавьте объекты в разделе «Объекты»</p>
    </div>
  );

  return (
    <div className="section-enter space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">График дежурств</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Выберите объект и дату — расставьте сотрудников по постам
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center">
            <Icon name="ChevronLeft" size={18} className="text-foreground" />
          </button>
          <div className="min-w-[150px] text-center font-semibold text-foreground capitalize">
            {ruMonth(cursor)} {year}
          </div>
          <button onClick={() => move(1)} className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-muted flex items-center justify-center">
            <Icon name="ChevronRight" size={18} className="text-foreground" />
          </button>
        </div>
      </div>

      {/* Выбор объекта — быстрые вкладки */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {locations.map(l => {
          const cnt = schedule.filter(s => s.locationId === l.id && s.date === selected && s.kind !== "off").length;
          const act = l.id === locId;
          return (
            <button
              key={l.id}
              onClick={() => setLocId(l.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm whitespace-nowrap transition-all
                ${act ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
            >
              <Icon name="Building2" size={14} className={act ? "text-primary" : ""} />
              {l.name}
              {cnt > 0 && (
                <span className={`text-[10px] font-mono px-1.5 rounded-full ${act ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5 items-start">
        {/* Календарь */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-semibold uppercase py-1 ${i >= 5 ? "text-red-400/70" : "text-muted-foreground"}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <div key={i} />;
              const dIso = iso(date);
              const cnt = locSchedule.filter(s => s.date === dIso).length;
              const isToday = dIso === iso(today);
              const isSel = dIso === selected;
              const weekend = i % 7 >= 5;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dIso)}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all
                    ${isSel ? "border-primary bg-primary/15" : "border-border bg-muted/30 hover:bg-muted/60"}`}
                >
                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : weekend ? "text-red-400/80" : "text-foreground"}`}>
                    {date.getDate()}
                  </span>
                  {cnt > 0
                    ? <span className="text-[9px] font-mono text-emerald-400">{cnt}</span>
                    : <span className="w-1 h-1 rounded-full bg-border" />}
                </button>
              );
            })}
          </div>

          {/* Итоги дня */}
          <div className="mt-4 pt-3 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{ruWeekday(selDate)}</p>
            <p className="font-bold text-foreground capitalize">
              {selDate.getDate()} {ruMonth(selDate)} {selDate.getFullYear()}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center rounded-lg bg-muted/40 py-1.5">
                <div className="text-sm font-bold font-mono text-emerald-400">{selShifts.length}</div>
                <div className="text-[9px] text-muted-foreground">смен</div>
              </div>
              <div className="text-center rounded-lg bg-muted/40 py-1.5">
                <div className="text-sm font-bold font-mono text-foreground">{selHours}ч</div>
                <div className="text-[9px] text-muted-foreground">часов</div>
              </div>
              <div className="text-center rounded-lg bg-muted/40 py-1.5">
                <div className="text-sm font-bold font-mono text-purple-400">{selExtra}</div>
                <div className="text-[9px] text-muted-foreground">подраб.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Доска объекта на день */}
        {locId !== null && (
          <ObjectDayBoard date={selected} locationId={locId} editable={editable} />
        )}
      </div>
    </div>
  );
}
