import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { AppUser, Role } from "@/types";
import { ALL_PERMISSIONS } from "@/types";
import Icon from "@/components/ui/icon";
import RoleModal from "@/users/RoleModal";
import { UserModal, ConfirmDelete } from "@/users/UserModal";

export default function UsersSection() {
  const { users, addUser, editUser, deleteUser, roles, addRole, editRole, deleteRole, orgs, can, session, superAdminCount } = useApp();

  // Роль суперадмина — та, что содержит право "holding:view".
  const userIsSuperAdmin = (u: AppUser) =>
    u.roleIds.some(rid => roles.find(r => r.id === rid)?.permissions.includes("holding:view"));
  // Нельзя трогать последнего активного суперадмина (иначе холдинг останется без администратора).
  const isLastSuperAdmin = (u: AppUser) => u.isActive && userIsSuperAdmin(u) && superAdminCount() <= 1;
  // Себя самого удалять нельзя (защита от самоблокировки).
  const isSelf = (u: AppUser) => session?.user.id === u.id;
  const isProtected = (u: AppUser) => isLastSuperAdmin(u) || isSelf(u);

  const [tab, setTab] = useState<"users" | "roles">("users");

  // users state
  const [userModal, setUserModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [targetUser, setTargetUser] = useState<AppUser | null>(null);

  // roles state
  const [roleModal, setRoleModal] = useState<"add" | "edit" | "delete" | null>(null);
  const [targetRole, setTargetRole] = useState<Role | null>(null);

  const canEditUsers = can("users:edit");
  const canEditRoles = can("roles:edit");

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Пользователи и роли</h2>
          <p className="text-muted-foreground text-sm mt-1">Управление доступом к системе</p>
        </div>
        {tab === "users" && canEditUsers && (
          <button onClick={() => { setTargetUser(null); setUserModal("add"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">
            <Icon name="UserPlus" size={16} /> Добавить пользователя
          </button>
        )}
        {tab === "roles" && canEditRoles && (
          <button onClick={() => { setTargetRole(null); setRoleModal("add"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0">
            <Icon name="Plus" size={16} /> Новая роль
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {[{ key: "users", label: "Пользователи", icon: "Users", count: users.length }, { key: "roles", label: "Роли", icon: "ShieldCheck", count: roles.length }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "users" | "roles")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
              ${tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon name={t.icon} size={15} /> {t.label}
            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded-full">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr className="border-b border-border">
                {["Пользователь", "Email / Телефон", "Организации", "Роли", "Последний вход", "Статус", ""].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {users.map(u => {
                  const userOrgs = orgs.filter(o => u.orgIds.includes(o.id));
                  const userRoles = roles.filter(r => u.roleIds.includes(r.id));
                  return (
                    <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {u.avatarInitials}
                          </div>
                          <span className="font-medium text-foreground text-sm">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground">{u.email}</p>
                        <p className="text-xs text-muted-foreground font-mono">{u.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {userOrgs.map(o => (
                            <span key={o.id} className="text-[10px] px-2 py-0.5 rounded-full border font-medium" style={{ borderColor: o.color + "50", color: o.color, backgroundColor: o.color + "15" }}>
                              {o.shortName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map(r => (
                            <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{r.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{fmtDate(u.lastLogin)}</td>
                      <td className="px-5 py-4">
                        {u.isActive
                          ? <span className="badge-active">Активен</span>
                          : <span className="badge-inactive">Заблокирован</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        {canEditUsers && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setTargetUser(u); setUserModal("edit"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Icon name="Pencil" size={14} />
                            </button>
                            {isProtected(u) ? (
                              <span
                                title={isLastSuperAdmin(u) ? "Нельзя удалить последнего суперадминистратора" : "Нельзя удалить собственную учётную запись"}
                                className="p-1.5 rounded-lg text-muted-foreground/40 cursor-not-allowed"
                              >
                                <Icon name="ShieldAlert" size={14} />
                              </span>
                            ) : (
                              <button onClick={() => { setTargetUser(u); setUserModal("delete"); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                                <Icon name="Trash2" size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Roles Tab ── */}
      {tab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles.map(role => {
            const assignedCount = users.filter(u => u.roleIds.includes(role.id)).length;
            return (
              <div key={role.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground">{role.name}</h3>
                      {role.isSystem && (
                        <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">системная</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  </div>
                  {canEditRoles && !role.isSystem && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setTargetRole(role); setRoleModal("edit"); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Icon name="Pencil" size={14} />
                      </button>
                      <button onClick={() => { setTargetRole(role); setRoleModal("delete"); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Users" size={12} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{assignedCount} {assignedCount === 1 ? "пользователь" : assignedCount < 5 ? "пользователя" : "пользователей"}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs text-muted-foreground">{role.permissions.length} {role.permissions.length === 1 ? "право" : role.permissions.length < 5 ? "права" : "прав"}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 6).map(p => {
                    const info = ALL_PERMISSIONS.find(x => x.key === p);
                    return (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">{info?.label ?? p}</span>
                    );
                  })}
                  {role.permissions.length > 6 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">+{role.permissions.length - 6}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {userModal === "add" && (
        <UserModal user={null} onSave={d => { addUser(d); setUserModal(null); }} onClose={() => setUserModal(null)} />
      )}
      {userModal === "edit" && targetUser && (
        <UserModal user={targetUser} locked={isProtected(targetUser)} onSave={d => { editUser(targetUser.id, d); setUserModal(null); }} onClose={() => setUserModal(null)} />
      )}
      {userModal === "delete" && targetUser && (
        <ConfirmDelete label={targetUser.name} onConfirm={() => { deleteUser(targetUser.id); setUserModal(null); }} onClose={() => setUserModal(null)} />
      )}
      {roleModal === "add" && (
        <RoleModal role={null} onSave={d => { addRole(d); setRoleModal(null); }} onClose={() => setRoleModal(null)} />
      )}
      {roleModal === "edit" && targetRole && (
        <RoleModal role={targetRole} onSave={d => { editRole(targetRole.id, d); setRoleModal(null); }} onClose={() => setRoleModal(null)} />
      )}
      {roleModal === "delete" && targetRole && (
        <ConfirmDelete label={targetRole.name} onConfirm={() => { deleteRole(targetRole.id); setRoleModal(null); }} onClose={() => setRoleModal(null)} />
      )}
    </div>
  );
}
