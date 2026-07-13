import { useState } from "react";
import { useNow, fmtTime } from "@/hooks/useNow";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { empStatusLabel } from "@/app/modals";
import { parseShiftHours } from "@/sections/helpers";
import { EmployeeModal, EmployeeDeleteModal } from "@/employees/EmployeeModal";
import EmployeeSalaryCard from "@/employees/EmployeeSalaryCard";

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

