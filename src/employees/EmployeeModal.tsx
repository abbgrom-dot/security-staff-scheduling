import { useState } from "react";
import Icon from "@/components/ui/icon";
import { inputCls, Field } from "@/app/shared";
import { useApp } from "@/context/AppContext";

type EmpForm = Omit<import("@/types").Employee, "id" | "orgId">;

const EMPTY_EMP: EmpForm = {
  name: "", rank: "Охранник", status: "active", location: "—",
  shift: "08:00 – 20:00", phone: "", hireDate: "", yearsExp: 0, seniorityBonus: 0, note: "",
  extraShiftRate: 1.5,
  periodicCheckDate: "", medCheckDate: "",
};

export function EmployeeModal({ initial, onSave, onClose, title }: {
  initial: EmpForm | null;
  onSave: (d: EmpForm) => void;
  onClose: () => void;
  title: string;
}) {
  const { locations } = useApp();
  const [form, setForm] = useState<EmpForm>(initial ?? EMPTY_EMP);
  const set = <K extends keyof EmpForm>(k: K, v: EmpForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ФИО + Должность */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Полное имя" req>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Фамилия Имя Отчество" className={inputCls} />
            </Field>
            <Field label="Должность">
              <select value={form.rank} onChange={e => set("rank", e.target.value)} className={inputCls}>
                {["Охранник", "Ст. охранник", "Руководитель группы", "Стажёр"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          {/* Статус + Телефон */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Статус">
              <select value={form.status} onChange={e => set("status", e.target.value as EmpForm["status"])} className={inputCls}>
                <option value="active">На смене</option>
                <option value="extra">Подработка (выходной)</option>
                <option value="off">Выходной</option>
                <option value="sick">Больничный</option>
              </select>
            </Field>
            <Field label="Телефон">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} />
            </Field>
          </div>

          {/* Ставка подработки — показываем если extra или off */}
          {(form.status === "extra" || form.status === "off") && (
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="Star" size={14} className="text-purple-400" />
                <p className="text-sm font-semibold text-foreground">Коэффициент подработки</p>
              </div>
              <div className="flex items-center gap-3">
                <Field label="Коэффициент оплаты">
                  <select
                    value={form.extraShiftRate}
                    onChange={e => set("extraShiftRate", parseFloat(e.target.value))}
                    className={inputCls}
                  >
                    <option value={1.0}>×1.0 — стандартная ставка</option>
                    <option value={1.25}>×1.25 — +25%</option>
                    <option value={1.5}>×1.5 — полтора (стандарт ТК)</option>
                    <option value={2.0}>×2.0 — двойная ставка</option>
                  </select>
                </Field>
              </div>
              <p className="text-[10px] text-muted-foreground">
                При назначении на пост в выходной применяется этот коэффициент к тарифу объекта + надбавке
              </p>
            </div>
          )}

          {/* Смена + Локация */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="График смены">
              <select value={form.shift} onChange={e => set("shift", e.target.value)} className={inputCls}>
                {["08:00 – 20:00", "20:00 – 08:00", "Выходной", "Больничный", "Отпуск"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Текущий объект">
              <select value={form.location} onChange={e => set("location", e.target.value)} className={inputCls}>
                <option value="—">— Не привязан —</option>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Дата приёма + Стаж */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Дата приёма на работу">
              <input type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Стаж в охране, лет">
              <input type="number" min={0} max={50} value={form.yearsExp} onChange={e => set("yearsExp", parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>

          {/* Надбавка */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="TrendingUp" size={15} className="text-amber-400" />
              <p className="text-sm font-semibold text-foreground">Надбавка за выслугу лет</p>
            </div>
            <div className="grid grid-cols-2 gap-4 items-end">
              <Field label="Надбавка, ₽/час">
                <input type="number" min={0} step={5} value={form.seniorityBonus} onChange={e => set("seniorityBonus", parseInt(e.target.value) || 0)} className={inputCls} />
              </Field>
              <div className="pb-2.5 text-xs text-muted-foreground">
                {form.yearsExp >= 10 && <span className="text-emerald-400">≥ 10 лет: рекомендуется +40–50 ₽/ч</span>}
                {form.yearsExp >= 5 && form.yearsExp < 10 && <span className="text-primary">5–9 лет: рекомендуется +20–35 ₽/ч</span>}
                {form.yearsExp > 0 && form.yearsExp < 5 && <span className="text-muted-foreground">1–4 лет: рекомендуется +10–20 ₽/ч</span>}
                {form.yearsExp === 0 && <span className="text-muted-foreground">Стаж не указан</span>}
              </div>
            </div>
          </div>

          {/* Периодическая проверка и медкомиссия */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="ClipboardCheck" size={14} className="text-blue-400" />
              <p className="text-sm font-semibold text-foreground">Проверки и комиссии (действуют 1 год)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Периодическая проверка">
                <input
                  type="date"
                  value={form.periodicCheckDate}
                  onChange={e => set("periodicCheckDate", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Медицинская комиссия">
                <input
                  type="date"
                  value={form.medCheckDate}
                  onChange={e => set("medCheckDate", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Указывайте дату последнего прохождения. Система автоматически рассчитает дату истечения (+1 год) и выдаст предупреждение за 30 дней.
            </p>
          </div>

          {/* Примечание */}
          <Field label="Примечание">
            <textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Дополнительная информация..." />
          </Field>
        </div>

        <div className="flex gap-3 p-6 border-t border-border shrink-0">
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Сохранить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

export function EmployeeDeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Icon name="UserX" size={22} className="text-red-400" /></div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить сотрудника?</h3>
        <p className="text-sm text-muted-foreground mb-6">«{name}» будет удалён из базы. Это действие нельзя отменить.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Employees Section ────────────────────────────────────────────────────────