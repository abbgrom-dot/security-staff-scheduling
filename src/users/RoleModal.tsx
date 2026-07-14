import { useState } from "react";
import type { Role, Permission } from "@/types";
import { ALL_PERMISSIONS } from "@/types";
import Icon from "@/components/ui/icon";
import { inputCls, Field } from "@/users/shared";

export default function RoleModal({ role, onSave, onClose }: {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[calc(100vh-6rem)] flex flex-col min-w-0 section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-foreground">{role ? `Редактировать роль` : "Новая роль"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
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
                        <span className="min-w-0 break-words">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-4 sm:p-6 border-t border-border shrink-0">
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
