import Icon from "@/components/ui/icon";

// ─── Types & helpers ──────────────────────────────────────────────────────────
export const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
export const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export type Period = "month" | "quarter" | "year";

// Генерируем исторические месяцы (6 мес назад → текущий)
export function getMonths(count = 6) {
  const now = new Date(2026, 4, 1); // май 2026
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }),
      labelFull: d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }),
    };
  });
}

// Синтетические данные по месяцам для каждой организации
// (В реальном проекте — из БД; здесь генерируем детерминировано по orgId + monthIndex)
export function syntheticMonthData(orgId: number, monthIdx: number) {
  const seed = orgId * 13 + monthIdx * 7;
  const baseEmps = [8, 2, 1][orgId - 1] ?? 3;
  const baseObjects = [3, 2, 1][orgId - 1] ?? 2;
  const coverage = 70 + ((seed * 3) % 28);          // 70–98%
  const attendance = 80 + ((seed * 5) % 18);         // 80–98%
  const incidents = (seed % 4);                       // 0–3
  const finesAmt = incidents * (300 + (seed % 5) * 400); // 0–2800
  const hoursWorked = baseEmps * 22 * 12 + (seed % 50);
  return { coverage, attendance, incidents, finesAmt, hoursWorked, baseObjects };
}

// ─── Bar ─────────────────────────────────────────────────────────────────────
export function Bar({ value, max, color, height = 80 }: { value: number; max: number; color: string; height?: number }) {
  const h = max === 0 ? 0 : Math.round((value / max) * height);
  return (
    <div className="flex flex-col items-center justify-end" style={{ height }}>
      <div
        className="w-full rounded-t transition-all duration-500"
        style={{ height: h, backgroundColor: color, minHeight: value > 0 ? 2 : 0 }}
      />
    </div>
  );
}

// ─── Trend badge ──────────────────────────────────────────────────────────────
export function Trend({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (prev === 0) return null;
  const diff = cur - prev;
  const sign = diff > 0 ? "+" : "";
  const isGood = invert ? diff < 0 : diff > 0;
  if (diff === 0) return <span className="text-[10px] text-muted-foreground font-mono">= 0%</span>;
  return (
    <span className={`text-[10px] font-mono flex items-center gap-0.5 ${isGood ? "text-emerald-400" : "text-red-400"}`}>
      <Icon name={diff > 0 ? "TrendingUp" : "TrendingDown"} size={10} />
      {sign}{Math.round(diff)}%
    </span>
  );
}
