import Icon from "@/components/ui/icon";
import { exportLocationReportExcel, type LocationReportData } from "@/lib/export";
import type { Location } from "@/types";

export default function LocationReportCard({
  buildLocationReport, locFilter, setLocFilter, locDateFrom, setLocDateFrom,
  locDateTo, setLocDateTo, locations, generating, handle,
}: {
  buildLocationReport: (locFilter: number | "all", dateFrom: string, dateTo: string) => LocationReportData;
  locFilter: number | "all";
  setLocFilter: (v: number | "all") => void;
  locDateFrom: string;
  setLocDateFrom: (v: string) => void;
  locDateTo: string;
  setLocDateTo: (v: string) => void;
  locations: Location[];
  generating: string | null;
  handle: (id: string, fn: () => void) => void;
}) {
  return (() => {
            const locData = buildLocationReport(locFilter, locDateFrom, locDateTo);
            const isLoading = generating === "loc-xlsx";
            const fmtR = (n: number) => n.toLocaleString("ru-RU") + " ₽";
            return (
              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-border space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Icon name="Building2" size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">Отчёт по объекту</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Сотрудники, часы и начисления по каждому объекту</p>
                    </div>
                  </div>

                  {/* Период */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Период</label>
                    <div className="flex items-center gap-2">
                      <input type="date" value={locDateFrom} onChange={e => setLocDateFrom(e.target.value)}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
                      <span className="text-muted-foreground text-xs">—</span>
                      <input type="date" value={locDateTo} onChange={e => setLocDateTo(e.target.value)}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-amber-500/50" />
                    </div>
                  </div>

                  {/* Объект */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Объект</label>
                    <select value={locFilter === "all" ? "all" : String(locFilter)}
                      onChange={e => setLocFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-amber-500/50">
                      <option value="all">Все объекты</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name} — {l.address}</option>)}
                    </select>
                  </div>

                  {/* Предпросмотр */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                    <div className="px-3 py-2 border-b border-amber-500/15 flex items-center gap-1.5">
                      <Icon name="BarChart2" size={12} className="text-amber-400" />
                      <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Предпросмотр</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{locData.filterLabel}</span>
                    </div>

                    {/* Итоги */}
                    <div className="grid grid-cols-3 divide-x divide-amber-500/10">
                      {[
                        { label: "Объектов", val: String(locData.rows.length) },
                        { label: "Всего часов", val: String(locData.grandTotalHours) + " ч" },
                        { label: "Начислено", val: fmtR(locData.grandTotalEarned) },
                      ].map(s => (
                        <div key={s.label} className="px-2 py-2 text-center">
                          <div className="text-xs font-bold font-mono text-amber-300 leading-tight truncate">{s.val}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Строки по объектам */}
                    {locData.rows.length > 0 && (
                      <div className="border-t border-amber-500/10 divide-y divide-amber-500/10">
                        {locData.rows.slice(0, 5).map(r => (
                          <div key={r.locationName} className="flex items-center gap-2 px-3 py-1.5">
                            <Icon name="MapPin" size={11} className="text-amber-400 shrink-0" />
                            <span className="text-xs text-foreground truncate flex-1">{r.locationName}</span>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{r.employees.length} чел.</span>
                            <span className="text-[10px] font-mono text-amber-300 shrink-0">{r.totalHours}ч</span>
                            <span className="text-[10px] font-mono text-amber-200 shrink-0">{fmtR(r.totalEarned)}</span>
                          </div>
                        ))}
                        {locData.rows.length > 5 && (
                          <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-center">
                            + ещё {locData.rows.length - 5} объектов в файле
                          </div>
                        )}
                      </div>
                    )}

                    {locData.rows.length === 0 && (
                      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
                        Нет закрытых смен за выбранный период
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <button onClick={() => handle("loc-xlsx", () => exportLocationReportExcel(locData))}
                    disabled={!!generating || locData.rows.length === 0}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                      {isLoading ? <Icon name="Loader2" size={15} className="animate-spin text-emerald-400" />
                               : <Icon name="Table" size={15} className="text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-400">{isLoading ? "Генерация..." : "Скачать Excel"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {locFilter === "all" ? `${locData.rows.length} листов + сводка` : "Детализация по сотрудникам"}
                      </p>
                    </div>
                    {!isLoading && <Icon name="Download" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />}
                  </button>
                </div>
              </div>
            );
  })();
}
