import { useState, useEffect } from "react";
import { useNow, fmtTime, fmtDuration, minutesSince } from "@/hooks/useNow";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { Post } from "@/types";
import { postBadge } from "@/app/shared";
import { AssignModal, FineReasonsModal } from "@/app/modals";
import { parseShiftHours } from "@/sections/helpers";
import { ConfirmPostModal } from "@/operations/placements/ConfirmPostModal";
import { ClosePostModal } from "@/operations/placements/ClosePostModal";


export function Placements() {
  const { locations, posts, employees, assignPost, confirmPost, closePost, can, session } = useApp();
  const canEdit = can("placements:edit");
  const now = useNow(60_000); // обновляется каждую минуту
  const [assignPost2, setAssignPost2] = useState<Post | null>(null);
  const [confirmingPost, setConfirmingPost] = useState<Post | null>(null);
  const [closingPost, setClosingPost] = useState<Post | null>(null);
  const [fineSettings, setFineSettings] = useState(false);

  const operatorName = session?.user.name ?? "Оператор";

  // Автозакрытие смены по расписанию объекта
  useEffect(() => {
    const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    posts.forEach(p => {
      // Только подтверждённые, ещё не закрытые посты
      if (p.confirmedAt === null || p.actualHours !== null) return;
      // Парсим время окончания смены из post.time (формат "HH:MM – HH:MM")
      const m = p.time.match(/(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})/);
      if (!m) return;
      const endTime = `${m[3]}:${m[4]}`;
      // Если текущее время >= времени окончания
      if (nowStr >= endTime) {
        const expectedHours = parseShiftHours(p.time);
        closePost(p.id, expectedHours > 0 ? expectedHours : 12, "auto", "Закрыто автоматически по расписанию", null);
      }
    });
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary stats
  const confirmed = posts.filter(p => p.confirmedAt !== null).length;
  const covered = posts.filter(p => p.status === "covered").length;
  const pending = covered - confirmed;

  if (locations.length === 0) return (
    <div className="section-enter text-center py-20">
      <Icon name="MapPin" size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-muted-foreground">Добавьте объекты в разделе «Объекты»</p>
    </div>
  );

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Расстановки</h2>
          <p className="text-muted-foreground text-sm mt-1">Назначение и подтверждение заступления на посты</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Живые часы */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-mono font-semibold text-foreground">{fmtTime(now)}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">сейчас</span>
          </div>
          {canEdit && (
            <button onClick={() => setFineSettings(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors">
              <Icon name="Settings2" size={15} /> Причины штрафов
            </button>
          )}
        </div>
      </div>

      {/* Confirmation summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Постов назначено", val: covered, icon: "UserCheck", c: "text-primary", bg: "bg-primary/10" },
          { label: "Подтверждено", val: confirmed, icon: "ClipboardCheck", c: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Ожидают подтверждения", val: pending, icon: "Clock", c: pending > 0 ? "text-amber-400" : "text-muted-foreground", bg: pending > 0 ? "bg-amber-500/10" : "bg-muted/40" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <Icon name={s.icon} size={18} className={s.c} />
            </div>
            <div>
              <div className={`text-xl font-bold font-mono ${s.c}`}>{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Location groups */}
      {locations.map(loc => {
        const lp = posts.filter(p => p.locationId === loc.id);
        const locConfirmed = lp.filter(p => p.confirmedAt !== null).length;
        return (
          <div key={loc.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Icon name="Building2" size={16} className="text-primary" />
              <h3 className="font-semibold text-foreground">{loc.name}</h3>
              <span className="text-xs text-muted-foreground font-mono ml-1">
                {lp.filter(p => p.status === "covered").length}/{lp.length} закрыто
              </span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full border font-mono
                 border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
                {locConfirmed}/{lp.filter(p => p.status === "covered").length} подтверждено
              </span>
            </div>

            {lp.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Посты не назначены</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {lp.map(post => {
                  const emp = employees.find(e => e.id === post.officerId);
                  const isConfirmed = post.confirmedAt !== null;
                  const isClosed = post.actualHours !== null;

                  return (
                    <div
                      key={post.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isClosed         ? "border-blue-500/20 bg-blue-500/5" :
                        isConfirmed      ? "border-emerald-500/30 bg-emerald-500/8" :
                        post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5" :
                        post.status === "alert"   ? "border-red-500/30 bg-red-500/5" :
                                                    "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >
                      {/* Post header */}
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="font-medium text-sm text-foreground">{post.name}</span>
                        {isClosed
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20 font-medium">Закрыта</span>
                          : isConfirmed
                          ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                              <Icon name="CheckCircle2" size={9} />Подтверждён
                            </span>
                          : postBadge(post.status)
                        }
                      </div>

                      {/* Schedule time */}
                      <p className="text-xs text-muted-foreground font-mono mb-2">{post.time}</p>

                      {/* Employee row */}
                      {emp ? (
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <span className="text-xs text-foreground truncate">{emp.name}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mb-2.5">
                          <Icon name="UserX" size={11} /> Не назначен
                        </p>
                      )}

                      {/* Confirmation details */}
                      {isConfirmed && (
                        <div className="mb-2.5 space-y-0.5">
                          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Icon name="Clock" size={9} />
                            Заступил: <span className="font-mono font-semibold">{post.actualStartTime}</span>
                            {post.confirmedAt && !isClosed && (
                              <span className="text-muted-foreground ml-1">
                                ({fmtDuration(minutesSince(post.confirmedAt))} на посту)
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Icon name="User" size={9} />
                            Оператор: {post.confirmedBy}
                          </p>
                          {isClosed && (
                            <>
                              <p className="text-[10px] text-blue-400 flex items-center gap-1">
                                <Icon name="Timer" size={9} />
                                Отработано: <span className="font-mono font-semibold">{post.actualHours} ч</span>
                                {post.closeReason === "auto" && <span className="text-muted-foreground/70">(авто)</span>}
                                {post.closeReason === "manual" && <span className="text-muted-foreground/70">(вручную)</span>}
                              </p>
                              {post.closeNote && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Icon name="MessageSquare" size={9} />
                                  {post.closeNote}
                                </p>
                              )}
                            </>
                          )}
                          {/* Подработка */}
                          {post.isExtraShift && (
                            <p className="text-[10px] text-purple-400 flex items-center gap-1">
                              <Icon name="Star" size={9} />
                              Подработка
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {canEdit && (
                        <div className="flex gap-1.5 mt-1">
                          {/* Assign/Replace */}
                          {!isConfirmed && (
                            <button
                              onClick={() => setAssignPost2(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Icon name="UserCog" size={11} />
                              {emp ? "Заменить" : "Назначить"}
                            </button>
                          )}

                          {/* Confirm button — only if assigned and not confirmed */}
                          {emp && !isConfirmed && (
                            <button
                              onClick={() => setConfirmingPost(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs text-emerald-400 font-medium transition-all"
                            >
                              <Icon name="ClipboardCheck" size={11} />
                              Подтвердить
                            </button>
                          )}

                          {/* Close shift — only if confirmed and not closed */}
                          {isConfirmed && !isClosed && (
                            <button
                              onClick={() => setClosingPost(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 border border-primary/30 hover:bg-primary/20 text-xs text-primary font-medium transition-all"
                            >
                              <Icon name="Timer" size={11} />
                              Закрыть смену
                            </button>
                          )}

                          {/* Re-assign after close */}
                          {isClosed && (
                            <button
                              onClick={() => setAssignPost2(post)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-background/60 border border-border/60 hover:border-primary/40 text-xs text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Icon name="RefreshCw" size={11} />
                              Новая смена
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {assignPost2 && (
        <AssignModal post={assignPost2} onAssign={assignPost} onClose={() => setAssignPost2(null)} />
      )}
      {confirmingPost && (
        <ConfirmPostModal
          post={confirmingPost}
          operatorName={operatorName}
          onConfirm={(t, by) => confirmPost(confirmingPost.id, t, by)}
          onClose={() => setConfirmingPost(null)}
        />
      )}
      {closingPost && (
        <ClosePostModal
          post={closingPost}
          onConfirm={(h, note, fine) => closePost(closingPost.id, h, "manual", note, fine)}
          onClose={() => setClosingPost(null)}
        />
      )}
      {fineSettings && <FineReasonsModal onClose={() => setFineSettings(false)} />}
    </div>
  );
}

// ─── Employee Modal ───────────────────────────────────────────────────────────
