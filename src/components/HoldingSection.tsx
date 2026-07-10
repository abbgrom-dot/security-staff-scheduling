import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Organization } from "@/types";
import Icon from "@/components/ui/icon";
import ConsolidatedReport from "@/components/ConsolidatedReport";
import { fmt } from "@/components/holding/shared";
import { OrgModal, DeleteOrgModal } from "@/components/holding/OrgModals";
import { OrgDetail } from "@/components/holding/OrgDetail";
import { HoldingModal } from "@/components/holding/HoldingModal";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HoldingSection({ onSwitchOrg }: { onSwitchOrg: (orgId: number) => void }) {
  const {
    holding, editHolding, orgs, addOrg, editOrg, deleteOrg,
    allLocations, allEmployees, allPosts, allFines,
    users,
  } = useApp();

  const [tab, setTab] = useState<"orgs" | "report">("orgs");
  const [holdingModal, setHoldingModal] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "detail" | null>(null);
  const [target, setTarget] = useState<Organization | null>(null);
  const close = () => { setModal(null); setTarget(null); };

  // Consolidated KPIs across all orgs
  const totalLocs = allLocations.length;
  const totalEmps = allEmployees.length;
  const totalPosts = allPosts.length;
  const coveredPosts = allPosts.filter(p => p.status === "covered").length;
  const alertPosts = allPosts.filter(p => p.status === "alert").length;
  const totalFines = allFines.reduce((s, f) => s + f.amount, 0);
  const totalUsers = users.length;
  const activeEmps = allEmployees.filter(e => e.status === "active").length;

  // Coverage % per org for mini-bar
  const orgStats = orgs.map(org => {
    const locs = allLocations.filter(l => l.orgId === org.id);
    const emps = allEmployees.filter(e => e.orgId === org.id);
    const posts = allPosts.filter(p => p.orgId === org.id);
    const fines = allFines.filter(f => f.orgId === org.id);
    const covered = posts.filter(p => p.status === "covered").length;
    const alert = posts.filter(p => p.status === "alert").length;
    const pct = posts.length > 0 ? Math.round((covered / posts.length) * 100) : 0;
    return { org, locs: locs.length, emps: emps.length, posts: posts.length, covered, alert, pct, finesTotal: fines.reduce((s, f) => s + f.amount, 0), finesCnt: fines.length };
  });

  // Fines by org chart data
  const maxFines = Math.max(...orgStats.map(s => s.finesTotal), 1);

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          {holding.logo
            ? <img src={holding.logo} alt="Логотип" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
            : <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Icon name="Building" size={22} className="text-primary" /></div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground truncate">{holding.name}</h2>
              <button onClick={() => setHoldingModal(true)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" title="Редактировать холдинг">
                <Icon name="Pencil" size={15} />
              </button>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">ИНН {holding.inn}</p>
          </div>
        </div>
        {tab === "orgs" && (
          <button
            onClick={() => { setTarget(null); setModal("add"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0"
          >
            <Icon name="Plus" size={16} /> Добавить организацию
          </button>
        )}
      </div>

      {holdingModal && <HoldingModal holding={holding} onSave={d => { editHolding(d); setHoldingModal(false); }} onClose={() => setHoldingModal(false)} />}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {[
          { key: "orgs",   label: "Организации",  icon: "Building2" },
          { key: "report", label: "Сводный отчёт", icon: "BarChart3" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "orgs" | "report")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all
              ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Report tab ── */}
      {tab === "report" && <ConsolidatedReport />}

      {/* ── Orgs tab ── */}
      {tab === "orgs" && <>

      {/* Consolidated KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {[
          { label: "Организаций",    val: orgs.length,    icon: "Building2",        c: "text-primary",     bg: "bg-primary/10" },
          { label: "Объектов",       val: totalLocs,      icon: "MapPin",           c: "text-indigo-400",  bg: "bg-indigo-500/10" },
          { label: "Охранников",     val: totalEmps,      icon: "Users",            c: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Пользователей",  val: totalUsers,     icon: "UserCog",          c: "text-cyan-400",    bg: "bg-cyan-500/10" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.c} /></div>
            <div className={`text-3xl font-bold font-mono ${s.c} mb-1`}>{s.val}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Operational summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Посты по всем объектам</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold font-mono text-foreground">{coveredPosts}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {totalPosts}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden flex gap-0.5">
            <div className="h-full bg-emerald-500" style={{ width: `${totalPosts > 0 ? (coveredPosts / totalPosts) * 100 : 0}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${totalPosts > 0 ? (alertPosts / totalPosts) * 100 : 0}%` }} />
          </div>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span><span className="text-emerald-400 font-mono">{coveredPosts}</span> закрыты</span>
            <span><span className="text-red-400 font-mono">{alertPosts}</span> тревога</span>
            <span><span className="text-amber-400 font-mono">{totalPosts - coveredPosts - alertPosts}</span> вакантны</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Персонал на смене</p>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold font-mono text-emerald-400">{activeEmps}</span>
            <span className="text-sm text-muted-foreground mb-1">/ {totalEmps}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalEmps > 0 ? (activeEmps / totalEmps) * 100 : 0}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            <span className="text-foreground font-mono">{Math.round(totalEmps > 0 ? (activeEmps / totalEmps) * 100 : 0)}%</span> явка по холдингу
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Штрафы по холдингу</p>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold font-mono text-red-400">{fmt(totalFines)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">{allFines.length} {allFines.length === 1 ? "нарушение" : allFines.length < 5 ? "нарушения" : "нарушений"} всего</p>
          {/* Mini bar chart by org */}
          <div className="space-y-1.5">
            {orgStats.filter(s => s.finesCnt > 0).sort((a, b) => b.finesTotal - a.finesTotal).map(s => (
              <div key={s.org.id} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-16 truncate shrink-0">{s.org.shortName}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.finesTotal / maxFines) * 100}%`, backgroundColor: s.org.color }} />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-16 text-right">{fmt(s.finesTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organizations list */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Организации холдинга</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgStats.map(({ org, locs, emps, posts: orgPostsCnt, covered, alert, pct, finesTotal, finesCnt }) => (
            <div
              key={org.id}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:shadow-lg hover:shadow-black/20 transition-all group"
              style={{ borderTopColor: org.color, borderTopWidth: "3px" }}
              onClick={() => { setTarget(org); setModal("detail"); }}
            >
              {/* Org header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: org.color }}>
                  {org.shortName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm leading-tight">{org.shortName}</h4>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{org.name}</p>
                </div>
                {alert > 0 && (
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <Icon name="AlertTriangle" size={12} className="text-red-400" />
                  </div>
                )}
              </div>

              {/* Coverage bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">Покрытие постов</span>
                  <span className="font-mono text-foreground">{covered}/{orgPostsCnt}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct === 100 ? "#10b981" : pct >= 60 ? org.color : "#f59e0b",
                    }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[
                  { label: "Объектов", val: locs },
                  { label: "Охранников", val: emps },
                  { label: "Штрафы", val: finesCnt },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded-lg py-2">
                    <div className="text-base font-bold font-mono text-foreground">{s.val}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <Icon name="Phone" size={11} className="text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground truncate flex-1">{org.phone || "—"}</span>
                {finesTotal > 0 && (
                  <span className="text-[10px] font-mono text-red-400 shrink-0">{fmt(finesTotal)}</span>
                )}
              </div>

              {/* Actions (show on hover) */}
              <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onSwitchOrg(org.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
                >
                  <Icon name="ArrowRightLeft" size={12} /> Перейти
                </button>
                <button
                  onClick={() => { setTarget(org); setModal("edit"); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs transition-colors"
                >
                  <Icon name="Pencil" size={12} />
                </button>
                <button
                  onClick={() => { setTarget(org); setModal("delete"); }}
                  className="flex items-center justify-center px-3 py-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs transition-colors"
                >
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <button
            onClick={() => { setTarget(null); setModal("add"); }}
            className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[220px] group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Icon name="Plus" size={22} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Добавить организацию</p>
              <p className="text-xs text-muted-foreground mt-0.5">Новое юрлицо в холдинге</p>
            </div>
          </button>
        </div>
      </div>

      </> /* end orgs tab */}

      {/* Modals */}
      {modal === "add" && (
        <OrgModal title="Новая организация" initial={null} onSave={d => { addOrg(d); close(); }} onClose={close} />
      )}
      {modal === "edit" && target && (
        <OrgModal title={`Редактировать — ${target.shortName}`} initial={target} onSave={d => { editOrg(target.id, d); close(); }} onClose={close} />
      )}
      {modal === "delete" && target && (
        <DeleteOrgModal org={target} onConfirm={() => { deleteOrg(target.id); close(); }} onClose={close} />
      )}
      {modal === "detail" && target && (
        <OrgDetail
          org={target}
          onClose={close}
          onEdit={() => setModal("edit")}
          onSwitch={() => { onSwitchOrg(target.id); close(); }}
        />
      )}
    </div>
  );
}
