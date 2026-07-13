import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { AppUser, Role, Permission } from "@/types";
import { ALL_PERMISSIONS } from "@/types";
import Icon from "@/components/ui/icon";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Role Modal ───────────────────────────────────────────────────────────────
function RoleModal({ role, onSave, onClose }: {
  role: Role | null;
  onSave: (d: Omit<Role, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [desc, setDesc] = useState(role?.description ?? "");
  const [perms, setPerms] = useState<Set<Permission>>(new Set(role?.permissions ?? []));

  const toggle = (p: Permission) => setPerms(prev => {
    const next = new Set(prev);
    if (next.has(p)) { next.delete(p); } else { next.add(p); }
    return next;
  });

  const groups = ALL_PERMISSIONS.reduce<Record<string, typeof ALL_PERMISSIONS>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  const valid = name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-foreground">{role ? `Редактировать роль` : "Новая роль"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Название роли" required>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Старший диспетчер" className={inputCls} />
            </Field>
            <Field label="Описание">
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Краткое описание..." className={inputCls} />
            </Field>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Права доступа</p>
            <div className="space-y-4">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-foreground mb-2">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {items.map(item => (
                      <button
                        key={item.key}
                        onClick={() => toggle(item.key)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-sm
                          ${perms.has(item.key) ? "bg-primary/10 border border-primary/30 text-foreground" : "bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground"}`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${perms.has(item.key) ? "bg-primary" : "bg-muted border border-border"}`}>
                          {perms.has(item.key) && <Icon name="Check" size={10} className="text-primary-foreground" />}
                        </div>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button
            onClick={() => valid && onSave({ name, description: desc, permissions: Array.from(perms), orgId: role?.orgId ?? null, isSystem: false })}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({ user, onSave, onClose, locked = false }: {
  user: AppUser | null;
  onSave: (d: Omit<AppUser, "id" | "holdingId" | "lastLogin"> & { password?: string }) => void;
  onClose: () => void;
  locked?: boolean;
}) {
  const { orgs, roles } = useApp();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [password, setPassword] = useState("");
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>(user?.orgIds ?? []);
  const [selectedRoles, setSelectedRoles] = useState<number[]>(user?.roleIds ?? []);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  const isNew = !user;

  const toggleOrg = (id: number) => setSelectedOrgs(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleRole = (id: number) => setSelectedRoles(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const initials = name.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  const passwordValid = !isNew || password.length === 0 || password.length >= 6;
  const valid = name.trim().length > 0 && email.includes("@") && selectedOrgs.length > 0 && selectedRoles.length > 0 && passwordValid;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-foreground">{user ? "Редактировать пользователя" : "Новый пользователь"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Полное имя" required>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя Отчество" className={inputCls} />
            </Field>
            <Field label="Email" required>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.ru" className={inputCls} />
            </Field>
          </div>
          <Field label="Телефон">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} />
          </Field>

          {isNew && (
            <Field label="Пароль">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Оставьте пустым для demo1234" className={inputCls} />
              <p className={`text-xs mt-1 ${passwordValid ? "text-muted-foreground" : "text-red-400"}`}>
                {password.length === 0 ? "Если не указан — будет установлен пароль demo1234" : "Минимум 6 символов"}
              </p>
            </Field>
          )}

          <Field label="Организации (доступ)" required>
            <div className="space-y-1.5 mt-1">
              {orgs.map(org => (
                <button
                  key={org.id}
                  onClick={() => toggleOrg(org.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors
                    ${selectedOrgs.includes(org.id) ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40 hover:bg-muted/60"}`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selectedOrgs.includes(org.id) ? "bg-primary" : "bg-muted border border-border"}`}>
                    {selectedOrgs.includes(org.id) && <Icon name="Check" size={10} className="text-primary-foreground" />}
                  </div>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
                  <span className="text-sm text-foreground">{org.shortName}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Роли" required>
            <div className="space-y-1.5 mt-1">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => toggleRole(role.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors
                    ${selectedRoles.includes(role.id) ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40 hover:bg-muted/60"}`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selectedRoles.includes(role.id) ? "bg-primary" : "bg-muted border border-border"}`}>
                    {selectedRoles.includes(role.id) && <Icon name="Check" size={10} className="text-primary-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{role.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                  </div>
                  {role.isSystem && <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">системная</span>}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-between px-3 py-3 bg-muted/40 rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">Активен</p>
              <p className="text-xs text-muted-foreground">{locked ? "Нельзя заблокировать: последний суперадмин или вы сами" : "Может входить в систему"}</p>
            </div>
            <button
              onClick={() => { if (!locked) setIsActive(v => !v); }}
              disabled={locked}
              className={`w-11 h-6 rounded-full transition-colors relative ${isActive ? "bg-primary" : "bg-muted border border-border"} ${locked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className={`w-4.5 h-4.5 absolute top-0.5 rounded-full bg-white shadow transition-all ${isActive ? "left-[calc(100%-1.25rem-0.125rem)]" : "left-0.5"}`} style={{ width: "18px", height: "18px" }} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button
            onClick={() => valid && onSave({ name, email, phone, orgIds: selectedOrgs, roleIds: selectedRoles, isActive, avatarInitials: initials || "??", ...(isNew && password ? { password } : {}) })}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function ConfirmDelete({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
          <Icon name="Trash2" size={22} className="text-red-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить?</h3>
        <p className="text-sm text-muted-foreground mb-6">«{label}» будет удалён. Действие нельзя отменить.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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