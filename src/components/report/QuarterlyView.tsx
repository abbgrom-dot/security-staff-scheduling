import type { Organization } from "@/types";
import Icon from "@/components/ui/icon";
import { fmt } from "./shared";

interface QuarterInfo { key: string; label: string; months: string[] }
interface QuarterOrgRow {
  orgId: number;
  coverage: number;
  finesAmt: number;
  incidents: number;
  attendance: number;
  hoursWorked: number;
}
interface QuarterDatum {
  quarter: QuarterInfo;
  orgs: QuarterOrgRow[];
}

export default function QuarterlyView({
  orgs, activeOrgs, quarterData,
}: {
  orgs: Organization[];
  activeOrgs: Set<number>;
  quarterData: QuarterDatum[];
}) {
  return (
    <div className="space-y-5">
      {quarterData.map(({ quarter, orgs: qOrgs }) => (
        <div key={quarter.key} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="CalendarDays" size={16} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{quarter.label}</h3>
            <span className="text-xs text-muted-foreground ml-1">{quarter.months.length} месяца</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-border">
                  {["Организация", "Покрытие постов", "Явка персонала", "Нарушений", "Штрафы", "Часов работы"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qOrgs.filter(r => activeOrgs.has(r.orgId)).map(row => {
                  const org = orgs.find(o => o.id === row.orgId)!;
                  return (
                    <tr key={row.orgId} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: org.color }} />
                          <span className="text-sm font-medium text-foreground">{org.shortName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.coverage}%`, backgroundColor: row.coverage >= 90 ? "#10b981" : row.coverage >= 70 ? org.color : "#f59e0b" }} />
                          </div>
                          <span className="text-sm font-mono text-foreground">{row.coverage}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.attendance}%` }} />
                          </div>
                          <span className="text-sm font-mono text-foreground">{row.attendance}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-mono font-semibold ${row.incidents > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {row.incidents === 0 ? "—" : row.incidents}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-mono font-semibold ${row.finesAmt > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {row.finesAmt === 0 ? "—" : fmt(row.finesAmt)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-muted-foreground">
                        {row.hoursWorked.toLocaleString("ru-RU")} ч
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer totals */}
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-5 py-3 text-xs font-semibold text-muted-foreground">ИТОГО</td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">
                    {Math.round(qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.coverage, 0) / Math.max(qOrgs.filter(r => activeOrgs.has(r.orgId)).length, 1))}%
                  </td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">
                    {Math.round(qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.attendance, 0) / Math.max(qOrgs.filter(r => activeOrgs.has(r.orgId)).length, 1))}%
                  </td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-amber-400">
                    {qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.incidents, 0)}
                  </td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-red-400">
                    {fmt(qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.finesAmt, 0))}
                  </td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">
                    {qOrgs.filter(r => activeOrgs.has(r.orgId)).reduce((s, r) => s + r.hoursWorked, 0).toLocaleString("ru-RU")} ч
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
