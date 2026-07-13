import Icon from "@/components/ui/icon";

export function Analytics() {
  const data = [{ l: "Пн", d: 6, n: 2 }, { l: "Вт", d: 5, n: 3 }, { l: "Ср", d: 7, n: 1 }, { l: "Чт", d: 4, n: 4 }, { l: "Пт", d: 6, n: 2 }, { l: "Сб", d: 3, n: 3 }, { l: "Вс", d: 4, n: 2 }];
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Аналитика</h2><p className="text-muted-foreground text-sm mt-1">Статистика смен</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Часов отработано", value: "1 248ч", trend: "+8%" }, { label: "Средняя явка", value: "94%", trend: "+2%" }, { label: "Покрытие постов", value: "87%", trend: "-3%" }, { label: "Инциденты", value: "2 шт", trend: "=0" }].map(k => (
          <div key={k.label} className="stat-card"><div className="text-2xl font-bold font-mono text-foreground mb-0.5">{k.value}</div><div className="text-xs text-muted-foreground mb-2">{k.label}</div><div className={`text-xs font-mono ${k.trend.startsWith("+") ? "text-emerald-400" : k.trend.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>{k.trend}</div></div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-6">Смены по дням</h3>
        <div className="flex items-end gap-3" style={{ height: "140px" }}>
          {data.map(d => (<div key={d.l} className="flex-1 flex flex-col items-center gap-1 h-full">
            <div className="w-full flex flex-col-reverse gap-0.5 flex-1">
              <div className="w-full rounded-t bg-primary/40" style={{ height: `${(d.d / 10) * 100}%` }} />
              <div className="w-full rounded-t bg-indigo-500/40" style={{ height: `${(d.n / 10) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{d.l}</span>
          </div>))}
        </div>
      </div>
    </div>
  );
}

export function ExportPage() {
  return (
    <div className="section-enter space-y-6">
      <div><h2 className="text-2xl font-bold text-foreground">Экспорт</h2><p className="text-muted-foreground text-sm mt-1">Выгрузка данных</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[{ label: "Excel (.xlsx)", icon: "Table", desc: "Таблица смен" }, { label: "PDF отчёт", icon: "FileText", desc: "Документ с печатью" }, { label: "CSV данные", icon: "Database", desc: "Для интеграции" }, { label: "Отчёт по штрафам", icon: "BadgeAlert", desc: "История нарушений" }].map(f => (
          <button key={f.label} className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><Icon name={f.icon} size={22} className="text-primary" /></div>
              <div className="flex-1"><p className="font-semibold text-foreground">{f.label}</p><p className="text-xs text-muted-foreground">{f.desc}</p></div>
              <Icon name="Download" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
