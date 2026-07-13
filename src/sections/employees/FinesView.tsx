import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { exportFinesPDF, exportFinesExcel, type FinesReportData } from "@/lib/export";
import { fmt, fmtDate } from "@/app/shared";

export function Fines() {
  const { fines, employees, posts, locations, fineReasons, currentOrg, holding } = useApp();
  const [filterEmp, setFilterEmp] = useState<number | "all">("all");
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportMenu, setExportMenu] = useState(false);

  const filtered = filterEmp === "all" ? fines : fines.filter(f => f.employeeId === filterEmp);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  const totalAll = fines.reduce((s, f) => s + f.amount, 0);
  const byEmp = employees
    .map(e => ({ e, total: fines.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0), cnt: fines.filter(f => f.employeeId === e.id).length }))
    .filter(x => x.cnt > 0)
    .sort((a, b) => b.total - a.total);

  const buildFinesData = (): FinesReportData => {
    const filterLabel = filterEmp === "all"
      ? "Все сотрудники"
      : employees.find(e => e.id === filterEmp)?.name ?? "—";

    const rows = sorted.map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      const post = posts.find(p => p.id === f.postId);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      const reason = fineReasons.find(r => r.id === f.reasonId);
      return {
        date: fmtDate(f.date),
        employeeName: emp?.name ?? "—",
        rank: emp?.rank ?? "—",
        postName: post?.name ?? "—",
        locationName: loc?.name ?? "—",
        reasonLabel: reason?.label ?? "—",
        note: f.note,
        amount: f.amount,
      };
    });

    const byEmployee = byEmp
      .filter(x => filterEmp === "all" || x.e.id === filterEmp)
      .map(x => ({ name: x.e.name, rank: x.e.rank, count: x.cnt, total: x.total }));

    return {
      orgName: currentOrg?.name ?? "—",
      orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name,
      generatedAt: new Date().toLocaleDateString("ru-RU"),
      filterLabel,
      rows,
      byEmployee,
      totalAmount: sorted.reduce((s, f) => s + f.amount, 0),
      totalCount: sorted.length,
    };
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    setExportMenu(false);
    await new Promise(r => setTimeout(r, 80));
    const data = buildFinesData();
    if (format === "pdf") exportFinesPDF(data);
    else exportFinesExcel(data);
    setExporting(null);
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Штрафы</h2>
          <p className="text-muted-foreground text-sm mt-1">История нарушений</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenu(v => !v)}
            disabled={!!exporting || fines.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {exporting
              ? <><Icon name="Loader2" size={15} className="animate-spin" /> Генерация...</>
              : <><Icon name="Download" size={15} /> Экспорт <Icon name="ChevronDown" size={12} /></>
            }
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 w-44">
              <button onClick={() => handleExport("pdf")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0"><Icon name="FileText" size={14} className="text-red-400" /></div>
                <div><p className="text-sm font-medium text-foreground">PDF</p><p className="text-[10px] text-muted-foreground">Готовый документ</p></div>
              </button>
              <div className="h-px bg-border mx-3" />
              <button onClick={() => handleExport("xlsx")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Icon name="Table" size={14} className="text-emerald-400" /></div>
                <div><p className="text-sm font-medium text-foreground">Excel</p><p className="text-[10px] text-muted-foreground">3 листа с данными</p></div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ label: "Всего нарушений", val: fines.length, icon: "BadgeAlert", c: "text-red-400", bg: "bg-red-500/10" }, { label: "Сумма штрафов", val: fmt(totalAll), icon: "CircleDollarSign", c: "text-amber-400", bg: "bg-amber-500/10" }, { label: "Нарушителей", val: byEmp.length, icon: "Users", c: "text-primary", bg: "bg-primary/10" }].map(s => (
          <div key={s.label} className="stat-card"><div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><Icon name={s.icon} size={20} className={s.c} /></div><div className={`text-2xl font-bold font-mono ${s.c} mb-1`}>{s.val}</div><div className="text-sm text-muted-foreground">{s.label}</div></div>
        ))}
      </div>

      {byEmp.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Топ нарушителей</h3>
          <div className="space-y-2">{byEmp.map((x, i) => (
            <div key={x.e.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">{x.e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{x.e.name}</p><p className="text-xs text-muted-foreground">{x.cnt} нарушений</p></div>
              <span className="text-sm font-mono font-semibold text-red-400">{fmt(x.total)}</span>
            </div>
          ))}</div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
          <h3 className="font-semibold text-foreground mr-2">История</h3>
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value === "all" ? "all" : Number(e.target.value))} className="bg-muted border border-border rounded-xl px-3 py-1.5 text-sm text-foreground focus:outline-none">
            <option value="all">Все сотрудники</option>
            {employees.filter(e => fines.some(f => f.employeeId === e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{sorted.length} записей</span>
        </div>
        {sorted.length === 0 ? <div className="py-12 text-center"><Icon name="CheckCircle2" size={36} className="text-emerald-400 mx-auto mb-3 opacity-60" /><p className="text-sm text-muted-foreground">Нарушений не зафиксировано</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-border">{["Дата", "Сотрудник", "Пост / Объект", "Причина", "Примечание", "Штраф"].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>)}</tr></thead>
            <tbody>{sorted.map(f => {
              const emp = employees.find(e => e.id === f.employeeId);
              const post = posts.find(p => p.id === f.postId);
              const loc = post ? locations.find(l => l.id === post.locationId) : null;
              const reason = fineReasons.find(r => r.id === f.reasonId);
              return (
                <tr key={f.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{fmtDate(f.date)}</td>
                  <td className="px-5 py-4">{emp ? <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{emp.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><span className="text-sm text-foreground">{emp.name}</span></div> : <span className="text-sm text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-4"><p className="text-sm text-foreground">{post?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{loc?.name ?? "—"}</p></td>
                  <td className="px-5 py-4">{reason ? <span className={`text-xs px-2 py-1 rounded-lg border font-medium ${reason.color}`}>{reason.label}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground max-w-[140px] truncate">{f.note || "—"}</td>
                  <td className="px-5 py-4 text-sm font-mono font-semibold text-red-400 whitespace-nowrap">{fmt(f.amount)}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr className="border-t border-border bg-muted/30"><td colSpan={5} className="px-5 py-3 text-sm font-semibold text-foreground text-right">Итого:</td><td className="px-5 py-3 text-sm font-mono font-bold text-red-400">{fmt(sorted.reduce((s, f) => s + f.amount, 0))}</td></tr></tfoot>
          </table></div>
        )}
      </div>
    </div>
  );
}

