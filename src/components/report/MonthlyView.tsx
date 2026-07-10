import type { Organization } from "@/types";
import Icon from "@/components/ui/icon";
import { Bar, Trend, fmt, getMonths, syntheticMonthData } from "./shared";

type MonthInfo = ReturnType<typeof getMonths>[number];
type Metric = "coverage" | "fines" | "incidents" | "attendance";
type MonthRow = ReturnType<typeof syntheticMonthData> & { orgId: number };

interface MetricDef { key: Metric; label: string; icon: string }

interface ChartDatum {
  month: MonthInfo;
  values: { org: Organization; val: number }[];
}

interface CompRow {
  org: Organization;
  months: MonthRow[];
  last: MonthRow;
  prev: MonthRow;
}

export default function MonthlyView({
  orgs, activeOrgs, metric, setMetric, metricLabel, metricKey,
  chartData, chartMax, months, compRows, METRICS,
}: {
  orgs: Organization[];
  activeOrgs: Set<number>;
  metric: Metric;
  setMetric: (m: Metric) => void;
  metricLabel: string;
  metricKey: string;
  chartData: ChartDatum[];
  chartMax: number;
  months: MonthInfo[];
  compRows: CompRow[];
  METRICS: readonly MetricDef[];
}) {
  return (
    <>
      {/* Metric selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${metric === m.key ? "bg-primary/10 border-primary/40 text-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}
          >
            <Icon name={m.icon} size={16} className={metric === m.key ? "text-primary" : ""} />
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">{metricLabel}</h3>
          <div className="flex gap-3">
            {orgs.filter(o => activeOrgs.has(o.id)).map(org => (
              <div key={org.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: org.color }} />
                {org.shortName}
              </div>
            ))}
          </div>
        </div>

        {/* Grouped bar chart */}
        <div className="flex items-end gap-4">
          {chartData.map(({ month, values }) => (
            <div key={month.key} className="flex-1 flex flex-col items-center gap-2">
              {/* Value labels on hover — just show bars */}
              <div className="w-full flex items-end gap-0.5" style={{ height: 100 }}>
                {values.map(({ org, val }) => (
                  <div key={org.id} className="flex-1 relative group">
                    <Bar value={val} max={chartMax} color={org.color} height={100} />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                      <div className="bg-popover border border-border rounded-lg px-2 py-1 text-[10px] text-foreground whitespace-nowrap shadow-lg">
                        <span className="font-semibold" style={{ color: org.color }}>{org.shortName}</span>
                        <span className="ml-1">{metric === "fines" ? fmt(val) : metric === "coverage" || metric === "attendance" ? val + "%" : val}</span>
                      </div>
                      <div className="w-1.5 h-1.5 rotate-45 bg-popover border-r border-b border-border -mt-1" />
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{month.label}</span>
            </div>
          ))}
        </div>

        {/* Y-axis hint */}
        <div className="flex justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">0</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Макс: {metric === "fines" ? fmt(chartMax) : metric === "coverage" || metric === "attendance" ? chartMax + "%" : chartMax}
          </span>
        </div>
      </div>

      {/* Monthly comparison table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Сравнительная таблица по месяцам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-36">Организация</th>
                {months.map(m => (
                  <th key={m.key} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">{m.label}</th>
                ))}
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">Тренд</th>
              </tr>
            </thead>
            <tbody>
              {compRows.map(({ org, months: mrows, last, prev }) => (
                <tr key={org.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
                      <span className="text-sm font-medium text-foreground">{org.shortName}</span>
                    </div>
                  </td>
                  {mrows.map((d, i) => {
                    const val = metric === "fines" ? d.finesAmt
                      : metric === "incidents" ? d.incidents
                      : metric === "coverage" ? d.coverage
                      : d.attendance;
                    const isLast = i === mrows.length - 1;
                    return (
                      <td key={i} className={`px-3 py-3 text-center ${isLast ? "font-semibold" : ""}`}>
                        <span className="text-sm font-mono" style={isLast ? { color: org.color } : {}}>
                          {metric === "fines" ? (val === 0 ? "—" : fmt(val))
                            : metric === "coverage" || metric === "attendance" ? val + "%"
                            : val === 0 ? "—" : val}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-right">
                    {metric === "fines" || metric === "incidents"
                      ? <Trend cur={last[metricKey as "finesAmt" | "incidents"]} prev={prev[metricKey as "finesAmt" | "incidents"]} invert />
                      : <Trend cur={last[metricKey as "coverage" | "attendance"]} prev={prev[metricKey as "coverage" | "attendance"]} />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
