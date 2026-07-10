import { useApp } from "@/context/AppContext";
import type { Organization } from "@/types";
import Icon from "@/components/ui/icon";
import { fmt } from "./shared";

// ─── Org Detail Drawer ────────────────────────────────────────────────────────
export function OrgDetail({ org, onClose, onEdit, onSwitch }: {
  org: Organization;
  onClose: () => void;
  onEdit: () => void;
  onSwitch: () => void;
}) {
  const { allLocations, allEmployees, allPosts, allFines, users, roles } = useApp();

  const locs = allLocations.filter(l => l.orgId === org.id);
  const emps = allEmployees.filter(e => e.orgId === org.id);
  const orgPosts = allPosts.filter(p => p.orgId === org.id);
  const orgFines = allFines.filter(f => f.orgId === org.id);
  const orgUsers = users.filter(u => u.orgIds.includes(org.id));

  const covered = orgPosts.filter(p => p.status === "covered").length;
  const vacant = orgPosts.filter(p => p.status === "vacant").length;
  const alerts = orgPosts.filter(p => p.status === "alert").length;
  const active = emps.filter(e => e.status === "active").length;
  const finesTotal = orgFines.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card border border-border w-full sm:max-w-xl max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl section-enter"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-border shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-lg font-bold text-white" style={{ backgroundColor: org.color }}>
            {org.shortName.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground leading-tight">{org.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">ИНН {org.inn} · {org.address}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Объектов", val: locs.length, icon: "Building2", c: "text-primary", bg: "bg-primary/10" },
              { label: "Охранников", val: emps.length, icon: "Users", c: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: "Постов всего", val: orgPosts.length, icon: "MapPin", c: "text-indigo-400", bg: "bg-indigo-500/10" },
            ].map(s => (
              <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}><Icon name={s.icon} size={16} className={s.c} /></div>
                <div className={`text-xl font-bold font-mono ${s.c}`}>{s.val}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Coverage bar */}
          <div className="bg-muted/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Покрытие постов</span>
              <span className="text-xs font-mono text-muted-foreground">{covered}/{orgPosts.length}</span>
            </div>
            {orgPosts.length > 0 ? (
              <div className="h-2.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                {covered > 0 && <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${(covered / orgPosts.length) * 100}%` }} />}
                {vacant > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: `${(vacant / orgPosts.length) * 100}%` }} />}
                {alerts > 0 && <div className="h-full bg-red-500 rounded-r-full transition-all" style={{ width: `${(alerts / orgPosts.length) * 100}%` }} />}
              </div>
            ) : <div className="h-2.5 bg-muted rounded-full" />}
            <div className="flex gap-4 mt-2">
              {[{ label: "Закрыты", val: covered, c: "bg-emerald-500" }, { label: "Вакантны", val: vacant, c: "bg-amber-400" }, { label: "Тревога", val: alerts, c: "bg-red-500" }].map(x => (
                <div key={x.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${x.c}`} />
                  <span className="text-[10px] text-muted-foreground">{x.label}: <span className="text-foreground font-mono">{x.val}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="UserCheck" size={14} className="text-emerald-400" />
                <span className="text-xs text-muted-foreground">На смене сейчас</span>
              </div>
              <span className="text-2xl font-bold font-mono text-emerald-400">{active}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {emps.length}</span>
            </div>
            <div className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="BadgeAlert" size={14} className="text-red-400" />
                <span className="text-xs text-muted-foreground">Штрафы</span>
              </div>
              <span className="text-xl font-bold font-mono text-red-400">{fmt(finesTotal)}</span>
              <p className="text-[10px] text-muted-foreground">{orgFines.length} нарушений</p>
            </div>
          </div>

          {/* License */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl">
            <Icon name="ShieldCheck" size={16} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Лицензия ЧО</p>
              <p className="text-sm text-foreground">{org.license || "—"}</p>
            </div>
          </div>

          {/* Users */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Пользователи системы</p>
            {orgUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Не назначены</p>
            ) : (
              <div className="space-y-1.5">
                {orgUsers.map(u => {
                  const userRoles = roles.filter(r => u.roleIds.includes(r.id));
                  return (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{u.avatarInitials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground">{userRoles.map(r => r.name).join(", ")}</p>
                      </div>
                      <span className={u.isActive ? "badge-active" : "badge-inactive"}>{u.isActive ? "Активен" : "Блок."}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button
            onClick={onSwitch}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Icon name="ArrowRightLeft" size={15} /> Перейти в организацию
          </button>
          <button onClick={onEdit} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors flex items-center gap-2">
            <Icon name="Pencil" size={14} /> Изменить
          </button>
        </div>
      </div>
    </div>
  );
}
