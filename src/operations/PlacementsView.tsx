import { useState, useEffect } from "react";
import { useNow, fmtTime, fmtDuration, minutesSince } from "@/hooks/useNow";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { Post } from "@/types";
import { inputCls, postBadge } from "@/app/shared";
import { AssignModal, FineReasonsModal } from "@/app/modals";
import { parseShiftHours } from "@/sections/helpers";

// ─── Confirm Post Modal ───────────────────────────────────────────────────────
function ConfirmPostModal({ post, operatorName, onConfirm, onClose }: {
  post: Post;
  operatorName: string;
  onConfirm: (actualStartTime: string, confirmedBy: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [startTime, setStartTime] = useState(defaultTime);
  const [operator, setOperator] = useState(operatorName);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 w-full max-w-sm section-enter" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
          <Icon name="ClipboardCheck" size={22} className="text-emerald-400" />
        </div>
        <h3 className="font-bold text-lg text-foreground mb-1">Подтверждение заступления</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Пост: <span className="text-foreground font-medium">{post.name}</span> · {post.time}
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Фактическое время заступления</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Оператор (подтверждающий)</label>
            <input
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => { onConfirm(startTime, operator); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-colors"
          >
            Подтвердить заступление
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── Close Post Modal ─────────────────────────────────────────────────────────
function ClosePostModal({ post, onClose: onModalClose, onConfirm }: {
  post: Post;
  onClose: () => void;
  onConfirm: (hours: number, note: string, fine: Omit<import("@/types").FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;
}) {
  const { fineReasons } = useApp();
  const expectedHours = parseShiftHours(post.time);
  const [hours, setHours] = useState(expectedHours > 0 ? expectedHours : 12);
  const [note, setNote] = useState("");
  const [withFine, setWithFine] = useState(false);
  const [reasonId, setReasonId] = useState<number>(fineReasons[0]?.id ?? 1);
  const [fineAmt, setFineAmt] = useState<number>(fineReasons[0]?.amount ?? 500);
  const [fineNote, setFineNote] = useState("");

  const handleReason = (id: number) => {
    setReasonId(id);
    const r = fineReasons.find(r => r.id === id);
    if (r) setFineAmt(r.amount);
  };

  const handleSubmit = () => {
    const fine = withFine && post.officerId ? {
      employeeId: post.officerId,
      reasonId,
      note: fineNote,
      amount: fineAmt,
    } : null;
    onConfirm(hours, note, fine);
    onModalClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onModalClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md section-enter space-y-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon name="Timer" size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Закрытие смены</h3>
            <p className="text-xs text-muted-foreground">
              {post.name}
              {post.actualStartTime && <> · Заступил: <span className="font-mono">{post.actualStartTime}</span></>}
            </p>
          </div>
        </div>

        {/* Часы */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Фактически отработано часов</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setHours(h => Math.max(0.5, h - 0.5))} className="w-9 h-9 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center text-foreground">
              <Icon name="Minus" size={14} />
            </button>
            <input
              type="number" min={0.5} max={24} step={0.5}
              value={hours}
              onChange={e => setHours(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold text-foreground focus:outline-none focus:border-primary/50"
            />
            <button onClick={() => setHours(h => Math.min(24, h + 0.5))} className="w-9 h-9 rounded-xl bg-muted hover:bg-secondary flex items-center justify-center text-foreground">
              <Icon name="Plus" size={14} />
            </button>
          </div>
          {expectedHours > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              По графику: <span className="font-mono">{expectedHours} ч</span>
              {hours < expectedHours && <span className="text-amber-400 ml-2">↓ {(expectedHours - hours).toFixed(1)} ч недоработка</span>}
              {hours > expectedHours && <span className="text-emerald-400 ml-2">↑ {(hours - expectedHours).toFixed(1)} ч сверхурочно</span>}
            </p>
          )}
        </div>

        {/* Причина закрытия */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Причина закрытия (необязательно)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Комментарий к закрытию смены..."
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Штраф */}
        {post.officerId && (
          <div className={`rounded-xl border transition-all ${withFine ? "border-red-500/30 bg-red-500/5 p-3 space-y-3" : "border-border/40 bg-muted/20 p-3"}`}>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setWithFine(v => !v)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${withFine ? "bg-red-500 border-red-500" : "border-border"}`}
              >
                {withFine && <Icon name="Check" size={10} className="text-white" />}
              </div>
              <span className="text-sm text-foreground font-medium">Применить штраф к сотруднику</span>
            </label>

            {withFine && (
              <div className="space-y-2.5">
                {/* Причина штрафа */}
                {fineReasons.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Причина штрафа</label>
                    <div className="flex flex-wrap gap-1.5">
                      {fineReasons.map(r => (
                        <button key={r.id} onClick={() => handleReason(r.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${reasonId === r.id ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Сумма */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Сумма штрафа, ₽</label>
                  <input
                    type="number" min={0} step={100}
                    value={fineAmt}
                    onChange={e => setFineAmt(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-red-500/50"
                  />
                </div>
                {/* Комментарий штрафа */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Комментарий</label>
                  <input
                    type="text"
                    value={fineNote}
                    onChange={e => setFineNote(e.target.value)}
                    placeholder="Пояснение к штрафу..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Закрыть смену
          </button>
          <button onClick={onModalClose} className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary">Отмена</button>
        </div>
      </div>
    </div>
  );
}

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
