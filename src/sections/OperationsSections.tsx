import { useState, useEffect } from "react";
import { useNow, fmtTime, fmtDuration, minutesSince } from "@/hooks/useNow";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { Location, Post } from "@/types";
import {
  TYPE_LABELS, TYPE_COLORS, fmt, expiryDate, daysUntilExpiry,
  checkStatus, checkBadge, inputCls, postBadge, type CheckStatus,
} from "@/app/shared";
import {
  LocationModal, DeleteModal, PostsManagerModal,
  AssignModal, FineReasonsModal,
} from "@/app/modals";
import { parseShiftHours } from "@/sections/helpers";

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

export function Objects() {
  const { locations, posts, addLocation, editLocation, deleteLocation, can } = useApp();
  const canEdit = can("objects:edit");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "posts" | null>(null);
  const [target, setTarget] = useState<Location | null>(null);
  const [search, setSearch] = useState("");
  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.address.toLowerCase().includes(search.toLowerCase()));
  const close = () => { setModal(null); setTarget(null); };
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-foreground">Объекты</h2><p className="text-muted-foreground text-sm mt-1">{locations.length} объектов</p></div>
        {canEdit && <button onClick={() => setModal("add")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0"><Icon name="Plus" size={16} /> Добавить</button>}
      </div>
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="X" size={14} /></button>}
      </div>
      {filtered.length === 0
        ? <div className="bg-card border border-border rounded-xl p-12 text-center"><Icon name="Building2" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground text-sm">{search ? "Ничего не найдено" : "Объекты не добавлены"}</p>{!search && canEdit && <button onClick={() => setModal("add")} className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Добавить первый</button>}</div>
        : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(loc => {
            const lp = posts.filter(p => p.locationId === loc.id);
            const cov = lp.filter(p => p.status === "covered").length;
            const hasAlert = lp.some(p => p.status === "alert");
            const pct = lp.length > 0 ? Math.round((cov / lp.length) * 100) : 0;
            return (
              <div key={loc.id} className={`bg-card border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 ${hasAlert ? "border-red-500/30" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3"><h3 className="font-bold text-foreground truncate">{loc.name}</h3><p className="text-xs text-muted-foreground mt-0.5 truncate">{loc.address}</p></div>
                  <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ${TYPE_COLORS[loc.type]}`}>{TYPE_LABELS[loc.type]}</span>
                </div>
                {hasAlert && <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-400"><Icon name="AlertTriangle" size={13} /> Пост в тревоге</div>}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Покрытие</span><span className="font-mono">{cov}/{lp.length}</span></div>
                  <div className="h-1.5 bg-muted rounded-full"><div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${lp.length > 0 ? pct : 0}%` }} /></div>
                </div>
                {loc.contact && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4"><Icon name="Phone" size={11} /> {loc.contact}</p>}
                {canEdit && (
                  <div className="flex gap-2 pt-3 border-t border-border/60">
                    <button onClick={() => { setTarget(loc); setModal("posts"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"><Icon name="MapPin" size={13} /> Посты</button>
                    <button onClick={() => { setTarget(loc); setModal("edit"); }} className="flex items-center justify-center px-3 py-2 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs font-medium transition-colors"><Icon name="Pencil" size={13} /></button>
                    <button onClick={() => { setTarget(loc); setModal("delete"); }} className="flex items-center justify-center px-3 py-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs transition-colors"><Icon name="Trash2" size={13} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      {modal === "add" && <LocationModal title="Новый объект" initial={null} onSave={d => { addLocation(d); close(); }} onClose={close} />}
      {modal === "edit" && target && <LocationModal title={`Редактировать — ${target.name}`} initial={target} onSave={d => { editLocation(target.id, d); close(); }} onClose={close} />}
      {modal === "delete" && target && <DeleteModal name={target.name} onConfirm={() => { deleteLocation(target.id); close(); }} onClose={close} />}
      {modal === "posts" && target && <PostsManagerModal location={target} onClose={close} />}
    </div>
  );
}

// ─── Confirm Post Modal ───────────────────────────────────────────────────────
function ConfirmPostModal({ post, operatorName, onConfirm, onClose }: {
  post: Post;
  operatorName: string;
  onConfirm: (actualStartTime: string, confirmedBy: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [startTime, setStartTime] = useState(defaultTime);
  const [operator, setOperator] = useState(operatorName);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Icon name="ClipboardCheck" size={22} className="text-emerald-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1">Подтверждение заступления</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Пост: <span className="text-foreground font-medium">{post.name}</span> · {post.time}
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Фактическое время заступления</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Оператор (подтверждающий)</label>
            <input
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => { onConfirm(startTime, operator); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Подтвердить заступление
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Close Post Modal ─────────────────────────────────────────────────────────
function ClosePostModal({ post, onClose: onModalClose, onConfirm }: {
  post: Post;
  onClose: () => void;
  onConfirm: (hours: number, note: string, fine: Omit<import("@/types").FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;
}) {
  const { fineReasons } = useApp();
  const expectedHours = parseShiftHours(post.time);
  const [hours, setHours] = useState(expectedHours > 0 ? expectedHours : 12);
  const [note, setNote] = useState("");
  const [withFine, setWithFine] = useState(false);
  const [reasonId, setReasonId] = useState<number>(fineReasons[0]?.id ?? 1);
  const [fineAmt, setFineAmt] = useState<number>(fineReasons[0]?.amount ?? 500);
  const [fineNote, setFineNote] = useState("");

  const handleReason = (id: number) => {
    setReasonId(id);
    const r = fineReasons.find(r => r.id === id);
    if (r) setFineAmt(r.amount);
  };

  const handleSubmit = () => {
    const fine = withFine && post.officerId ? {
      employeeId: post.officerId,
      reasonId,
      note: fineNote,
      amount: fineAmt,
    } : null;
    onConfirm(hours, note, fine);
    onModalClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onModalClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md section-enter space-y-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name="Timer" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Закрытие смены</h3>
            <p className="text-xs text-muted-foreground">
              {post.name}
              {post.actualStartTime && <> · Заступил: <span className="font-mono">{post.actualStartTime}</span></>}
            </p>
          </div>
        </div>

        {/* Часы */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Фактически отработано часов</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setHours(h => Math.max(0.5, h - 0.5))} className="w-9 h-9 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center text-foreground">
              <Icon name="Minus" size={14} />
            </button>
            <input
              type="number" min={0.5} max={24} step={0.5}
              value={hours}
              onChange={e => setHours(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold text-foreground focus:outline-none focus:border-primary/50"
            />
            <button onClick={() => setHours(h => Math.min(24, h + 0.5))} className="w-9 h-9 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center text-foreground">
              <Icon name="Plus" size={14} />
            </button>
          </div>
          {expectedHours > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              По графику: <span className="font-mono">{expectedHours} ч</span>
              {hours < expectedHours && <span className="text-amber-400 ml-2">↓ {(expectedHours - hours).toFixed(1)} ч недоработка</span>}
              {hours > expectedHours && <span className="text-emerald-400 ml-2">↑ {(hours - expectedHours).toFixed(1)} ч сверхурочно</span>}
            </p>
          )}
        </div>

        {/* Причина закрытия */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Причина закрытия (необязательно)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Комментарий к закрытию смены..."
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Штраф */}
        {post.officerId && (
          <div className={`rounded-xl border transition-all ${withFine ? "border-red-500/30 bg-red-500/5 p-3 space-y-3" : "border-border/40 bg-muted/20 p-3"}`}>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setWithFine(v => !v)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${withFine ? "bg-red-500 border-red-500" : "border-border"}`}
              >
                {withFine && <Icon name="Check" size={10} className="text-white" />}
              </div>
              <span className="text-sm text-foreground font-medium">Применить штраф к сотруднику</span>
            </label>

            {withFine && (
              <div className="space-y-2.5">
                {/* Причина штрафа */}
                {fineReasons.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Причина штрафа</label>
                    <div className="flex flex-wrap gap-1.5">
                      {fineReasons.map(r => (
                        <button key={r.id} onClick={() => handleReason(r.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${reasonId === r.id ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Сумма */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Сумма штрафа, ₽</label>
                  <input
                    type="number" min={0} step={100}
                    value={fineAmt}
                    onChange={e => setFineAmt(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-red-500/50"
                  />
                </div>
                {/* Комментарий штрафа */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Комментарий</label>
                  <input
                    type="text"
                    value={fineNote}
                    onChange={e => setFineNote(e.target.value)}
                    placeholder="Пояснение к штрафу..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Закрыть смену
          </button>
          <button onClick={onModalClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

export function Placements() {
  const { locations, posts, employees, assignPost, confirmPost, closePost, can, session } = useApp();
  const canEdit = can("placements:edit");
  const now = useNow(60_000); // обновляется каждую минуту
  const [assignPost2, setAssignPost2] = useState<Post | null>(null);
  const [confirmingPost, setConfirmingPost] = useState<Post | null>(null);
  const [closingPost, setClosingPost] = useState<Post | null>(null);
  const [fineSettings, setFineSettings] = useState(false);

  const operatorName = session?.user.name ?? "Оператор";

  // Автозакрытие смены по расписанию объекта
  useEffect(() => {
    const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    posts.forEach(p => {
      // Только подтверждённые, ещё не закрытые посты
      if (p.confirmedAt === null || p.actualHours !== null) return;
      // Парсим время окончания смены из post.time (формат "HH:MM – HH:MM")
      const m = p.time.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
      if (!m) return;
      const endTime = `${m[3]}:${m[4]}`;
      // Если текущее время >= времени окончания
      if (nowStr >= endTime) {
        const expectedHours = parseShiftHours(p.time);
        closePost(p.id, expectedHours > 0 ? expectedHours : 12, "auto", "Закрыто автоматически по расписанию", null);
      }
    });
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary stats
  const confirmed = posts.filter(p => p.confirmedAt !== null).length;
  const covered = posts.filter(p => p.status === "covered").length;
  const pending = covered - confirmed;

  if (locations.length === 0) return (
    <div className="section-enter text-center py-20">
      <Icon name="MapPin" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-muted-foreground">Добавьте объекты в разделе «Объекты»</p>
    </div>
  );

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Расстановки</h2>
          <p className="text-muted-foreground text-sm mt-1">Назначение и подтверждение заступления на посты</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Живые часы */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-mono font-semibold text-foreground">{fmtTime(now)}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">сейчас</span>
          </div>
          {canEdit && (
            <button onClick={() => setFineSettings(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors">
              <Icon name="Settings2" size={15} /> Причины штрафов
            </button>
          )}
        </div>
      </div>

      {/* Confirmation summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Постов назначено", val: covered, icon: "UserCheck", c: "text-primary", bg: "bg-primary/10" },
          { label: "Подтверждено", val: confirmed, icon: "ClipboardCheck", c: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Ожидают подтверждения", val: pending, icon: "Clock", c: pending > 0 ? "text-amber-400" : "text-muted-foreground", bg: pending > 0 ? "bg-amber-500/10" : "bg-muted/40" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <Icon name={s.icon} size={18} className={s.c} />
            </div>
            <div>
              <div className={`text-xl font-bold font-mono ${s.c}`}>{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Location groups */}
      {locations.map(loc => {
        const lp = posts.filter(p => p.locationId === loc.id);
        const locConfirmed = lp.filter(p => p.confirmedAt !== null).length;
        return (
          <div key={loc.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Icon name="Building2" size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">{loc.name}</h3>
              <span className="text-xs text-muted-foreground font-mono ml-1">
                {lp.filter(p => p.status === "covered").length}/{lp.length} закрыто
              </span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full border font-mono
                 border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                {locConfirmed}/{lp.filter(p => p.status === "covered").length} подтверждено
              </span>
            </div>

            {lp.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Посты не назначены</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lp.map(post => {
                  const emp = employees.find(e => e.id === post.officerId);
                  const isConfirmed = post.confirmedAt !== null;
                  const isClosed = post.actualHours !== null;

                  return (
                    <div
                      key={post.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isClosed         ? "border-blue-500/20 bg-blue-500/5" :
                        isConfirmed      ? "border-emerald-500/30 bg-emerald-500/8" :
                        post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5" :
                        post.status === "alert"   ? "border-red-500/30 bg-red-500/5" :
                                                    "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      {/* Post header */}
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="font-medium text-sm text-foreground">{post.name}</span>
                        {isClosed
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">Закрыта</span>
                          : isConfirmed
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                              <Icon name="CheckCircle2" size={9} />Подтверждён
                            </span>
                          : postBadge(post.status)
                        }
                      </div>

                      {/* Schedule time */}
                      <p className="text-xs text-muted-foreground font-mono mb-2">{post.time}</p>

                      {/* Employee row */}
                      {emp ? (
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-xs text-foreground truncate">{emp.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mb-2.5">
                          <Icon name="UserX" size={11} /> Не назначен
                        </p>
                      )}

                      {/* Confirmation details */}
                      {isConfirmed && (
                        <div className="mb-2.5 space-y-0.5">
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Icon name="Clock" size={9} />
                            Заступил: <span className="font-mono font-semibold">{post.actualStartTime}</span>
                            {post.confirmedAt && !isClosed && (
                              <span className="text-muted-foreground ml-1">
                                ({fmtDuration(minutesSince(post.confirmedAt))} на посту)
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Icon name="User" size={9} />
                            Оператор: {post.confirmedBy}
                          </p>
                          {isClosed && (
                            <>
                              <p className="text-[10px] text-blue-400 flex items-center gap-1">
                                <Icon name="Timer" size={9} />
                                Отработано: <span className="font-mono font-semibold">{post.actualHours} ч</span>
                                {post.closeReason === "auto" && <span className="text-muted-foreground/70">(авто)</span>}
                                {post.closeReason === "manual" && <span className="text-muted-foreground/70">(вручную)</span>}
                              </p>
                              {post.closeNote && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Icon name="MessageSquare" size={9} />
                                  {post.closeNote}
                                </p>
                              )}
                            </>
                          )}
                          {/* Подработка */}
                          {post.isExtraShift && (
                            <p className="text-[10px] text-purple-400 flex items-center gap-1">
                              <Icon name="Star" size={9} />
                              Подработка
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {canEdit && (
                        <div className="flex gap-1.5 mt-1">
                          {/* Assign/Replace */}
                          {!isConfirmed && (
                            <button
                              onClick={() => setAssignPost2(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Icon name="UserCog" size={11} />
                              {emp ? "Заменить" : "Назначить"}
                            </button>
                          )}

                          {/* Confirm button — only if assigned and not confirmed */}
                          {emp && !isConfirmed && (
                            <button
                              onClick={() => setConfirmingPost(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs text-emerald-400 font-medium transition-all"
                            >
                              <Icon name="ClipboardCheck" size={11} />
                              Подтвердить
                            </button>
                          )}

                          {/* Close shift — only if confirmed and not closed */}
                          {isConfirmed && !isClosed && (
                            <button
                              onClick={() => setClosingPost(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-xs text-primary font-medium transition-all"
                            >
                              <Icon name="Timer" size={11} />
                              Закрыть смену
                            </button>
                          )}

                          {/* Re-assign after close */}
                          {isClosed && (
                            <button
                              onClick={() => setAssignPost2(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Icon name="RefreshCw" size={11} />
                              Новая смена
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {assignPost2 && (
        <AssignModal post={assignPost2} onAssign={assignPost} onClose={() => setAssignPost2(null)} />
      )}
      {confirmingPost && (
        <ConfirmPostModal
          post={confirmingPost}
          operatorName={operatorName}
          onConfirm={(t, by) => confirmPost(confirmingPost.id, t, by)}
          onClose={() => setConfirmingPost(null)}
        />
      )}
      {closingPost && (
        <ClosePostModal
          post={closingPost}
          onConfirm={(h, note, fine) => closePost(closingPost.id, h, "manual", note, fine)}
          onClose={() => setClosingPost(null)}
        />
      )}
      {fineSettings && <FineReasonsModal onClose={() => setFineSettings(false)} />}
    </div>
  );
}

// ─── Employee Modal ───────────────────────────────────────────────────────────
