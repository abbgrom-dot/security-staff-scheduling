import { useState } from "react";
import type { Holding } from "@/types";
import Icon from "@/components/ui/icon";
import { Field, inputCls } from "./shared";

// ─── Holding Modal (name + inn + logo) ────────────────────────────────────────
export function HoldingModal({ holding, onSave, onClose }: {
  holding: Holding;
  onSave: (d: { name: string; inn: string; logo?: string | null }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(holding.name);
  const [inn, setInn] = useState(holding.inn);
  const [logo, setLogo] = useState<string | null>(holding.logo ?? null);
  const [error, setError] = useState("");

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Выберите файл изображения"); return; }
    if (file.size > 500 * 1024) { setError("Логотип должен быть меньше 500 КБ"); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const valid = name.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-foreground">Настройки холдинга</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {logo
              ? <img src={logo} alt="Логотип" className="w-16 h-16 rounded-xl object-cover border border-border shrink-0" />
              : <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><Icon name="Building" size={26} className="text-primary" /></div>}
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-secondary text-foreground text-sm cursor-pointer transition-colors w-fit">
                <Icon name="Upload" size={14} /> Загрузить логотип
                <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
              </label>
              {logo && (
                <button onClick={() => setLogo(null)} className="text-xs text-muted-foreground hover:text-red-400 w-fit">Удалить логотип</button>
              )}
            </div>
          </div>

          <Field label="Название холдинга" req>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ГК «СекьюрГрупп»" className={inputCls} />
          </Field>
          <Field label="ИНН">
            <input value={inn} onChange={e => setInn(e.target.value)} placeholder="7700000000" className={inputCls} />
          </Field>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              <Icon name="AlertCircle" size={14} /> {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={() => valid && onSave({ name: name.trim(), inn: inn.trim(), logo })} disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Сохранить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}
