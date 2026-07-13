import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import {
  fmt, expiryDate, daysUntilExpiry, checkStatus, checkBadge,
  postBadge, type CheckStatus,
} from "@/app/shared";

export function Dashboard() {
  const { locations, employees, posts, fines, currentOrg } = useApp();
  const [showAllChecks, setShowAllChecks] = useState(false);
  const active = employees.filter(e => e.status === "active").length;
  const covered = posts.filter(p => p.status === "covered").length;
  const vacant = posts.filter(p => p.status === "vacant").length;
  const alertC = posts.filter(p => p.status === "alert").length;
  const finesTotal = fines.reduce((s, f) => s + f.amount, 0);
  return (
    <div className="section-enter space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-border p-8 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">06 мая 2026</p>
          <h1 className="text-3xl font-bold text-foreground mb-1">{currentOrg?.shortName ?? "SecureOps"}</h1>
          <p className="text-muted-foreground">{currentOrg?.name ?? "Система управления охраной"} · {locations.length} объектов</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5"><Icon name="Shield" size={160} /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "На смене", value: active, icon: "UserCheck", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Постов закрыто", value: covered, icon: "ShieldCheck", color: "text-primary", bg: "bg-primary/10" },
          { label: "Вакантных", value: vacant, icon: "ShieldOff", color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Тревоги", value: alertC, icon: "AlertTriangle", color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Штрафы", value: fmt(finesTotal), icon: "BadgeAlert", color: "text-rose-400", bg: "bg-rose-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.color} /></div>
            <div className={`text-2xl font-bold font-mono ${s.color} mb-1 truncate`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-foreground">Тревоги и вакансии</h3><Icon name="Bell" size={16} className="text-muted-foreground" /></div>
          {posts.filter(p => p.status !== "covered").length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">Все посты закрыты</p>
            : <div className="space-y-2">{posts.filter(p => p.status !== "covered").map(p => {
              const loc = locations.find(l => l.id === p.locationId);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div><p className="text-sm font-medium text-foreground">{p.name}</p><p className="text-xs text-muted-foreground">{loc?.name ?? "—"} · {p.time}</p></div>
                  {postBadge(p.status)}
                </div>
              );
            })}</div>
          }
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-foreground">Объекты</h3><Icon name="Building2" size={16} className="text-muted-foreground" /></div>
          <div className="space-y-2">
            {locations.map(loc => {
              const lp = posts.filter(p => p.locationId === loc.id);
              const cov = lp.filter(p => p.status === "covered").length;
              return (
                <div key={loc.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${lp.some(p => p.status === "alert") ? "bg-red-400" : cov === lp.length && lp.length > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{loc.name}</p><p className="text-xs text-muted-foreground truncate">{loc.address}</p></div>
                  <span className="text-xs font-mono text-muted-foreground">{cov}/{lp.length > 0 ? lp.length : loc.posts}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Виджет: проверки и комиссии ── */}
      {(() => {
        // Все сотрудники с проблемами: просрочено или истекает в ближайшие 30 дней
        type EmpCheckRow = {
          emp: typeof employees[0];
          periodicDays: number | null;
          periodicStatus: CheckStatus;
          medDays: number | null;
          medStatus: CheckStatus;
          worst: CheckStatus;
        };

        const rows: EmpCheckRow[] = employees
          .map(emp => {
            const periodicDays = daysUntilExpiry(emp.periodicCheckDate);
            const periodicStatus = checkStatus(emp.periodicCheckDate);
            const medDays = daysUntilExpiry(emp.medCheckDate);
            const medStatus = checkStatus(emp.medCheckDate);
            const statusPriority = (s: CheckStatus) =>
              s === "expired" ? 0 : s === "warning" ? 1 : s === "missing" ? 2 : 3;
            const worst: CheckStatus =
              statusPriority(periodicStatus) < statusPriority(medStatus) ? periodicStatus : medStatus;
            return { emp, periodicDays, periodicStatus, medDays, medStatus, worst };
          })
          .filter(r => r.worst !== "ok")
          .sort((a, b) => {
            const p = (s: CheckStatus) => s === "expired" ? 0 : s === "warning" ? 1 : 2;
            return p(a.worst) - p(b.worst);
          });

        if (rows.length === 0) return (
          <div className="bg-card border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Icon name="ShieldCheck" size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Проверки актуальны</p>
                <p className="text-xs text-muted-foreground">У всех сотрудников периодические проверки и медкомиссии в норме</p>
              </div>
            </div>
          </div>
        );

        const expired = rows.filter(r => r.worst === "expired").length;
        const warnings = rows.filter(r => r.worst === "warning").length;
        const missing = rows.filter(r => r.worst === "missing").length;
        const displayRows = showAllChecks ? rows : rows.slice(0, 5);

        return (
          <div className="bg-card border border-amber-500/20 rounded-xl overflow-hidden">
            {/* Заголовок */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Icon name="ClipboardCheck" size={20} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Проверки и комиссии — требуют внимания</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {expired > 0 && <span className="text-red-400 mr-3">● {expired} просрочено</span>}
                    {warnings > 0 && <span className="text-amber-400 mr-3">● {warnings} истекает скоро</span>}
                    {missing > 0 && <span className="text-muted-foreground">● {missing} не указано</span>}
                  </p>
                </div>
              </div>
              {rows.length > 5 && (
                <button
                  onClick={() => setShowAllChecks(v => !v)}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  {showAllChecks ? "Свернуть" : `Показать всех (${rows.length})`}
                </button>
              )}
            </div>

            {/* Таблица */}
            <div className="divide-y divide-border/50">
              {/* Шапка */}
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_160px_160px] gap-3 px-5 py-2 bg-muted/30">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Сотрудник</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">Период. проверка</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">Медкомиссия</p>
              </div>

              {displayRows.map(({ emp, periodicDays, periodicStatus, medDays, medStatus }) => {
                const pBadge = checkBadge(periodicStatus, periodicDays);
                const mBadge = checkBadge(medStatus, medDays);
                const pExp = expiryDate(emp.periodicCheckDate);
                const mExp = expiryDate(emp.medCheckDate);

                return (
                  <div
                    key={emp.id}
                    className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_160px_160px] gap-3 px-5 py-3 items-center hover:bg-muted/20 transition-colors"
                  >
                    {/* Сотрудник */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{emp.rank}</p>
                      </div>
                    </div>

                    {/* Периодическая проверка */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${pBadge.cls}`}>
                        {periodicStatus === "expired" ? "Просрочена" : periodicStatus === "missing" ? "Не указана" : `${periodicDays} дн.`}
                      </span>
                      {pExp && (
                        <span className="text-[9px] text-muted-foreground font-mono">
                          до {pExp.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </span>
                      )}
                    </div>

                    {/* Медкомиссия */}
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${mBadge.cls}`}>
                        {medStatus === "expired" ? "Просрочена" : medStatus === "missing" ? "Не указана" : `${medDays} дн.`}
                      </span>
                      {mExp && (
                        <span className="text-[9px] text-muted-foreground font-mono">
                          до {mExp.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

