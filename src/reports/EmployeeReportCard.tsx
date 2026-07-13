import Icon from "@/components/ui/icon";
import { exportEmployeeReportExcel, type EmployeeReportData } from "@/lib/export";
import type { Employee } from "@/types";

export default function EmployeeReportCard({
  buildEmployeeReport, empFilter, setEmpFilter, empDateFrom, setEmpDateFrom,
  empDateTo, setEmpDateTo, employees, generating, handle,
}: {
  buildEmployeeReport: (empFilter: number | "all", dateFrom: string, dateTo: string) => EmployeeReportData;
  empFilter: number | "all";
  setEmpFilter: (v: number | "all") => void;
  empDateFrom: string;
  setEmpDateFrom: (v: string) => void;
  empDateTo: string;
  setEmpDateTo: (v: string) => void;
  employees: Employee[];
  generating: string | null;
  handle: (id: string, fn: () => void) => void;
}) {
  return (() => {
            const empData = buildEmployeeReport(empFilter, empDateFrom, empDateTo);
            const isLoading = generating === "emp-xlsx";
            const fmtR = (n: number) => n.toLocaleString("ru-RU") + " ₽";
            return (
              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-border space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Icon name="UserCheck" size={20} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Отчёт по сотруднику</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Объекты, часы, начисления, надбавки и штрафы по дням</p>
                    </div>
                  </div>

                  {/* Период */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Период</label>
                    <div className="flex items-center gap-2">
                      <input type="date" value={empDateFrom} onChange={e => setEmpDateFrom(e.target.value)}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-blue-500/50" />
                      <span className="text-muted-foreground text-xs">—</span>
                      <input type="date" value={empDateTo} onChange={e => setEmpDateTo(e.target.value)}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-blue-500/50" />
                    </div>
                  </div>

                  {/* Сотрудник */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Сотрудник</label>
                    <select value={empFilter === "all" ? "all" : String(empFilter)}
                      onChange={e => setEmpFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-blue-500/50">
                      <option value="all">Все сотрудники</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.rank}</option>)}
                    </select>
                  </div>

                  {/* Предпросмотр */}
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
                    <div className="px-3 py-2 border-b border-blue-500/15 flex items-center gap-1.5">
                      <Icon name="BarChart2" size={12} className="text-blue-400" />
                      <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Предпросмотр</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{empData.filterLabel}</span>
                    </div>

                    {/* Итоги */}
                    <div className="grid grid-cols-4 divide-x divide-blue-500/10">
                      {[
                        { label: "Сотр.", val: String(empData.rows.length), sub: "чел." },
                        { label: "Часов", val: String(empData.grandTotalHours), sub: "ч" },
                        { label: "Начислено", val: fmtR(empData.grandTotalEarned), sub: "" },
                        { label: "К выплате", val: fmtR(empData.grandTotalNet), sub: "" },
                      ].map(s => (
                        <div key={s.label} className="px-2 py-2 text-center">
                          <div className="text-xs font-bold font-mono text-blue-300 leading-tight truncate">{s.val}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Строки по сотрудникам (макс 5) */}
                    {empData.rows.length > 0 && (
                      <div className="border-t border-blue-500/10 divide-y divide-blue-500/10">
                        {empData.rows.slice(0, 5).map(r => (
                          <div key={r.employeeId} className="flex items-center gap-2 px-3 py-1.5">
                            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[9px] font-bold text-blue-300 shrink-0">
                              {r.employeeName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="text-xs text-foreground truncate flex-1">{r.employeeName}</span>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{r.totalHours}ч</span>
                            <span className="text-[10px] font-mono text-blue-300 shrink-0">{fmtR(r.totalNet)}</span>
                          </div>
                        ))}
                        {empData.rows.length > 5 && (
                          <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-center">
                            + ещё {empData.rows.length - 5} сотр. в файле
                          </div>
                        )}
                        {empData.grandTotalFines > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-red-500/20 bg-red-500/5">
                            <Icon name="AlertTriangle" size={10} className="text-red-400 shrink-0" />
                            <span className="text-[10px] text-red-400">Штрафы за период: {fmtR(empData.grandTotalFines)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {empData.rows.length === 0 && (
                      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        Нет закрытых смен за выбранный период
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <button onClick={() => handle("emp-xlsx", () => exportEmployeeReportExcel(empData))}
                    disabled={!!generating || empData.rows.length === 0}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                      {isLoading ? <Icon name="Loader2" size={15} className="animate-spin text-emerald-400" />
                               : <Icon name="Table" size={15} className="text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-400">{isLoading ? "Генерация..." : "Скачать Excel"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {empFilter === "all" ? `${empData.rows.length} листов + сводка` : "Детализация по дням"}
                      </p>
                    </div>
                    {!isLoading && <Icon name="Download" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />}
                  </button>
                </div>
              </div>
            );
  })();
}
