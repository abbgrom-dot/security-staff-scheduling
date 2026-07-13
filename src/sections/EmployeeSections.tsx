import { useState } from "react";
import { useNow, fmtTime } from "@/hooks/useNow";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { exportFinesPDF, exportFinesExcel, type FinesReportData } from "@/lib/export";
import {
  fmt, expiryDate, daysUntilExpiry, checkStatus, checkBadge,
  fmtDate, inputCls, Field,
} from "@/app/shared";
import { empStatusLabel } from "@/app/modals";
import { parseShiftHours, calcSalary } from "@/sections/helpers";

type EmpForm = Omit<import("@/types").Employee, "id" | "orgId">;

const EMPTY_EMP: EmpForm = {
  name: "", rank: "Охранник", status: "active", location: "—",
  shift: "08:00 – 20:00", phone: "", hireDate: "", yearsExp: 0, seniorityBonus: 0, note: "",
  extraShiftRate: 1.5,
  periodicCheckDate: "", medCheckDate: "",
};

function EmployeeModal({ initial, onSave, onClose, title }: {
  initial: EmpForm | null;
  onSave: (d: EmpForm) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState<EmpForm>(initial ?? EMPTY_EMP);
  const set = <K extends keyof EmpForm>(k: K, v: EmpForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ФИО + Должность */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Полное имя" req>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Фамилия Имя Отчество" className={inputCls} />
            </Field>
            <Field label="Должность">
              <select value={form.rank} onChange={e => set("rank", e.target.value)} className={inputCls}>
                {["Охранник", "Ст. охранник", "Руководитель группы", "Стажёр"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          {/* Статус + Телефон */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Статус">
              <select value={form.status} onChange={e => set("status", e.target.value as EmpForm["status"])} className={inputCls}>
                <option value="active">На смене</option>
                <option value="extra">Подработка (выходной)</option>
                <option value="off">Выходной</option>
                <option value="sick">Больничный</option>
              </select>
            </Field>
            <Field label="Телефон">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} />
            </Field>
          </div>

          {/* Ставка подработки — показываем если extra или off */}
          {(form.status === "extra" || form.status === "off") && (
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="Star" size={14} className="text-purple-400" />
                <p className="text-sm font-semibold text-foreground">Коэффициент подработки</p>
              </div>
              <div className="flex items-center gap-3">
                <Field label="Коэффициент оплаты">
                  <select
                    value={form.extraShiftRate}
                    onChange={e => set("extraShiftRate", parseFloat(e.target.value))}
                    className={inputCls}
                  >
                    <option value={1.0}>×1.0 — стандартная ставка</option>
                    <option value={1.25}>×1.25 — +25%</option>
                    <option value={1.5}>×1.5 — полтора (стандарт ТК)</option>
                    <option value={2.0}>×2.0 — двойная ставка</option>
                  </select>
                </Field>
              </div>
              <p className="text-[10px] text-muted-foreground">
                При назначении на пост в выходной применяется этот коэффициент к тарифу объекта + надбавке
              </p>
            </div>
          )}

          {/* Смена + Локация */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="График смены">
              <select value={form.shift} onChange={e => set("shift", e.target.value)} className={inputCls}>
                {["08:00 – 20:00", "20:00 – 08:00", "Выходной", "Больничный", "Отпуск"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Текущий объект">
              <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Объект А — Главный вход" className={inputCls} />
            </Field>
          </div>

          {/* Дата приёма + Стаж */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Дата приёма на работу">
              <input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Стаж в охране, лет">
              <input type="number" min={0} max={50} value={form.yearsExp} onChange={e => set("yearsExp", parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>

          {/* Надбавка */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="TrendingUp" size={15} className="text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Надбавка за выслугу лет</p>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <Field label="Надбавка, ₽/час">
                <input type="number" min={0} step={5} value={form.seniorityBonus} onChange={e => set("seniorityBonus", parseInt(e.target.value) || 0)} className={inputCls} />
              </Field>
              <div className="pb-2.5 text-xs text-muted-foreground">
                {form.yearsExp >= 10 && <span className="text-emerald-400">≥ 10 лет: рекомендуется +40–50 ₽/ч</span>}
                {form.yearsExp >= 5 && form.yearsExp < 10 && <span className="text-primary">5–9 лет: рекомендуется +20–35 ₽/ч</span>}
                {form.yearsExp > 0 && form.yearsExp < 5 && <span className="text-muted-foreground">1–4 лет: рекомендуется +10–20 ₽/ч</span>}
                {form.yearsExp === 0 && <span className="text-muted-foreground">Стаж не указан</span>}
              </div>
            </div>
          </div>

          {/* Периодическая проверка и медкомиссия */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="ClipboardCheck" size={14} className="text-blue-400" />
              <p className="text-sm font-semibold text-foreground">Проверки и комиссии (действуют 1 год)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Периодическая проверка">
                <input
                  type="date"
                  value={form.periodicCheckDate}
                  onChange={e => set("periodicCheckDate", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Медицинская комиссия">
                <input
                  type="date"
                  value={form.medCheckDate}
                  onChange={e => set("medCheckDate", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Указывайте дату последнего прохождения. Система автоматически рассчитает дату истечения (+1 год) и выдаст предупреждение за 30 дней.
            </p>
          </div>

          {/* Примечание */}
          <Field label="Примечание">
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Дополнительная информация..." />
          </Field>
        </div>

        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Сохранить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

function EmployeeDeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Icon name="UserX" size={22} className="text-red-400" /></div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить сотрудника?</h3>
        <p className="text-sm text-muted-foreground mb-6">«{name}» будет удалён из базы. Это действие нельзя отменить.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Employees Section ────────────────────────────────────────────────────────
// ─── Employee Salary Card ─────────────────────────────────────────────────────
function EmployeeSalaryCard({ employee, locations, onEdit, onClose }: {
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

// ─── Employees Section ────────────────────────────────────────────────────────
export function Employees() {
  const { employees, addEmployee, editEmployee, deleteEmployee, locations, posts, fines, can } = useApp();
  const canEdit = can("employees:edit");
  const now = useNow(60_000);

  const [filter, setFilter] = useState<"all" | "active" | "off" | "sick" | "extra">("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "card" | null>(null);
  const [target, setTarget] = useState<import("@/types").Employee | null>(null);
  const close = () => { setModal(null); setTarget(null); };

  const filtered = employees
    .filter(e => filter === "all" || e.status === filter)
    .filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.rank.toLowerCase().includes(search.toLowerCase()));

  const badge = (s: import("@/types").Employee["status"]) => {
    const info = empStatusLabel(s);
    return <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${info.cls}`}>{info.text}</span>;
  };

  const getEffectiveRate = (e: import("@/types").Employee) => {
    const loc = locations.find(l => e.location.startsWith(l.name));
    const base = loc?.hourlyRate ?? 0;
    return { base, bonus: e.seniorityBonus, total: base + e.seniorityBonus };
  };

  const counts = {
    all: employees.length,
    active: employees.filter(e => e.status === "active").length,
    off: employees.filter(e => e.status === "off").length,
    sick: employees.filter(e => e.status === "sick").length,
    extra: employees.filter(e => e.status === "extra").length,
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Сотрудники</h2>
          <p className="text-muted-foreground text-sm mt-1">{employees.length} охранников в базе</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Живые часы */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-mono font-semibold text-foreground">{fmtTime(now)}</span>
          </div>
          {canEdit && (
            <button onClick={() => { setTarget(null); setModal("add"); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">
              <Icon name="UserPlus" size={16} /> Добавить
            </button>
          )}
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-1.5 flex-wrap">
          {([
            ["all", "Все"],
            ["active", "На смене"],
            ["extra", "Подработка"],
            ["off", "Выходной"],
            ["sick", "Больничный"],
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${filter === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {l}
              <span className={`text-[10px] font-mono px-1 py-0.5 rounded-full ${filter === k ? "bg-white/20 text-white" : "bg-background/60 text-muted-foreground"}`}>{counts[k]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени..." className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="X" size={13} /></button>}
        </div>
      </div>

      {/* ── ФОТ summary ── */}
      {employees.length > 0 && (() => {
        const SHIFTS = 15;
        const fmtR = (n: number) => n.toLocaleString("ru-RU") + " ₽";

        // Плановый ФОТ
        const planAll = employees.map(e => {
          const r = getEffectiveRate(e);
          return r.total * parseShiftHours(e.shift) * SHIFTS;
        });
        const fotPlan = planAll.reduce((s, v) => s + v, 0);

        // Фактический ФОТ из закрытых смен
        const closedPosts = posts.filter(p => p.actualHours !== null && p.officerId !== null);
        const fotActual = closedPosts.reduce((s, p) => {
          const emp = employees.find(e => e.id === p.officerId);
          if (!emp) return s;
          const rate = getEffectiveRate(emp).total;
          return s + (p.actualHours ?? 0) * rate;
        }, 0);
        const actualHoursTotal = closedPosts.reduce((s, p) => s + (p.actualHours ?? 0), 0);

        // Штрафы
        const totalFinesDeduction = fines.reduce((s, f) => s + f.amount, 0);
        const fotNet = Math.max(0, fotActual - totalFinesDeduction);

        // Среднее
        const avgRate = employees.filter(e => getEffectiveRate(e).total > 0);
        const avgRateVal = avgRate.length > 0
          ? Math.round(avgRate.reduce((s, e) => s + getEffectiveRate(e).total, 0) / avgRate.length)
          : 0;

        const hasActual = fotActual > 0;

        return (
          <div className="space-y-3">
            {/* Плановые */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "ФОТ план/мес", val: fmtR(fotPlan), sub: `${employees.length} чел. × ${SHIFTS} смен`, icon: "Banknote", c: "text-primary", bg: "bg-primary/10" },
                { label: "Средняя ставка", val: avgRateVal > 0 ? `${avgRateVal} ₽/ч` : "—", sub: "тариф + надбавка", icon: "TrendingUp", c: "text-amber-400", bg: "bg-amber-500/10" },
                { label: "Фактически начислено", val: hasActual ? fmtR(fotActual) : "—", sub: hasActual ? `${actualHoursTotal} ч из расстановок` : "Нет закрытых смен", icon: "ClipboardCheck", c: hasActual ? "text-blue-400" : "text-muted-foreground", bg: hasActual ? "bg-blue-500/10" : "bg-muted/40" },
                { label: "К выплате (факт − штрафы)", val: hasActual ? fmtR(fotNet) : "—", sub: hasActual ? (totalFinesDeduction > 0 ? `−${fmtR(totalFinesDeduction)} штрафы` : "Штрафов нет") : "Нет данных", icon: "Wallet", c: hasActual ? "text-emerald-400" : "text-muted-foreground", bg: hasActual ? "bg-emerald-500/10" : "bg-muted/40" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2.5`}>
                    <Icon name={s.icon} size={18} className={s.c} />
                  </div>
                  <div className={`text-lg font-bold font-mono ${s.c} leading-tight`}>{s.val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Расшифровка фактического ФОТ по сотрудникам */}
            {hasActual && (
              <div className="bg-card border border-emerald-500/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
                  <Icon name="ClipboardList" size={14} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Фактический ФОТ по сотрудникам</p>
                  <span className="ml-auto text-[10px] text-muted-foreground font-mono">из подтверждённых расстановок</span>
                </div>
                <div className="divide-y divide-border/50">
                  {employees
                    .map(emp => {
                      const empPosts = closedPosts.filter(p => p.officerId === emp.id);
                      if (empPosts.length === 0) return null;
                      const rate = getEffectiveRate(emp).total;
                      const hours = empPosts.reduce((s, p) => s + (p.actualHours ?? 0), 0);
                      const earned = hours * rate;
                      const empFinesTotal = fines.filter(f => f.employeeId === emp.id).reduce((s, f) => s + f.amount, 0);
                      const net = Math.max(0, earned - empFinesTotal);
                      return (
                        <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{hours} ч × {rate} ₽/ч{empFinesTotal > 0 ? ` − ${fmtR(empFinesTotal)} штрафы` : ""}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {empFinesTotal > 0 && <p className="text-xs font-mono text-muted-foreground line-through">{fmtR(earned)}</p>}
                            <p className="text-sm font-mono font-bold text-emerald-400">{fmtR(net)}</p>
                          </div>
                        </div>
                      );
                    })
                    .filter(Boolean)
                  }
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Icon name={filter === "extra" ? "Star" : "Users"} size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">
            {search
              ? "Ничего не найдено"
              : filter === "extra"
              ? "Сотрудников на подработке нет. Назначьте выходного сотрудника на пост — его статус изменится автоматически"
              : "Нет сотрудников в этой категории"}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-border">
                  {["Сотрудник", "Должность", "Статус", "Стаж", "Тариф объекта", "Надбавка", "Итого ₽/ч", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const rate = getEffectiveRate(e);
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => { setTarget(e); setModal("card"); }}
                    >
                      {/* Имя */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{e.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{e.location}</p>
                          </div>
                        </div>
                      </td>
                      {/* Должность */}
                      <td className="px-4 py-3.5 text-sm text-muted-foreground">{e.rank}</td>
                      {/* Статус */}
                      <td className="px-4 py-3.5">{badge(e.status)}</td>
                      {/* Стаж */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono text-foreground">{e.yearsExp}</span>
                          <span className="text-xs text-muted-foreground">лет</span>
                          {e.yearsExp >= 10 && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">Ветеран</span>}
                        </div>
                      </td>
                      {/* Тариф объекта */}
                      <td className="px-4 py-3.5">
                        {rate.base > 0
                          ? <span className="text-sm font-mono text-foreground">{rate.base} ₽/ч</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Надбавка */}
                      <td className="px-4 py-3.5">
                        {e.seniorityBonus > 0
                          ? <span className="text-sm font-mono text-amber-400">+{e.seniorityBonus} ₽/ч</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Итого */}
                      <td className="px-4 py-3.5">
                        {rate.total > 0
                          ? <span className="text-sm font-mono font-semibold text-emerald-400">{rate.total} ₽/ч</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={ev => ev.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setTarget(e); setModal("card"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Карточка и расчёт зарплаты">
                            <Icon name="Calculator" size={14} />
                          </button>
                          {canEdit && <>
                            <button onClick={() => { setTarget(e); setModal("edit"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Icon name="Pencil" size={14} />
                            </button>
                            <button onClick={() => { setTarget(e); setModal("delete"); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                              <Icon name="Trash2" size={14} />
                            </button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* ── Footer: totals ── */}
              {(() => {
                const SHIFTS_DEFAULT = 15;
                const fmtR = (n: number) => n.toLocaleString("ru-RU") + " ₽";
                if (filtered.length === 0) return null;
                const totals = filtered.reduce((acc, e) => {
                  const r = getEffectiveRate(e);
                  const hrs = parseShiftHours(e.shift);
                  // фактические часы из закрытых постов
                  const empClosed = posts.filter(p => p.officerId === e.id && p.actualHours !== null);
                  const actualH = empClosed.reduce((s, p) => s + (p.actualHours ?? 0), 0);
                  const actualEarned = actualH * r.total;
                  const empFinesAmt = fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0);
                  return {
                    base: acc.base + r.base,
                    bonus: acc.bonus + r.bonus,
                    planFot: acc.planFot + r.total * hrs * SHIFTS_DEFAULT,
                    actualHours: acc.actualHours + actualH,
                    actualNet: acc.actualNet + Math.max(0, actualEarned - empFinesAmt),
                  };
                }, { base: 0, bonus: 0, planFot: 0, actualHours: 0, actualNet: 0 });
                const hasActual = totals.actualHours > 0;
                return (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40">
                      <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {filtered.length} чел.
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {totals.base > 0 ? `∅ ${Math.round(totals.base / filtered.length)} ₽/ч` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-amber-400">
                        {totals.bonus > 0 ? `+∅${Math.round(totals.bonus / filtered.length)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-muted-foreground">план: {fmtR(totals.planFot)}</div>
                        {hasActual && <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">факт: {fmtR(totals.actualNet)}</div>}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" /> Тариф — базовая ставка объекта</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Надбавка за выслугу лет</div>
        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Итого = тариф + надбавка</div>
      </div>

      {/* Modals */}
      {modal === "card" && target && (
        <EmployeeSalaryCard
          employee={target}
          locations={locations}
          onEdit={() => setModal("edit")}
          onClose={close}
        />
      )}
      {modal === "add" && (
        <EmployeeModal title="Новый сотрудник" initial={null} onSave={d => { addEmployee(d); close(); }} onClose={close} />
      )}
      {modal === "edit" && target && (
        <EmployeeModal title={`Редактировать — ${target.name}`} initial={target} onSave={d => { editEmployee(target.id, d); close(); }} onClose={close} />
      )}
      {modal === "delete" && target && (
        <EmployeeDeleteModal name={target.name} onConfirm={() => { deleteEmployee(target.id); close(); }} onClose={close} />
      )}
    </div>
  );
}

export function Fines() {
  const { fines, employees, posts, locations, fineReasons, currentOrg, holding } = useApp();
  const [filterEmp, setFilterEmp] = useState<number | "all">("all");
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportMenu, setExportMenu] = useState(false);

  const filtered = filterEmp === "all" ? fines : fines.filter(f => f.employeeId === filterEmp);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const totalAll = fines.reduce((s, f) => s + f.amount, 0);
  const byEmp = employees
    .map(e => ({ e, total: fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0), cnt: fines.filter(f => f.employeeId === e.id).length }))
    .filter(x => x.cnt > 0)
    .sort((a, b) => b.total - a.total);

  const buildFinesData = (): FinesReportData => {
    const filterLabel = filterEmp === "all"
      ? "Все сотрудники"
      : employees.find(e => e.id === filterEmp)?.name ?? "—";

    const rows = sorted.map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      const post = posts.find(p => p.id === f.postId);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      const reason = fineReasons.find(r => r.id === f.reasonId);
      return {
        date: fmtDate(f.date),
        employeeName: emp?.name ?? "—",
        rank: emp?.rank ?? "—",
        postName: post?.name ?? "—",
        locationName: loc?.name ?? "—",
        reasonLabel: reason?.label ?? "—",
        note: f.note,
        amount: f.amount,
      };
    });

    const byEmployee = byEmp
      .filter(x => filterEmp === "all" || x.e.id === filterEmp)
      .map(x => ({ name: x.e.name, rank: x.e.rank, count: x.cnt, total: x.total }));

    return {
      orgName: currentOrg?.name ?? "—",
      orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name,
      generatedAt: new Date().toLocaleDateString("ru-RU"),
      filterLabel,
      rows,
      byEmployee,
      totalAmount: sorted.reduce((s, f) => s + f.amount, 0),
      totalCount: sorted.length,
    };
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    setExportMenu(false);
    await new Promise(r => setTimeout(r, 80));
    const data = buildFinesData();
    if (format === "pdf") exportFinesPDF(data);
    else exportFinesExcel(data);
    setExporting(null);
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Штрафы</h2>
          <p className="text-muted-foreground text-sm mt-1">История нарушений</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenu(v => !v)}
            disabled={!!exporting || fines.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {exporting
              ? <><Icon name="Loader2" size={15} className="animate-spin" /> Генерация...</>
              : <><Icon name="Download" size={15} /> Экспорт <Icon name="ChevronDown" size={12} /></>
            }
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 w-44">
              <button onClick={() => handleExport("pdf")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0"><Icon name="FileText" size={14} className="text-red-400" /></div>
                <div><p className="text-sm font-medium text-foreground">PDF</p><p className="text-[10px] text-muted-foreground">Готовый документ</p></div>
              </button>
              <div className="h-px bg-border mx-3" />
              <button onClick={() => handleExport("xlsx")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Icon name="Table" size={14} className="text-emerald-400" /></div>
                <div><p className="text-sm font-medium text-foreground">Excel</p><p className="text-[10px] text-muted-foreground">3 листа с данными</p></div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ label: "Всего нарушений", val: fines.length, icon: "BadgeAlert", c: "text-red-400", bg: "bg-red-500/10" }, { label: "Сумма штрафов", val: fmt(totalAll), icon: "CircleDollarSign", c: "text-amber-400", bg: "bg-amber-500/10" }, { label: "Нарушителей", val: byEmp.length, icon: "Users", c: "text-primary", bg: "bg-primary/10" }].map(s => (
          <div key={s.label} className="stat-card"><div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.c} /></div><div className={`text-2xl font-bold font-mono ${s.c} mb-1`}>{s.val}</div><div className="text-sm text-muted-foreground">{s.label}</div></div>
        ))}
      </div>

      {byEmp.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Топ нарушителей</h3>
          <div className="space-y-2">{byEmp.map((x, i) => (
            <div key={x.e.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">{x.e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{x.e.name}</p><p className="text-xs text-muted-foreground">{x.cnt} нарушений</p></div>
              <span className="text-sm font-mono font-semibold text-red-400">{fmt(x.total)}</span>
            </div>
          ))}</div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
          <h3 className="font-semibold text-foreground mr-2">История</h3>
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none">
            <option value="all">Все сотрудники</option>
            {employees.filter(e => fines.some(f => f.employeeId === e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{sorted.length} записей</span>
        </div>
        {sorted.length === 0 ? <div className="py-12 text-center"><Icon name="CheckCircle2" size={36} className="text-emerald-400 mx-auto mb-3 opacity-60" /><p className="text-sm text-muted-foreground">Нарушений не зафиксировано</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-border">{["Дата", "Сотрудник", "Пост / Объект", "Причина", "Примечание", "Штраф"].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead>
            <tbody>{sorted.map(f => {
              const emp = employees.find(e => e.id === f.employeeId);
              const post = posts.find(p => p.id === f.postId);
              const loc = post ? locations.find(l => l.id === post.locationId) : null;
              const reason = fineReasons.find(r => r.id === f.reasonId);
              return (
                <tr key={f.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{fmtDate(f.date)}</td>
                  <td className="px-5 py-4">{emp ? <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><span className="text-sm text-foreground">{emp.name}</span></div> : <span className="text-sm text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-4"><p className="text-sm text-foreground">{post?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{loc?.name ?? "—"}</p></td>
                  <td className="px-5 py-4">{reason ? <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${reason.color}`}>{reason.label}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground max-w-[140px] truncate">{f.note || "—"}</td>
                  <td className="px-5 py-4 text-sm font-mono font-semibold text-red-400 whitespace-nowrap">{fmt(f.amount)}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr className="border-t border-border bg-muted/30"><td colSpan={5} className="px-5 py-3 text-sm font-semibold text-foreground text-right">Итого:</td><td className="px-5 py-3 text-sm font-mono font-bold text-red-400">{fmt(sorted.reduce((s, f) => s + f.amount, 0))}</td></tr></tfoot>
          </table></div>
        )}
      </div>
    </div>
  );
}

export function Schedule() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const sched: Record<string, (string | null)[]> = {
    "Иванов С.А.": ["Дн", "Дн", null, null, "Дн", "Дн", null],
    "Петров А.В.": ["Дн", null, "Дн", "Дн", null, null, "Дн"],
    "Смирнова Е.К.": ["Ноч", "Ноч", null, null, "Ноч", null, null],
    "Козлов Д.И.": [null, null, "Дн", "Дн", null, "Дн", "Дн"],
    "Николаева И.Р.": ["Дн", "Дн", "Дн", null, null, null, "Дн"],
    "Волков П.С.": [null, null, null, null, null, null, null],
    "Морозов А.Г.": ["Дн", null, null, "Дн", "Дн", "Дн", null],
    "Фёдорова Н.В.": ["Ноч", null, "Ноч", "Ноч", null, null, "Ноч"],
  };
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">График смен</h2><p className="text-muted-foreground text-sm mt-1">5 — 11 мая 2026</p></div>
      <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[600px]">
        <thead><tr className="border-b border-border"><th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">Сотрудник</th>
          {days.map((d, i) => <th key={d} className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 ${i === 2 ? "text-primary" : "text-muted-foreground"}`}>{d}{i === 2 && <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}</th>)}
        </tr></thead>
        <tbody>{Object.entries(sched).map(([name, shifts]) => (
          <tr key={name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{name}</td>
            {shifts.map((s, ci) => <td key={ci} className="px-2 py-3 text-center">
              {s === "Дн" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-primary/20 text-primary text-xs font-mono font-semibold">Дн</span>}
              {s === "Ноч" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">Ноч</span>}
              {s === null && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-muted/50"><span className="w-1.5 h-1.5 rounded-full bg-border" /></span>}
            </td>)}
          </tr>
        ))}</tbody>
      </table></div></div>
    </div>
  );
}

