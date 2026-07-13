import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import {
  expiryDate, daysUntilExpiry, checkStatus, checkBadge,
} from "@/app/shared";
import { parseShiftHours, calcSalary } from "@/sections/helpers";

export default function EmployeeSalaryCard({ employee, locations, onEdit, onClose }: {
  employee: import("@/types").Employee;
  locations: import("@/types").Location[];
  onEdit: () => void;
  onClose: () => void;
}) {
  const { posts, fines } = useApp();

  const loc = locations.find(l => employee.location.startsWith(l.name));
  const baseRate = loc?.hourlyRate ?? 0;
  const totalRate = baseRate + employee.seniorityBonus;
  const shiftHours = parseShiftHours(employee.shift);

  // ── Фактические данные из расстановок ────────────────────────────────────
  // Все посты этого сотрудника с подтверждёнными и закрытыми сменами
  const empPosts = posts.filter(p => p.officerId === employee.id);
  const closedPosts = empPosts.filter(p => p.actualHours !== null);
  const confirmedPosts = empPosts.filter(p => p.confirmedAt !== null && p.actualHours === null);
  const totalActualHours = closedPosts.reduce((s, p) => s + (p.actualHours ?? 0), 0);
  const actualEarned = totalActualHours * totalRate;

  // Штрафы сотрудника
  const empFines = fines.filter(f => f.employeeId === employee.id);
  const totalFinesAmt = empFines.reduce((s, f) => s + f.amount, 0);
  const netActual = Math.max(0, actualEarned - totalFinesAmt);

  const hasActualData = closedPosts.length > 0 || confirmedPosts.length > 0;

  // Configurable in card
  const [shiftsPerMonth, setShiftsPerMonth] = useState(15);
  const { perShift, perMonth } = calcSalary(totalRate, shiftHours, shiftsPerMonth);

  const fmtRub = (n: number) => n.toLocaleString("ru-RU") + " ₽";
  const initials = employee.name.split(" ").map(n => n[0]).join("").slice(0, 2);

  const badge = (s: "active" | "off" | "sick") =>
    s === "active" ? <span className="badge-active">На смене</span>
    : s === "sick"   ? <span className="badge-danger">Больничный</span>
    : <span className="badge-inactive">Выходной</span>;

  const hireYear = employee.hireDate ? new Date(employee.hireDate).getFullYear() : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card border border-border w-full sm:max-w-md max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl section-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-4 p-5 border-b border-border shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground leading-tight">{employee.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{employee.rank} · {employee.phone}</p>
            <div className="mt-1.5">{badge(employee.status)}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Info block ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Объект", val: loc?.name ?? "Не назначен", icon: "Building2" },
              { label: "График", val: employee.shift, icon: "Clock" },
              { label: "Стаж", val: `${employee.yearsExp} лет${employee.yearsExp >= 10 ? " 🏅" : ""}`, icon: "Award" },
              { label: "Принят", val: hireYear ? `${hireYear} г.` : "—", icon: "CalendarDays" },
            ].map(s => (
              <div key={s.label} className="flex items-start gap-2.5 p-3 bg-muted/40 rounded-xl">
                <Icon name={s.icon} size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm text-foreground font-medium truncate">{s.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Проверки и комиссии ── */}
          {(() => {
            const pDays = daysUntilExpiry(employee.periodicCheckDate);
            const pStatus = checkStatus(employee.periodicCheckDate);
            const mDays = daysUntilExpiry(employee.medCheckDate);
            const mStatus = checkStatus(employee.medCheckDate);
            const pExp = expiryDate(employee.periodicCheckDate);
            const mExp = expiryDate(employee.medCheckDate);
            const pBadge = checkBadge(pStatus, pDays);
            const mBadge = checkBadge(mStatus, mDays);
            const hasIssue = pStatus !== "ok" || mStatus !== "ok";

            return (
              <div className={`border rounded-xl overflow-hidden ${hasIssue ? "border-amber-500/30" : "border-border"}`}>
                <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${hasIssue ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30 border-border"}`}>
                  <Icon name="ClipboardCheck" size={13} className={hasIssue ? "text-amber-400" : "text-muted-foreground"} />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Проверки и комиссии</p>
                </div>
                <div className="divide-y divide-border/50">
                  {/* Периодическая проверка */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">Периодическая проверка</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {employee.periodicCheckDate
                          ? `Дата: ${new Date(employee.periodicCheckDate).toLocaleDateString("ru-RU")} · истекает ${pExp?.toLocaleDateString("ru-RU") ?? "—"}`
                          : "Дата не указана"}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${pBadge.cls}`}>
                      {pStatus === "expired" ? "Просрочена" : pStatus === "missing" ? "Не указана" : pStatus === "ok" ? `${pDays} дн.` : `${pDays} дн.`}
                    </span>
                  </div>
                  {/* Медкомиссия */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">Медицинская комиссия</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {employee.medCheckDate
                          ? `Дата: ${new Date(employee.medCheckDate).toLocaleDateString("ru-RU")} · истекает ${mExp?.toLocaleDateString("ru-RU") ?? "—"}`
                          : "Дата не указана"}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold shrink-0 ${mBadge.cls}`}>
                      {mStatus === "expired" ? "Просрочена" : mStatus === "missing" ? "Не указана" : `${mDays} дн.`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── Rate breakdown ── */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Ставка ₽/час</p>
            </div>
            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/60" />
                  <span className="text-sm text-muted-foreground">Тариф объекта</span>
                  {loc && <span className="text-[10px] text-muted-foreground">({loc.name})</span>}
                </div>
                <span className="text-sm font-mono text-foreground">{baseRate > 0 ? `${baseRate} ₽/ч` : "—"}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-muted-foreground">Надбавка за выслугу</span>
                </div>
                <span className="text-sm font-mono text-amber-400">
                  {employee.seniorityBonus > 0 ? `+${employee.seniorityBonus} ₽/ч` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-semibold text-foreground">Итоговая ставка</span>
                </div>
                <span className="text-base font-mono font-bold text-emerald-400">{totalRate > 0 ? `${totalRate} ₽/ч` : "—"}</span>
              </div>
            </div>
          </div>

          {/* ── Фактические данные из расстановок ── */}
          {hasActualData && (
            <div className="bg-card border border-emerald-500/20 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
                <Icon name="ClipboardCheck" size={14} className="text-emerald-400" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Факт из расстановок</p>
              </div>
              <div className="p-4 space-y-2">
                {/* Closed shifts */}
                {closedPosts.map(p => {
                  const pLoc = locations.find(l => l.id === p.locationId);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{pLoc?.name} · {p.actualStartTime ?? p.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-blue-400">{p.actualHours} ч</p>
                        <p className="text-[10px] text-muted-foreground">{fmtRub((p.actualHours ?? 0) * totalRate)}</p>
                      </div>
                    </div>
                  );
                })}
                {/* Confirmed but open shifts */}
                {confirmedPosts.map(p => {
                  const pLoc = locations.find(l => l.id === p.locationId);
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-emerald-500/5 rounded-lg px-3 py-2 border border-emerald-500/15">
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-emerald-400">{pLoc?.name} · Заступил: {p.actualStartTime}</p>
                      </div>
                      <span className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">Смена идёт</span>
                    </div>
                  );
                })}

                {/* Totals row */}
                {closedPosts.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Отработано часов</span>
                      <span className="font-mono font-semibold text-foreground">{totalActualHours} ч</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Начислено</span>
                      <span className="font-mono text-foreground">{fmtRub(actualEarned)}</span>
                    </div>
                    {totalFinesAmt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Icon name="BadgeAlert" size={12} className="text-red-400" />
                          Штрафы ({empFines.length} шт.)
                        </span>
                        <span className="font-mono text-red-400">−{fmtRub(totalFinesAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">К выплате</span>
                      <span className={`text-base font-mono font-bold ${netActual > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmtRub(netActual)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Salary calculator ── */}
          {totalRate > 0 && shiftHours > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                <Icon name="Calculator" size={14} className="text-primary" />
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Плановый расчёт</p>
              </div>

              <div className="p-4 space-y-4">
                {/* Shift hours display */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Часов в смене</span>
                  <span className="font-mono text-foreground font-semibold">{shiftHours} ч</span>
                </div>

                {/* Shifts per month slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Смен в месяц</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShiftsPerMonth(s => Math.max(1, s - 1))} className="w-6 h-6 rounded-lg bg-muted hover:bg-secondary flex items-center justify-center text-foreground transition-colors">
                        <Icon name="Minus" size={12} />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-foreground text-sm">{shiftsPerMonth}</span>
                      <button onClick={() => setShiftsPerMonth(s => Math.min(31, s + 1))} className="w-6 h-6 rounded-lg bg-muted hover:bg-secondary flex items-center justify-center text-foreground transition-colors">
                        <Icon name="Plus" size={12} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range" min={1} max={31} value={shiftsPerMonth}
                    onChange={e => setShiftsPerMonth(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>1</span><span>15</span><span>31</span>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground">За 1 смену ({shiftHours}ч × {totalRate}₽)</p>
                      <p className="text-base font-bold font-mono text-foreground mt-0.5">{fmtRub(perShift)}</p>
                    </div>
                    <Icon name="Sun" size={18} className="text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground">За месяц ({shiftsPerMonth} смен)</p>
                      <p className="text-xl font-bold font-mono text-primary mt-0.5">{fmtRub(perMonth)}</p>
                    </div>
                    <Icon name="Banknote" size={22} className="text-primary" />
                  </div>
                </div>

                {/* Annual estimate */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                  <span>Годовой фонд (оценочно)</span>
                  <span className="font-mono font-semibold text-foreground">{fmtRub(perMonth * 12)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {employee.note && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <Icon name="StickyNote" size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{employee.note}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 p-5 border-t border-border shrink-0">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <Icon name="Pencil" size={15} /> Редактировать
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

