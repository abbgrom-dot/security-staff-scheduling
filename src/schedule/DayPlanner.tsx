import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { ScheduleKind } from "@/types";
import { KIND_META } from "@/schedule/scheduleUtils";

export default function DayPlanner({ date, editable }: { date: string; editable: boolean }) {
  const { employees, locations, posts, schedule, setSchedule, removeSchedule } = useApp();

  const entryFor = (empId: number) => schedule.find(s => s.employeeId === empId && s.date === date);

  const setKind = (empId: number, kind: ScheduleKind) => {
    const cur = entryFor(empId);
    if (kind === "off") {
      setSchedule({ employeeId: empId, date, kind: "off", locationId: null, postId: null, shift: KIND_META.off.shift, note: "" });
      return;
    }
    // Смена: сохраняем прежний объект/пост, если были
    setSchedule({
      employeeId: empId, date, kind,
      locationId: cur?.locationId ?? locations[0]?.id ?? null,
      postId: cur?.postId ?? null,
      shift: KIND_META[kind].shift,
      note: cur?.note ?? "",
    });
  };

  const setLocation = (empId: number, locationId: number) => {
    const cur = entryFor(empId);
    if (!cur) return;
    setSchedule({ employeeId: empId, date, kind: cur.kind, locationId, postId: null, shift: cur.shift, note: cur.note });
  };

  const setPost = (empId: number, postId: number | null) => {
    const cur = entryFor(empId);
    if (!cur) return;
    setSchedule({ employeeId: empId, date, kind: cur.kind, locationId: cur.locationId, postId, shift: cur.shift, note: cur.note });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[520px]">
      {employees.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">Нет сотрудников</div>
      )}
      {employees.map(emp => {
        const e = entryFor(emp.id);
        const kind = e?.kind ?? null;
        const locPosts = e && e.kind !== "off" && e.locationId
          ? posts.filter(p => p.locationId === e.locationId)
          : [];
        return (
          <div key={emp.id} className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                <p className="text-[10px] text-muted-foreground">{emp.rank}</p>
              </div>
              {/* Переключатель типа дня */}
              <div className="flex gap-1 shrink-0">
                {(["day", "night", "off"] as ScheduleKind[]).map(k => (
                  <button
                    key={k}
                    disabled={!editable}
                    onClick={() => setKind(emp.id, k)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      ${kind === k ? KIND_META[k].badge : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    {KIND_META[k].short}
                  </button>
                ))}
                {e && editable && (
                  <button
                    onClick={() => removeSchedule(emp.id, date)}
                    title="Убрать из графика"
                    className="w-7 h-7 rounded-lg border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-400/40 flex items-center justify-center"
                  >
                    <Icon name="X" size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Объект + пост (только для смены) */}
            {e && e.kind !== "off" && (
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <select
                  value={e.locationId ?? ""}
                  disabled={!editable}
                  onChange={ev => setLocation(emp.id, Number(ev.target.value))}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  <option value="">— Объект —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select
                  value={e.postId ?? ""}
                  disabled={!editable || !e.locationId}
                  onChange={ev => setPost(emp.id, ev.target.value ? Number(ev.target.value) : null)}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-50"
                >
                  <option value="">— Пост (любой) —</option>
                  {locPosts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
