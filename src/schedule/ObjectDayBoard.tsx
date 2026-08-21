import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { ScheduleKind } from "@/types";
import { KIND_META, initials, shiftHours } from "@/schedule/scheduleUtils";
import EmployeePickerModal from "@/schedule/EmployeePickerModal";

export default function ObjectDayBoard({ date, locationId, editable }: {
  date: string;
  locationId: number;
  editable: boolean;
}) {
  const { posts, employees, schedule, setSchedule, removeSchedule } = useApp();
  const [picker, setPicker] = useState<{ postId: number; kind: ScheduleKind } | null>(null);

  const locPosts = posts.filter(p => p.locationId === locationId);
  // Смены этого объекта на эту дату
  const dayShifts = schedule.filter(s => s.date === date && s.kind !== "off" && s.locationId === locationId);

  const shiftsOfPost = (postId: number) => dayShifts.filter(s => s.postId === postId);

  // Напарники: кто ещё в этот день на этом объекте (кроме самого сотрудника)
  const mates = (empId: number) =>
    dayShifts
      .filter(s => s.employeeId !== empId)
      .map(s => employees.find(e => e.id === s.employeeId))
      .filter(Boolean);

  const empById = (id: number) => employees.find(e => e.id === id);

  const toggleExtra = (empId: number) => {
    const cur = schedule.find(s => s.employeeId === empId && s.date === date);
    if (!cur) return;
    setSchedule({
      employeeId: empId, date, kind: cur.kind, locationId: cur.locationId,
      postId: cur.postId, shift: cur.shift, note: cur.note, isExtra: !cur.isExtra,
    });
  };

  const dayTotal = dayShifts.reduce((s, e) => s + shiftHours(e.shift), 0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-2">
          <Icon name="LayoutGrid" size={16} className="text-primary" />
          <h3 className="font-semibold text-foreground">Посты объекта</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Закрыто <span className="font-mono text-emerald-400">{new Set(dayShifts.map(s => s.postId)).size}</span> / {locPosts.length}
          </span>
          <span className="text-muted-foreground">Всего <span className="font-mono text-foreground">{dayTotal}ч</span></span>
        </div>
      </div>

      {locPosts.length === 0 ? (
        <div className="py-12 text-center">
          <Icon name="ShieldOff" size={32} className="text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">У объекта нет постов</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Добавьте их в разделе «Объекты»</p>
        </div>
      ) : (
        <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {locPosts.map(post => {
            const list = shiftsOfPost(post.id);
            return (
              <div key={post.id} className={`rounded-xl border p-3 transition-all
                ${list.length > 0 ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
                {/* Заголовок поста */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{post.time}</p>
                  </div>
                  {list.length === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                      Не закрыт
                    </span>
                  )}
                </div>

                {/* Назначенные сотрудники */}
                <div className="space-y-1.5">
                  {list.map(s => {
                    const emp = empById(s.employeeId);
                    if (!emp) return null;
                    const hrs = shiftHours(s.shift);
                    const partners = mates(s.employeeId);
                    return (
                      <div key={s.id} className="rounded-lg bg-background/60 border border-border/60 p-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {initials(emp.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{emp.name}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className={`text-[9px] px-1.5 rounded border ${KIND_META[s.kind].badge}`}>
                                {KIND_META[s.kind].label}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground">{s.shift}</span>
                              <span className="text-[9px] font-mono text-foreground">· {hrs}ч</span>
                            </div>
                          </div>
                          {editable && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => toggleExtra(emp.id)}
                                title={s.isExtra ? "Снять подработку" : "Отметить как подработку"}
                                className={`text-[9px] font-semibold px-1.5 py-1 rounded border transition-all
                                  ${s.isExtra
                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                    : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                              >
                                {s.isExtra ? "Подработка" : "Обычная"}
                              </button>
                              <button
                                onClick={() => removeSchedule(emp.id, date)}
                                className="w-6 h-6 rounded border border-border bg-card text-muted-foreground hover:text-red-400 hover:border-red-400/40 flex items-center justify-center"
                              >
                                <Icon name="X" size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Напарники */}
                        {partners.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/50">
                            <Icon name="Users" size={10} className="text-muted-foreground shrink-0" />
                            <span className="text-[9px] text-muted-foreground truncate">
                              С ним: {partners.map(p => p!.name.split(" ")[0]).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Кнопки добавления */}
                {editable && (
                  <div className="flex gap-1.5 mt-2">
                    {(["day", "night"] as ScheduleKind[]).map(k => (
                      <button
                        key={k}
                        onClick={() => setPicker({ postId: post.id, kind: k })}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-[11px] text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Icon name="Plus" size={10} />
                        {KIND_META[k].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {picker && (
        <EmployeePickerModal
          date={date}
          locationId={locationId}
          postId={picker.postId}
          kind={picker.kind}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
