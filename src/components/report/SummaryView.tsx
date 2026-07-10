import type { Organization } from "@/types";
import { fmt, syntheticMonthData } from "./shared";

type MonthRow = ReturnType<typeof syntheticMonthData> & { orgId: number };

interface SnapshotRow {
  org: Organization;
  locs: number;
  emps: number;
  posts: number;
  covered: number;
  active: number;
  finesTotal: number;
  finesCnt: number;
  coveragePct: number;
  attendancePct: number;
}

interface MonthlyDatum {
  orgs: MonthRow[];
}

export default function SummaryView({
  activeOrgs, snapshot, monthlyData,
}: {
  activeOrgs: Set<number>;
  snapshot: SnapshotRow[];
  monthlyData: MonthlyDatum[];
}) {
  return (
    <div className="space-y-5">
      {/* Scorecards per org */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {snapshot.filter(s => activeOrgs.has(s.org.id)).map(s => {
          // compute yearly aggregates from all 6 months
          const yearData = monthlyData.map(md => md.orgs.find(o => o.orgId === s.org.id)!);
          const avgCoverage = Math.round(yearData.reduce((acc, d) => acc + d.coverage, 0) / yearData.length);
          const avgAttendance = Math.round(yearData.reduce((acc, d) => acc + d.attendance, 0) / yearData.length);
          const totalIncidents = yearData.reduce((acc, d) => acc + d.incidents, 0);
          const totalFinesAmt = yearData.reduce((acc, d) => acc + d.finesAmt, 0);
          const totalHours = yearData.reduce((acc, d) => acc + d.hoursWorked, 0);

          // Grade
          const score = avgCoverage * 0.4 + avgAttendance * 0.4 + Math.max(0, 100 - totalIncidents * 10) * 0.2;
          const grade = score >= 90 ? { label: "A", color: "#10b981" } : score >= 75 ? { label: "B", color: "#6366f1" } : { label: "C", color: "#f59e0b" };

          return (
            <div key={s.org.id} className="bg-card border border-border rounded-xl overflow-hidden" style={{ borderTopColor: s.org.color, borderTopWidth: 3 }}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: s.org.color }}>
                      {s.org.shortName.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{s.org.shortName}</p>
                      <p className="text-[10px] text-muted-foreground">2026 (янв — май)</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ backgroundColor: grade.color + "20", color: grade.color }}>
                    {grade.label}
                  </div>
                </div>

                {/* KPIs */}
                <div className="space-y-3">
                  {[
                    { label: "Покрытие постов", val: avgCoverage + "%", pctVal: avgCoverage, color: avgCoverage >= 90 ? "#10b981" : s.org.color },
                    { label: "Явка персонала", val: avgAttendance + "%", pctVal: avgAttendance, color: "#10b981" },
                  ].map(k => (
                    <div key={k.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{k.label}</span>
                        <span className="font-mono text-foreground font-semibold">{k.val}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${k.pctVal}%`, backgroundColor: k.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold font-mono text-foreground">{totalIncidents}</p>
                    <p className="text-[9px] text-muted-foreground">наруш.</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold font-mono text-red-400">{totalFinesAmt === 0 ? "—" : totalFinesAmt > 9999 ? Math.round(totalFinesAmt / 1000) + "к₽" : totalFinesAmt + "₽"}</p>
                    <p className="text-[9px] text-muted-foreground">штрафы</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold font-mono text-foreground">{Math.round(totalHours / 1000)}к</p>
                    <p className="text-[9px] text-muted-foreground">часов</p>
                  </div>
                </div>

                {/* Mini sparkline */}
                <div className="mt-4 pt-3 border-t border-border/50">
                  <p className="text-[9px] text-muted-foreground mb-1.5 uppercase tracking-wider">Покрытие по месяцам</p>
                  <div className="flex items-end gap-0.5" style={{ height: 28 }}>
                    {yearData.map((d, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: `${(d.coverage / 100) * 28}px`, backgroundColor: s.org.color, opacity: 0.4 + i * 0.1 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Рейтинг эффективности</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Взвешенная оценка: 40% покрытие + 40% явка + 20% дисциплина</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["#", "Организация", "Покрытие", "Явка", "Нарушения", "Штрафы", "Оценка"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot
                .filter(s => activeOrgs.has(s.org.id))
                .map(s => {
                  const yearData = monthlyData.map(md => md.orgs.find(o => o.orgId === s.org.id)!);
                  const avgCov = Math.round(yearData.reduce((a, d) => a + d.coverage, 0) / yearData.length);
                  const avgAtt = Math.round(yearData.reduce((a, d) => a + d.attendance, 0) / yearData.length);
                  const totInc = yearData.reduce((a, d) => a + d.incidents, 0);
                  const totFines = yearData.reduce((a, d) => a + d.finesAmt, 0);
                  const score = Math.round(avgCov * 0.4 + avgAtt * 0.4 + Math.max(0, 100 - totInc * 10) * 0.2);
                  return { s, avgCov, avgAtt, totInc, totFines, score };
                })
                .sort((a, b) => b.score - a.score)
                .map(({ s, avgCov, avgAtt, totInc, totFines, score }, rank) => {
                  const grade = score >= 90 ? { label: "A", color: "#10b981" } : score >= 75 ? { label: "B", color: "#6366f1" } : { label: "C", color: "#f59e0b" };
                  return (
                    <tr key={s.org.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"}`}>{rank + 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.org.color }} />
                          <span className="text-sm font-medium text-foreground">{s.org.shortName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-foreground">{avgCov}%</td>
                      <td className="px-5 py-4 text-sm font-mono text-foreground">{avgAtt}%</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-mono font-semibold ${totInc > 0 ? "text-amber-400" : "text-muted-foreground"}`}>{totInc || "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-mono font-semibold ${totFines > 0 ? "text-red-400" : "text-muted-foreground"}`}>{totFines ? fmt(totFines) : "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: grade.color }} />
                          </div>
                          <span className="text-sm font-bold font-mono" style={{ color: grade.color }}>{score}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: grade.color + "20", color: grade.color }}>{grade.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
