import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { Location } from "@/types";
import { TYPE_LABELS, TYPE_COLORS } from "@/app/shared";
import { LocationModal, DeleteModal, PostsManagerModal } from "@/app/modals";

export function Objects() {
  const { locations, posts, addLocation, editLocation, deleteLocation, can } = useApp();
  const canEdit = can("objects:edit");
  const [modal, setModal] = useState<"add" | "edit" | "delete" | "posts" | null>(null);
  const [target, setTarget] = useState<Location | null>(null);
  const [search, setSearch] = useState("");
  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()) || l.address.toLowerCase().includes(search.toLowerCase()));
  const close = () => { setModal(null); setTarget(null); };
  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-foreground">Объекты</h2><p className="text-muted-foreground text-sm mt-1">{locations.length} объектов</p></div>
        {canEdit && <button onClick={() => setModal("add")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 shrink-0"><Icon name="Plus" size={16} /> Добавить</button>}
      </div>
      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"><Icon name="X" size={14} /></button>}
      </div>
      {filtered.length === 0
        ? <div className="bg-card border border-border rounded-xl p-12 text-center"><Icon name="Building2" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" /><p className="text-muted-foreground text-sm">{search ? "Ничего не найдено" : "Объекты не добавлены"}</p>{!search && canEdit && <button onClick={() => setModal("add")} className="mt-4 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Добавить первый</button>}</div>
        : <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(loc => {
            const lp = posts.filter(p => p.locationId === loc.id);
            const cov = lp.filter(p => p.status === "covered").length;
            const hasAlert = lp.some(p => p.status === "alert");
            const pct = lp.length > 0 ? Math.round((cov / lp.length) * 100) : 0;
            return (
              <div key={loc.id} className={`bg-card border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20 ${hasAlert ? "border-red-500/30" : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3"><h3 className="font-bold text-foreground truncate">{loc.name}</h3><p className="text-xs text-muted-foreground mt-0.5 truncate">{loc.address}</p></div>
                  <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ${TYPE_COLORS[loc.type]}`}>{TYPE_LABELS[loc.type]}</span>
                </div>
                {hasAlert && <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3 text-xs text-red-400"><Icon name="AlertTriangle" size={13} /> Пост в тревоге</div>}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Покрытие</span><span className="font-mono">{cov}/{lp.length}</span></div>
                  <div className="h-1.5 bg-muted rounded-full"><div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${lp.length > 0 ? pct : 0}%` }} /></div>
                </div>
                {loc.contact && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4"><Icon name="Phone" size={11} /> {loc.contact}</p>}
                {canEdit && (
                  <div className="flex gap-2 pt-3 border-t border-border/60">
                    <button onClick={() => { setTarget(loc); setModal("posts"); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"><Icon name="MapPin" size={13} /> Посты</button>
                    <button onClick={() => { setTarget(loc); setModal("edit"); }} className="flex items-center justify-center px-3 py-2 rounded-lg bg-muted hover:bg-secondary text-foreground text-xs font-medium transition-colors"><Icon name="Pencil" size={13} /></button>
                    <button onClick={() => { setTarget(loc); setModal("delete"); }} className="flex items-center justify-center px-3 py-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 text-xs transition-colors"><Icon name="Trash2" size={13} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      {modal === "add" && <LocationModal title="Новый объект" initial={null} onSave={d => { addLocation(d); close(); }} onClose={close} />}
      {modal === "edit" && target && <LocationModal title={`Редактировать — ${target.name}`} initial={target} onSave={d => { editLocation(target.id, d); close(); }} onClose={close} />}
      {modal === "delete" && target && <DeleteModal name={target.name} onConfirm={() => { deleteLocation(target.id); close(); }} onClose={close} />}
      {modal === "posts" && target && <PostsManagerModal location={target} onClose={close} />}
    </div>
  );
}

