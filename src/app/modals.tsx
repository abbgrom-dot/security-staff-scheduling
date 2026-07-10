import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { Location, Post, FineRecord, FineReason } from "@/types";
import { Field, inputCls, fmt, TYPE_LABELS, EMPTY_LOC } from "@/app/shared";

export function LocationModal({ initial, onSave, onClose, title }: {
  initial: Omit<Location, "id" | "orgId"> | null;
  onSave: (d: Omit<Location, "id" | "orgId">) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial ?? EMPTY_LOC);
  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && form.address.trim().length > 0;
  const isEdit = initial !== null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Название" req><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Объект Д" className={inputCls} /></Field>
            <Field label="Тип">
              <select value={form.type} onChange={e => set("type", e.target.value as Location["type"])} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Адрес" req><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="ул. Примерная, 1" className={inputCls} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Контакт"><input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+7 900 000-00-00" className={inputCls} /></Field>
            <Field label="Постов">
              <input type="number" min={1} max={99} value={form.posts} disabled={isEdit} onChange={e => set("posts", parseInt(e.target.value) || 1)} className={inputCls + (isEdit ? " opacity-60 cursor-not-allowed" : "")} />
              <p className="text-[10px] text-muted-foreground mt-1">{isEdit ? "Меняется через «Посты»" : "Создадутся «Пост 1»…"}</p>
            </Field>
            <Field label="Тариф, ₽/час">
              <input type="number" min={0} step={10} value={form.hourlyRate} onChange={e => set("hourlyRate", parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>
          </div>
          <Field label="Примечание"><textarea value={form.note} onChange={e => set("note", e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Особые условия..." /></Field>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => valid && onSave(form)} disabled={!valid} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">Сохранить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Icon name="Trash2" size={22} className="text-red-400" /></div>
        <h3 className="font-bold text-lg text-foreground mb-2">Удалить объект?</h3>
        <p className="text-sm text-muted-foreground mb-6">«{name}» и все его посты будут удалены. Действие нельзя отменить.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Posts Manager Modal ──────────────────────────────────────────────────────
export function PostsManagerModal({ location, onClose }: { location: Location; onClose: () => void }) {
  const { posts, addPost, editPost, deletePost } = useApp();
  const locPosts = posts.filter(p => p.locationId === location.id);

  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState({ name: "", time: "08:00 – 20:00" });
  const [confirmDel, setConfirmDel] = useState<Post | null>(null);

  const startAdd = () => { setForm({ name: "", time: "08:00 – 20:00" }); setEditingId("new"); };
  const startEdit = (p: Post) => { setForm({ name: p.name, time: p.time }); setEditingId(p.id); };
  const save = () => {
    if (!form.name.trim()) return;
    if (editingId === "new") addPost({ name: form.name.trim(), locationId: location.id, time: form.time });
    else if (typeof editingId === "number") editPost(editingId, { name: form.name.trim(), locationId: location.id, time: form.time });
    setEditingId(null);
  };

  const statusMeta = (s: Post["status"]) => s === "covered"
    ? { t: "Закрыт", c: "text-emerald-400 bg-emerald-500/10" }
    : s === "alert" ? { t: "Тревога", c: "text-red-400 bg-red-500/10" }
    : { t: "Вакантен", c: "text-amber-400 bg-amber-500/10" };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-lg text-foreground">Посты объекта</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{location.name} · {locPosts.length} постов</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {locPosts.length === 0 && editingId !== "new" && (
            <p className="text-sm text-muted-foreground text-center py-6">Постов пока нет — добавьте первый</p>
          )}

          {locPosts.map(p => (
            editingId === p.id ? (
              <div key={p.id} className="border border-primary/40 bg-primary/5 rounded-xl p-3 space-y-2">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название поста" className={inputCls} />
                <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="08:00 – 20:00" className={inputCls} />
                <div className="flex gap-2">
                  <button onClick={save} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Сохранить</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-xs hover:bg-secondary">Отмена</button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="flex items-center gap-3 border border-border rounded-xl px-3 py-2.5">
                <Icon name="MapPin" size={15} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.time}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusMeta(p.status).c}`}>{statusMeta(p.status).t}</span>
                <button onClick={() => startEdit(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"><Icon name="Pencil" size={13} /></button>
                <button onClick={() => setConfirmDel(p)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 shrink-0"><Icon name="Trash2" size={13} /></button>
              </div>
            )
          ))}

          {editingId === "new" && (
            <div className="border border-primary/40 bg-primary/5 rounded-xl p-3 space-y-2">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название поста" className={inputCls} autoFocus />
              <input value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} placeholder="08:00 – 20:00" className={inputCls} />
              <div className="flex gap-2">
                <button onClick={save} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Добавить</button>
                <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-xs hover:bg-secondary">Отмена</button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border shrink-0">
          {editingId !== "new" && (
            <button onClick={startAdd} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
              <Icon name="Plus" size={16} /> Добавить пост
            </button>
          )}
        </div>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDel(null)}>
          <div className="bg-card border border-red-500/20 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4"><Icon name="Trash2" size={22} className="text-red-400" /></div>
            <h3 className="font-bold text-lg text-foreground mb-2">Удалить пост?</h3>
            <p className="text-sm text-muted-foreground mb-6">«{confirmDel.name}» будет удалён вместе со связанными штрафами. Действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => { deletePost(confirmDel.id); setConfirmDel(null); }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Удалить</button>
              <button onClick={() => setConfirmDel(null)} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────
// Статус-бейдж для сотрудника в списке назначения
export function empStatusLabel(status: import("@/types").Employee["status"]) {
  switch (status) {
    case "active": return { text: "На смене",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    case "off":    return { text: "Выходной",   cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    case "sick":   return { text: "Больничный", cls: "text-red-400 bg-red-500/10 border-red-500/30" };
    case "extra":  return { text: "Подработка", cls: "text-purple-400 bg-purple-500/10 border-purple-500/30" };
  }
}

export function AssignModal({ post, onAssign, onClose }: {
  post: Post;
  onAssign: (postId: number, empId: number | null, fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;
  onClose: () => void;
}) {
  const { employees, fineReasons, locations, posts } = useApp();
  const loc = locations.find(l => l.id === post.locationId);
  const curEmp = employees.find(e => e.id === post.officerId) ?? null;

  const [selId, setSelId] = useState<number | null>(post.officerId);
  const [isExtra, setIsExtra] = useState(false);     // назначить как подработку
  const [withFine, setWithFine] = useState(false);
  const [reasonId, setReasonId] = useState<number>(fineReasons[0]?.id ?? 1);
  const [fineAmt, setFineAmt] = useState<number>(fineReasons[0]?.amount ?? 500);
  const [fineNote, setFineNote] = useState("");
  const [search, setSearch] = useState("");

  // Сотрудники, уже занятые на других постах (кроме текущего)
  const busyIds = new Set(
    posts.filter(p => p.id !== post.id && p.officerId !== null && p.status !== "vacant")
         .map(p => p.officerId as number)
  );

  // Выбранный сотрудник
  const selEmp = employees.find(e => e.id === selId);

  // Автоустановка isExtra если сотрудник в выходном
  useEffect(() => {
    if (selEmp && (selEmp.status === "off" || selEmp.status === "extra")) {
      setIsExtra(true);
    } else {
      setIsExtra(false);
    }
  }, [selId]);

  const handleReason = (id: number) => {
    setReasonId(id);
    const r = fineReasons.find(r => r.id === id);
    if (r) setFineAmt(r.amount);
  };

  const isReplacement = curEmp !== null && selId !== post.officerId;

  // Группировка: текущий → выходные/подработка → занятые на других постах → больничный
  // Сотрудники со статусом "active" скрываются (они уже на смене), кроме текущего на этом посту
  const searchLower = search.toLowerCase();
  const sortedEmps = [...employees]
    .filter(e => {
      // Всегда показываем текущего назначенного
      if (e.id === post.officerId) return true;
      // Скрываем активных — они уже на смене
      if (e.status === "active") return false;
      // Поиск по имени/должности
      return !searchLower || e.name.toLowerCase().includes(searchLower) || e.rank.toLowerCase().includes(searchLower);
    })
    .filter(e => !searchLower || e.id === post.officerId || e.name.toLowerCase().includes(searchLower) || e.rank.toLowerCase().includes(searchLower))
    .sort((a, b) => {
      const order = (e: typeof a) => {
        if (e.id === post.officerId) return 0;   // текущий — первым
        if (e.status === "off" || e.status === "extra") return 1; // выходные/подработка
        if (busyIds.has(e.id)) return 2;          // занятые на других постах
        if (e.status === "sick") return 3;         // больничный — в конце
        return 1;
      };
      return order(a) - order(b);
    });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-bold text-lg text-foreground">Назначение на пост</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{post.name} · {loc?.name ?? "—"} · <span className="font-mono">{post.time}</span></p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Текущий сотрудник */}
          {curEmp && (
            <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {curEmp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{curEmp.name}</p>
                <p className="text-xs text-muted-foreground">{curEmp.rank} · сейчас на посту</p>
              </div>
              <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
            </div>
          )}

          {/* Поиск */}
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Найти сотрудника..."
              className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="X" size={13} /></button>}
          </div>

          {/* Список сотрудников */}
          <div className="space-y-1.5">
            {/* Снять охранника */}
            <button
              onClick={() => setSelId(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${selId === null ? "border-amber-500/40 bg-amber-500/8" : "border-border bg-muted/30 hover:bg-muted/60"}`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon name="UserX" size={14} className="text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground flex-1">— Снять охранника (вакантный пост) —</span>
              {selId === null && <Icon name="Check" size={14} className="text-amber-400 shrink-0" />}
            </button>

            {sortedEmps.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Icon name="UserX" size={28} className="mx-auto mb-2 opacity-30" />
                {searchLower ? "Никого не найдено" : "Нет доступных сотрудников"}
                <p className="text-[10px] mt-1 text-muted-foreground/60">Сотрудники «На смене» уже задействованы</p>
              </div>
            )}

            {sortedEmps.map(e => {
              const isCurrent = e.id === post.officerId;
              const isBusy = busyIds.has(e.id) && !isCurrent;
              const isSick = e.status === "sick";
              const statusInfo = empStatusLabel(e.status);
              const isSelected = selId === e.id;

              return (
                <button
                  key={e.id}
                  onClick={() => !isSick && !isBusy && setSelId(e.id)}
                  disabled={isSick || isBusy}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all
                    ${isSick || isBusy ? "border-border/40 bg-muted/20 opacity-50 cursor-not-allowed" :
                      isSelected       ? "border-primary/50 bg-primary/8" :
                                         "border-border bg-muted/30 hover:bg-muted/60"}`}
                >
                  {/* Аватар */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                    ${isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>

                  {/* Имя + должность */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                      {isCurrent && <span className="text-[10px] text-primary border border-primary/30 rounded px-1.5 py-0.5 bg-primary/10 shrink-0">текущий</span>}
                      {isBusy && <span className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">занят на посту</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{e.rank}</p>
                  </div>

                  {/* Статус бейдж */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusInfo.cls}`}>
                    {statusInfo.text}
                  </span>

                  {/* Чекмарк */}
                  {isSelected && <Icon name="Check" size={14} className="text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Подсказка: активные скрыты */}
          {!searchLower && (
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Сотрудники со статусом «На смене» скрыты — они уже задействованы
            </p>
          )}

          {/* Флаг подработки */}
          {selEmp && (selEmp.status === "off" || selEmp.status === "extra") && (
            <div className="p-3 bg-purple-500/8 border border-purple-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Icon name="Star" size={14} className="text-purple-400" />
                <p className="text-sm font-semibold text-foreground">Подработка в выходной</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Сотрудник в выходном. Ставка подработки: ×{selEmp.extraShiftRate} от обычной
                {selEmp.extraShiftRate > 1 && <span className="text-purple-400 font-mono ml-1">(+{Math.round((selEmp.extraShiftRate - 1) * 100)}%)</span>}
              </p>
            </div>
          )}

          {/* Штраф при замене */}
          {isReplacement && curEmp && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => setWithFine(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left">
                <div className={`w-5 h-5 rounded flex items-center justify-center ${withFine ? "bg-primary" : "bg-muted border border-border"}`}>
                  {withFine && <Icon name="Check" size={12} className="text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Начислить штраф</p>
                  <p className="text-xs text-muted-foreground">{curEmp.name} — зафиксировать нарушение</p>
                </div>
              </button>
              {withFine && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                  <Field label="Причина">
                    <select value={reasonId} onChange={e => handleReason(Number(e.target.value))} className={inputCls}>
                      {fineReasons.map(r => <option key={r.id} value={r.id}>{r.label} — {fmt(r.amount)}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Сумма штрафа, ₽">
                      <input type="number" min={0} step={100} value={fineAmt} onChange={e => setFineAmt(Number(e.target.value))} className={inputCls} />
                    </Field>
                    <Field label="Примечание">
                      <input value={fineNote} onChange={e => setFineNote(e.target.value)} placeholder="Уточнение..." className={inputCls} />
                    </Field>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                    <Icon name="AlertTriangle" size={13} /> Штраф {fmt(fineAmt)} будет записан в историю
                  </div>
                </div>
              )}
            </div>
          )}

          {selId === null && curEmp && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
              <Icon name="Info" size={13} /> Пост будет помечен как вакантный
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-border shrink-0">
          <button
            onClick={() => {
              const fine = withFine && curEmp ? { employeeId: curEmp.id, reasonId, note: fineNote, amount: fineAmt } : null;
              onAssign(post.id, selId, fine);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            {isReplacement ? "Заменить" : selId === null ? "Снять охранника" : isExtra ? "Назначить (подработка)" : "Назначить"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── FineReasons Modal ────────────────────────────────────────────────────────
export function FineReasonsModal({ onClose }: { onClose: () => void }) {
  const { fineReasons, setFineReasons } = useApp();
  const [list, setList] = useState<FineReason[]>(fineReasons);
  const upd = (id: number, k: keyof FineReason, v: string | number) => setList(p => p.map(r => r.id === id ? { ...r, [k]: v } : r));
  const add = () => setList(p => [...p, { id: Math.max(0, ...p.map(r => r.id)) + 1, orgId: p[0]?.orgId ?? 1, label: "Новое нарушение", amount: 500, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" }]);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xl section-enter max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 shrink-0">
          <h3 className="font-bold text-lg text-foreground">Справочник нарушений</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {list.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <input value={r.label} onChange={e => upd(r.id, "label", e.target.value)} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border pb-0.5 transition-colors" />
              <input type="number" min={0} step={100} value={r.amount} onChange={e => upd(r.id, "amount", Number(e.target.value))} className="w-24 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono text-right focus:outline-none" />
              <span className="text-xs text-muted-foreground">₽</span>
              <button onClick={() => setList(p => p.filter(x => x.id !== r.id))} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"><Icon name="X" size={14} /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex gap-3 shrink-0">
          <button onClick={add} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary"><Icon name="Plus" size={15} /> Добавить</button>
          <button onClick={() => { setFineReasons(list); onClose(); }} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
