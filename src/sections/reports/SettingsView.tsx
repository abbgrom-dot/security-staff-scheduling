import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { inputCls } from "@/app/shared";

export function ChangePasswordCard() {
  const { changePassword, session } = useApp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setStatus(null);
    if (next.length < 6) { setStatus({ type: "err", msg: "Новый пароль должен быть не короче 6 символов" }); return; }
    if (next !== confirm) { setStatus({ type: "err", msg: "Пароли не совпадают" }); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      setStatus({ type: "ok", msg: "Пароль успешно изменён" });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      setStatus({ type: "err", msg: e instanceof Error ? e.message : "Ошибка смены пароля" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="KeyRound" size={18} className="text-primary" />
        <h3 className="font-semibold text-foreground">Смена пароля</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{session?.user.email}</p>
      <div className="space-y-3 max-w-md">
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Текущий пароль</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Новый пароль</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" placeholder="Минимум 6 символов" className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Повторите новый пароль</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" className={inputCls} />
        </div>
        {status && (
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs ${status.type === "ok" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
            <Icon name={status.type === "ok" ? "CheckCircle2" : "AlertCircle"} size={14} />
            {status.msg}
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-end">
        <button onClick={submit} disabled={saving || !current || !next} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
          {saving && <Icon name="Loader2" size={15} className="animate-spin" />}
          {saving ? "Сохранение..." : "Изменить пароль"}
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const { currentOrg } = useApp();
  const items = [
    { title: "Организация", fields: [{ label: "Название", value: currentOrg?.name ?? "" }, { label: "ИНН", value: currentOrg?.inn ?? "" }, { label: "Адрес", value: currentOrg?.address ?? "" }, { label: "Телефон", value: currentOrg?.phone ?? "" }, { label: "Лицензия", value: currentOrg?.license ?? "" }] },
    { title: "Смены", fields: [{ label: "Дневная", value: "08:00 – 20:00" }, { label: "Ночная", value: "20:00 – 08:00" }] },
    { title: "Уведомления", fields: [{ label: "Email", value: "admin@example.com" }, { label: "SMS-тревога", value: "+7 900 000-00-00" }] },
  ];
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Настройки</h2><p className="text-muted-foreground text-sm mt-1">{currentOrg?.shortName}</p></div>
      <ChangePasswordCard />
      {items.map(s => (
        <div key={s.title} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">{s.title}</h3>
          <div className="space-y-4">{s.fields.map(f => <div key={f.label} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center"><label className="text-sm text-muted-foreground">{f.label}</label><input defaultValue={f.value} className={inputCls} /></div>)}</div>
          <div className="mt-5 flex justify-end"><button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Сохранить</button></div>
        </div>
      ))}
    </div>
  );
}
