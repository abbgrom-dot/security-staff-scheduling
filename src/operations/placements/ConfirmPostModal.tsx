import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Post } from "@/types";
import { inputCls } from "@/app/shared";

// ─── Confirm Post Modal ───────────────────────────────────────────────────────
export function ConfirmPostModal({ post, operatorName, onConfirm, onClose }: {
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

