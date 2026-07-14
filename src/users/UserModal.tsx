import { useState } from "react";
import { useApp } from "@/context/AppContext";
import type { AppUser } from "@/types";
import Icon from "@/components/ui/icon";
import { inputCls, Field } from "@/users/shared";

export function UserModal({ user, onSave, onClose, locked = false }: {
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
export function ConfirmDelete({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
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
