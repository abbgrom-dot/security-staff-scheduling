import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { ScheduleKind } from "@/types";
import { KIND_META, initials, shiftHours } from "@/schedule/scheduleUtils";

export default function EmployeePickerModal({ date, locationId, postId, kind, onClose }: {
  date: string;
  locationId: number;
  postId: number;
  kind: ScheduleKind;
  onClose: () => void;
}) {
  const { employees, locations, posts, schedule, setSchedule } = useApp();
  const [search, setSearch] = useState("");

  const post = posts.find(p => p.id === postId);
  const loc = locations.find(l => l.id === locationId);
  const shift = post?.time || KIND_META[kind].shift;
  const hrs = shiftHours(shift);

  // Запись сотрудника на эту дату (в любом месте)
  const entryOf = (empId: number) => schedule.find(s => s.employeeId === empId && s.date === date);

  const q = search.toLowerCase();
  const list = employees
    .filter(e => !q || e.name.toLowerCase().includes(q) || e.rank.toLowerCase().includes(q))
    .map(e => {
      const en = entryOf(e.id);
      const busyElsewhere = en && en.kind !== "off" && !(en.locationId === locationId && en.postId === postId);
      const planningOff = en?.kind === "off";
      // Подработка: если по графику выходной либо статус выходной
      const willBeExtra = planningOff || e.status === "off" || e.status === "extra";
      return { e, en, busyElsewhere, planningOff, willBeExtra };
    })
    .sort((a, b) => {
      const rank = (x: typeof a) => x.busyElsewhere ? 2 : x.planningOff ? 1 : 0;
      return rank(a) - rank(b);
    });

  const assign = (empId: number, isExtra: boolean) => {
    setSchedule({
      employeeId: empId, date, kind,
      locationId, postId,
      shift,
      note: "",
      isExtra,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col section-enter" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-foreground">Кого поставить в смену</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {loc?.name} · {post?.name} · <span className="font-mono">{shift}</span> · {hrs}ч
              <span className={`ml-1.5 px-1.5 rounded border text-[10px] ${KIND_META[kind].badge}`}>{KIND_META[kind].label}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0"><Icon name="X" size={20} /></button>
        </div>

        {/* Поиск */}
        <div className="p-4 pb-2 shrink-0">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Найти сотрудника..."
              className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {list.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Никого не найдено</div>
          )}
          {list.map(({ e, en, busyElsewhere, planningOff, willBeExtra }) => {
            const otherLoc = busyElsewhere ? locations.find(l => l.id === en?.locationId) : null;
            return (
              <button
                key={e.id}
                disabled={busyElsewhere}
                onClick={() => assign(e.id, willBeExtra)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all
                  ${busyElsewhere
                    ? "border-border/40 bg-muted/20 opacity-50 cursor-not-allowed"
                    : "border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/40"}`}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                  {initials(e.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{e.rank}</span>
                    {busyElsewhere && (
                      <span className="text-[9px] px-1.5 rounded border border-border text-muted-foreground">
                        занят: {otherLoc?.name ?? "другой объект"}
                      </span>
                    )}
                    {planningOff && !busyElsewhere && (
                      <span className="text-[9px] px-1.5 rounded border border-border text-muted-foreground">по графику выходной</span>
                    )}
                  </div>
                </div>
                {willBeExtra && !busyElsewhere && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/40 shrink-0">
                    подработка ×{e.extraShiftRate}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-border shrink-0">
          <p className="text-[10px] text-muted-foreground text-center">
            Сотрудник в выходной ставится автоматически как подработка
          </p>
        </div>
      </div>
    </div>
  );
}
