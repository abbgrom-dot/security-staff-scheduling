import { useState } from "react";
import type { Organization } from "@/types";
import Icon from "@/components/ui/icon";
import { Field, inputCls, ORG_COLORS, EMPTY_ORG } from "./shared";

// ─── Org Modal ────────────────────────────────────────────────────────────────
export function OrgModal({ initial, onSave, onClose, title }: {
  initial: Omit<Organization, "id" | "holdingId"> | null;
  onSave: (d: Omit<Organization, "id" | "holdingId">) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_ORG);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && form.shortName.trim().length > 0 && form.inn.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Полное название" req>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder='ООО "Охрана Центр"' className={inputCls} />
            </Field>
            <Field label="Короткое название" req>
              <input value={form.shortName} onChange={e => set("shortName", e.target.value)} placeholder="ОГ Центр" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ИНН" req>
              <input value={form.inn} onChange={e => set("inn", e.target.value)} placeholder="7700000000" className={inputCls} />
            </Field>
            <Field label="Телефон">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 800 000-00-00" className={inputCls} />
            </Field>
          </div>
          <Field label="Адрес">
            <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="ул. Примерная, 1, Москва" className={inputCls} />
          </Field>
          <Field label="Лицензия ЧО">
            <input value={form.license} onChange={e => set("license", e.target.value)} placeholder="ЧО-000000 / до дд.мм.гггг" className={inputCls} />
          </Field>
          <Field label="Цвет-акцент">
            <div className="flex gap-2 flex-wrap mt-1">
              {ORG_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => set("color", c)}
                  className="w-8 h-8 rounded-xl transition-all"
                  style={{
                    backgroundColor: c,
                    outline: form.color === c ? `3px solid ${c}` : "none",
                    outlineOffset: "2px",
                    opacity: form.color === c ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => valid && onSave(form)}
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

export function DeleteOrgModal({ org, onConfirm, onClose }: { org: Organization; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
          <Icon name="Trash2" size={22} className="text-red-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить организацию?</h3>
        <p className="text-sm text-muted-foreground mb-6">
          «{org.shortName}» будет удалена из холдинга. Все связанные данные (объекты, сотрудники, штрафы) останутся в базе, но потеряют привязку.
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}
