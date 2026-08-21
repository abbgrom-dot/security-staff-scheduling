import Icon from "@/components/ui/icon";

export { Analytics } from "@/analytics/AnalyticsSection";

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