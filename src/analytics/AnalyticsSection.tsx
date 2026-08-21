import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { fmt } from "@/app/shared";
import { parseShiftHours } from "@/sections/helpers";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Analytics() {
  const { posts, employees, locations, fines, schedule } = useApp();
  const [days, setDays] = useState(7);

  // Диапазон: последние N дней, включая сегодня
  const today = new Date();
  const range: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    range.push(d);
  }
  const from = iso(range[0]);
  const to = iso(range[range.length - 1]);
  const inRange = (dt: string) => dt >= from && dt <= to;

  // ── Факт: закрытые смены за период ────────────────────────────────────────
  const closed = posts.filter(p => p.actualHours !== null && p.closedAt !== null && inRange(p.closedAt.slice(0, 10)));
  const hoursFact = closed.reduce((s, p) => s + (p.actualHours ?? 0), 0);

  // ── План: смены из графика за период ──────────────────────────────────────
  const planned = schedule.filter(s => s.kind !== "off" && inRange(s.date));
  const hoursPlan = planned.reduce((s, e) => s + parseShiftHours(e.shift), 0);
  const extraCount = planned.filter(s => s.isExtra).length;

  // ── Явка: подтверждённые из назначенных ───────────────────────────────────
  const assigned = posts.filter(p => p.officerId !== null);
  const confirmed = assigned.filter(p => p.confirmedAt !== null);
  const attendance = assigned.length > 0 ? Math.round((confirmed.length / assigned.length) * 100) : 0;

  // ── Покрытие постов сейчас ────────────────────────────────────────────────
  const coverage = posts.length > 0
    ? Math.round((posts.filter(p => p.status === "covered").length / posts.length) * 100)
    : 0;

  // ── Штрафы за период ──────────────────────────────────────────────────────
  const periodFines = fines.filter(f => inRange(f.date));
  const finesSum = periodFines.reduce((s, f) => s + f.amount, 0);

  const kpis = [
    { label: "Часов отработано", value: `${hoursFact}ч`, sub: `план ${hoursPlan}ч`, icon: "Timer", c: "text-primary" },
    { label: "Средняя явка", value: `${attendance}%`, sub: `${confirmed.length} из ${assigned.length}`, icon: "ClipboardCheck", c: attendance >= 90 ? "text-emerald-400" : "text-amber-400" },
    { label: "Покрытие постов", value: `${coverage}%`, sub: `${posts.filter(p => p.status === "covered").length} из ${posts.length}`, icon: "ShieldCheck", c: coverage >= 90 ? "text-emerald-400" : "text-amber-400" },
    { label: "Штрафы", value: fmt(finesSum), sub: `${periodFines.length} шт`, icon: "BadgeAlert", c: finesSum > 0 ? "text-red-400" : "text-muted-foreground" },
  ];

  // ── График: смены по дням (план из графика) ───────────────────────────────
  const byDay = range.map(d => {
    const key = iso(d);
    const list = schedule.filter(s => s.date === key && s.kind !== "off");
    return {
      key,
      label: d.toLocaleDateString("ru-RU", { weekday: "short" }),
      num: d.getDate(),
      day: list.filter(s => s.kind === "day").length,
      night: list.filter(s => s.kind === "night").length,
    };
  });
  const maxBar = Math.max(1, ...byDay.map(b => b.day + b.night));

  // ── По объектам ───────────────────────────────────────────────────────────
  const byLoc = locations.map(l => {
    const lp = posts.filter(p => p.locationId === l.id);
    const cov = lp.filter(p => p.status === "covered").length;
    const plan = planned.filter(s => s.locationId === l.id);
    const hrs = plan.reduce((s, e) => s + parseShiftHours(e.shift), 0);
    return { l, total: lp.length, cov, shifts: plan.length, hrs };
  }).sort((a, b) => b.hrs - a.hrs);

  const hasData = posts.length > 0 || schedule.length > 0 || employees.length > 0;

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Аналитика</h2>
          <p className="text-muted-foreground text-sm mt-1">Статистика смен по данным системы</p>
        </div>
        <div className="flex gap-1.5">
          {[7, 14, 30].map(n => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                ${days === n ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {n} дней
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Icon name="ChartColumn" size={36} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">Пока нет данных для анализа</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Добавьте объекты, сотрудников и заполните график</p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={k.icon} size={14} className={k.c} />
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${k.c}`}>{k.value}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Смены по дням */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h3 className="font-semibold text-foreground">Смены по дням</h3>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary/50" /><span className="text-muted-foreground">День</span></span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-500/50" /><span className="text-muted-foreground">Ночь</span></span>
                <span className="text-purple-300">подработок: {extraCount}</span>
              </div>
            </div>
            <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height: "160px" }}>
              {byDay.map(b => (
                <div key={b.key} className="flex-1 min-w-[26px] flex flex-col items-center gap-1 h-full">
                  <div className="w-full flex flex-col-reverse gap-0.5 flex-1 justify-start">
                    {b.day > 0 && (
                      <div className="w-full rounded-t bg-primary/50 flex items-start justify-center" style={{ height: `${(b.day / maxBar) * 100}%` }}>
                        <span className="text-[9px] font-mono text-primary-foreground/90 mt-0.5">{b.day}</span>
                      </div>
                    )}
                    {b.night > 0 && (
                      <div className="w-full rounded-t bg-indigo-500/50 flex items-start justify-center" style={{ height: `${(b.night / maxBar) * 100}%` }}>
                        <span className="text-[9px] font-mono text-white/90 mt-0.5">{b.night}</span>
                      </div>
                    )}
                    {b.day + b.night === 0 && <div className="w-full h-0.5 rounded bg-border" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{b.num}</span>
                  <span className="text-[9px] text-muted-foreground/60">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* По объектам */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">Нагрузка по объектам</h3>
            {byLoc.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Нет объектов</p>
            ) : (
              <div className="space-y-2.5">
                {byLoc.map(({ l, total, cov, shifts, hrs }) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <div className="w-32 sm:w-44 min-w-0">
                      <p className="text-sm text-foreground truncate">{l.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cov}/{total} постов закрыто</p>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60"
                        style={{ width: `${Math.min(100, (hrs / Math.max(1, byLoc[0].hrs)) * 100)}%` }}
                      />
                    </div>
                    <div className="text-right shrink-0 w-20">
                      <div className="text-sm font-mono font-semibold text-foreground">{hrs}ч</div>
                      <div className="text-[10px] text-muted-foreground">{shifts} смен</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
