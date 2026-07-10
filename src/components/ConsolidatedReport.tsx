import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import { exportPDF, exportExcel, type ExportReportData } from "@/lib/export";
import { pct, type Period, getMonths, syntheticMonthData } from "@/components/report/shared";
import MonthlyView from "@/components/report/MonthlyView";
import QuarterlyView from "@/components/report/QuarterlyView";
import SummaryView from "@/components/report/SummaryView";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsolidatedReport() {
  const { orgs, allLocations, allEmployees, allPosts, allFines } = useApp();

  const [period, setPeriod] = useState<Period>("month");
  const [activeOrgs, setActiveOrgs] = useState<Set<number>>(new Set(orgs.map(o => o.id)));
  const [metric, setMetric] = useState<"coverage" | "fines" | "incidents" | "attendance">("coverage");

  const months = getMonths(6);
  const quarters = [
    { key: "Q1-2026", label: "I кв. 2026", months: ["2026-01", "2026-02", "2026-03"] },
    { key: "Q2-2026", label: "II кв. 2026", months: ["2026-04", "2026-05"] },
  ];

  const toggleOrg = (id: number) => setActiveOrgs(prev => {
    const next = new Set(prev);
    if (next.has(id)) { if (next.size > 1) next.delete(id); }
    else next.add(id);
    return next;
  });

  // ── Real-time snapshot (current state) ────────────────────────────────────
  const snapshot = orgs.map(org => {
    const locs = allLocations.filter(l => l.orgId === org.id);
    const emps = allEmployees.filter(e => e.orgId === org.id);
    const posts = allPosts.filter(p => p.orgId === org.id);
    const fines = allFines.filter(f => f.orgId === org.id);
    const covered = posts.filter(p => p.status === "covered").length;
    const active = emps.filter(e => e.status === "active").length;
    return {
      org,
      locs: locs.length,
      emps: emps.length,
      posts: posts.length,
      covered,
      active,
      finesTotal: fines.reduce((s, f) => s + f.amount, 0),
      finesCnt: fines.length,
      coveragePct: pct(covered, posts.length),
      attendancePct: pct(active, emps.length),
    };
  });

  // ── Historical monthly data ────────────────────────────────────────────────
  const monthlyData = months.map((m, mi) => {
    const orgRows = orgs.map(org => {
      const d = syntheticMonthData(org.id, mi);
      // Overlay real fines for month if they match (by date prefix)
      const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(m.key));
      const realFinesAmt = realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt;
      const realIncidents = realFines.length > 0 ? realFines.length : d.incidents;
      return { orgId: org.id, ...d, finesAmt: realFinesAmt, incidents: realIncidents };
    });
    return { month: m, orgs: orgRows };
  });

  // ── Comparison table rows ─────────────────────────────────────────────────
  const compRows = orgs.map(org => {
    const monthRows = monthlyData.map(md => md.orgs.find(o => o.orgId === org.id)!);
    const last = monthRows[monthRows.length - 1];
    const prev = monthRows[monthRows.length - 2];
    return { org, months: monthRows, last, prev };
  }).filter(r => activeOrgs.has(r.org.id));

  // ── Chart data (selected metric across all months) ────────────────────────
  const metricLabel = { coverage: "Покрытие постов, %", fines: "Штрафы, ₽", incidents: "Нарушения", attendance: "Явка персонала, %" }[metric];
  const metricKey = metric === "fines" ? "finesAmt" : metric === "incidents" ? "incidents" : metric === "coverage" ? "coverage" : "attendance";
  const chartData = months.map((m, mi) => ({
    month: m,
    values: orgs.filter(o => activeOrgs.has(o.id)).map(org => {
      const d = syntheticMonthData(org.id, mi);
      const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(m.key));
      const val = metric === "fines" ? (realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt)
        : metric === "incidents" ? (realFines.length > 0 ? realFines.length : d.incidents)
        : metric === "coverage" ? d.coverage
        : d.attendance;
      return { org, val };
    }),
  }));
  const chartMax = Math.max(...chartData.flatMap(d => d.values.map(v => v.val)), 1);

  // ── Quarter aggregates ────────────────────────────────────────────────────
  const quarterData = quarters.map(q => ({
    quarter: q,
    orgs: orgs.map(org => {
      const monthIdxs = q.months.map(mk => months.findIndex(m => m.key === mk)).filter(i => i >= 0);
      const rows = monthIdxs.map(i => syntheticMonthData(org.id, i));
      return {
        orgId: org.id,
        coverage: Math.round(rows.reduce((s, r) => s + r.coverage, 0) / (rows.length || 1)),
        finesAmt: rows.reduce((s, r) => s + r.finesAmt, 0),
        incidents: rows.reduce((s, r) => s + r.incidents, 0),
        attendance: Math.round(rows.reduce((s, r) => s + r.attendance, 0) / (rows.length || 1)),
        hoursWorked: rows.reduce((s, r) => s + r.hoursWorked, 0),
      };
    }),
  }));

  const METRICS = [
    { key: "coverage",   label: "Покрытие",  icon: "ShieldCheck" },
    { key: "attendance", label: "Явка",       icon: "UserCheck" },
    { key: "fines",      label: "Штрафы",     icon: "BadgeAlert" },
    { key: "incidents",  label: "Нарушения",  icon: "AlertTriangle" },
  ] as const;

  // ── Export helpers ────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { holding } = useApp();

  const buildExportData = (): ExportReportData => {
    const periodLabel =
      period === "month" ? "Январь — Май 2026 (по месяцам)"
      : period === "quarter" ? "I–II квартал 2026"
      : "Сводная оценка 2026";

    const visibleOrgs = orgs.filter(o => activeOrgs.has(o.id));

    const summaryRows = visibleOrgs.map(org => {
      const yearData = monthlyData.map(md => md.orgs.find(o => o.orgId === org.id)!);
      const avgCov = Math.round(yearData.reduce((a, d) => a + d.coverage, 0) / yearData.length);
      const avgAtt = Math.round(yearData.reduce((a, d) => a + d.attendance, 0) / yearData.length);
      const totInc = yearData.reduce((a, d) => a + d.incidents, 0);
      const totFines = yearData.reduce((a, d) => a + d.finesAmt, 0);
      const totHours = yearData.reduce((a, d) => a + d.hoursWorked, 0);
      const score = Math.round(avgCov * 0.4 + avgAtt * 0.4 + Math.max(0, 100 - totInc * 10) * 0.2);
      const grade = score >= 90 ? "A" : score >= 75 ? "B" : "C";
      return { orgName: org.name, orgColor: org.color, coverage: avgCov, attendance: avgAtt, incidents: totInc, finesAmt: totFines, hoursWorked: totHours, score, grade };
    });

    const totalCoverage = Math.round(summaryRows.reduce((s, r) => s + r.coverage, 0) / Math.max(summaryRows.length, 1));
    const totalAttendance = Math.round(summaryRows.reduce((s, r) => s + r.attendance, 0) / Math.max(summaryRows.length, 1));
    const totalIncidents = summaryRows.reduce((s, r) => s + r.incidents, 0);
    const totalFines = summaryRows.reduce((s, r) => s + r.finesAmt, 0);
    const totalHours = summaryRows.reduce((s, r) => s + r.hoursWorked, 0);

    const monthlyRows = visibleOrgs.map(org => {
      const rows = monthlyData.map(md => md.orgs.find(o => o.orgId === org.id)!);
      return {
        orgName: org.name,
        coverage: rows.map(r => r.coverage),
        attendance: rows.map(r => r.attendance),
        incidents: rows.map(r => r.incidents),
        finesAmt: rows.map(r => r.finesAmt),
      };
    });

    return {
      holdingName: holding.name,
      inn: holding.inn,
      generatedAt: new Date().toLocaleDateString("ru-RU"),
      period: periodLabel,
      summaryRows,
      monthLabels: months.map(m => m.label),
      monthlyRows,
      totalCoverage,
      totalAttendance,
      totalIncidents,
      totalFines,
      totalHours,
    };
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    setExportMenuOpen(false);
    // small delay to let the UI show loading state
    await new Promise(r => setTimeout(r, 80));
    const data = buildExportData();
    if (format === "pdf") exportPDF(data);
    else exportExcel(data);
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Controls ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Period tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
          {([["month", "По месяцам"], ["quarter", "По кварталам"], ["year", "Сводная"]] as [Period, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${period === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {/* Org filter */}
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => toggleOrg(org.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${activeOrgs.has(org.id) ? "text-foreground border-transparent" : "text-muted-foreground border-border bg-muted/30"}`}
              style={activeOrgs.has(org.id) ? { backgroundColor: org.color + "20", borderColor: org.color + "60", color: org.color } : undefined}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: activeOrgs.has(org.id) ? org.color : "#666" }} />
              {org.shortName}
            </button>
          ))}

          {/* Export button */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              disabled={!!exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {exporting
                ? <><Icon name="Loader2" size={14} className="animate-spin" /> Генерация...</>
                : <><Icon name="Download" size={14} /> Экспорт <Icon name="ChevronDown" size={12} /></>
              }
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50 w-44">
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Icon name="FileText" size={14} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">PDF</p>
                    <p className="text-[10px] text-muted-foreground">Готовый документ</p>
                  </div>
                </button>
                <div className="h-px bg-border mx-3" />
                <button
                  onClick={() => handleExport("xlsx")}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Icon name="Table" size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Excel</p>
                    <p className="text-[10px] text-muted-foreground">5 листов с данными</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MONTHLY VIEW ────────────────────────────────────────────────────── */}
      {period === "month" && (
        <MonthlyView
          orgs={orgs}
          activeOrgs={activeOrgs}
          metric={metric}
          setMetric={setMetric}
          metricLabel={metricLabel}
          metricKey={metricKey}
          chartData={chartData}
          chartMax={chartMax}
          months={months}
          compRows={compRows}
          METRICS={METRICS}
        />
      )}

      {/* ── QUARTERLY VIEW ──────────────────────────────────────────────────── */}
      {period === "quarter" && (
        <QuarterlyView
          orgs={orgs}
          activeOrgs={activeOrgs}
          quarterData={quarterData}
        />
      )}

      {/* ── SUMMARY (YEAR) VIEW ──────────────────────────────────────────────── */}
      {period === "year" && (
        <SummaryView
          activeOrgs={activeOrgs}
          snapshot={snapshot}
          monthlyData={monthlyData}
        />
      )}
    </div>
  );
}