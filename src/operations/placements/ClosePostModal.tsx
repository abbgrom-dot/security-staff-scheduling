import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import type { Post } from "@/types";
import { parseShiftHours } from "@/sections/helpers";

// ─── Close Post Modal ─────────────────────────────────────────────────────────
export function ClosePostModal({ post, onClose: onModalClose, onConfirm }: {
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
