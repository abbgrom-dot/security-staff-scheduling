export function Schedule() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const sched: Record<string, (string | null)[]> = {
    "Иванов С.А.": ["Дн", "Дн", null, null, "Дн", "Дн", null],
    "Петров А.В.": ["Дн", null, "Дн", "Дн", null, null, "Дн"],
    "Смирнова Е.К.": ["Ноч", "Ноч", null, null, "Ноч", null, null],
    "Козлов Д.И.": [null, null, "Дн", "Дн", null, "Дн", "Дн"],
    "Николаева И.Р.": ["Дн", "Дн", "Дн", null, null, null, "Дн"],
    "Волков П.С.": [null, null, null, null, null, null, null],
    "Морозов А.Г.": ["Дн", null, null, "Дн", "Дн", "Дн", null],
    "Фёдорова Н.В.": ["Ноч", null, "Ноч", "Ноч", null, null, "Ноч"],
  };
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">График смен</h2><p className="text-muted-foreground text-sm mt-1">5 — 11 мая 2026</p></div>
      <div className="bg-card border border-border rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[600px]">
        <thead><tr className="border-b border-border"><th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">Сотрудник</th>
          {days.map((d, i) => <th key={d} className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 ${i === 2 ? "text-primary" : "text-muted-foreground"}`}>{d}{i === 2 && <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}</th>)}
        </tr></thead>
        <tbody>{Object.entries(sched).map(([name, shifts]) => (
          <tr key={name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
            <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{name}</td>
            {shifts.map((s, ci) => <td key={ci} className="px-2 py-3 text-center">
              {s === "Дн" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-primary/20 text-primary text-xs font-mono font-semibold">Дн</span>}
              {s === "Ноч" && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">Ноч</span>}
              {s === null && <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-muted/50"><span className="w-1.5 h-1.5 rounded-full bg-border" /></span>}
            </td>)}
          </tr>
        ))}</tbody>
      </table></div></div>
    </div>
  );
}

