import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import {
  exportFinesPDF, exportFinesExcel, type FinesReportData,
  exportPDF, exportExcel, type ExportReportData,
  exportEmployeeReportExcel, type EmployeeReportData,
  exportLocationReportExcel, type LocationReportData,
} from "@/lib/export";
import { fmtDate } from "@/app/shared";

function useReportBuilders() {
  const { fines, employees, posts, locations, fineReasons, currentOrg, holding, allLocations, allEmployees, allPosts, allFines, orgs } = useApp();

  const today = new Date().toLocaleDateString("ru-RU");

  // ── Fines report data ─────────────────────────────────────────────────────
  const buildFinesData = (empFilter: number | "all" = "all"): FinesReportData => {
    const filterLabel = empFilter === "all" ? "Все сотрудники" : employees.find(e => e.id === empFilter)?.name ?? "—";
    const filtered = empFilter === "all" ? fines : fines.filter(f => f.employeeId === empFilter);
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const rows = sorted.map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      const post = posts.find(p => p.id === f.postId);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      const reason = fineReasons.find(r => r.id === f.reasonId);
      return {
        date: fmtDate(f.date), employeeName: emp?.name ?? "—", rank: emp?.rank ?? "—",
        postName: post?.name ?? "—", locationName: loc?.name ?? "—",
        reasonLabel: reason?.label ?? "—", note: f.note, amount: f.amount,
      };
    });
    const byEmployee = employees
      .map(e => ({ name: e.name, rank: e.rank, count: sorted.filter(f => f.employeeId === e.id).length, total: sorted.filter(f => f.employeeId === e.id).reduce((s, f) => s + f.amount, 0) }))
      .filter(x => x.count > 0).sort((a, b) => b.total - a.total);
    return {
      orgName: currentOrg?.name ?? "—", orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name, generatedAt: today, filterLabel, rows, byEmployee,
      totalAmount: sorted.reduce((s, f) => s + f.amount, 0), totalCount: sorted.length,
    };
  };

  // ── Consolidated (holding) report data ────────────────────────────────────
  const synth = (orgId: number, mi: number) => {
    const seed = orgId * 13 + mi * 7;
    return { coverage: 70 + ((seed * 3) % 28), attendance: 80 + ((seed * 5) % 18), incidents: seed % 4, finesAmt: (seed % 4) * (300 + (seed % 5) * 400), hoursWorked: ([8, 2, 1][orgId - 1] ?? 3) * 22 * 12 + (seed % 50) };
  };
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(2026, 4 - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) };
  });

  const buildConsolidatedData = (period: string): ExportReportData => {
    const summaryRows = orgs.map(org => {
      const yearData = months.map((_, mi) => {
        const d = synth(org.id, mi);
        const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(months[mi].key));
        return { ...d, finesAmt: realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt, incidents: realFines.length > 0 ? realFines.length : d.incidents };
      });
      const avgCov = Math.round(yearData.reduce((a, d) => a + d.coverage, 0) / yearData.length);
      const avgAtt = Math.round(yearData.reduce((a, d) => a + d.attendance, 0) / yearData.length);
      const totInc = yearData.reduce((a, d) => a + d.incidents, 0);
      const totFines = yearData.reduce((a, d) => a + d.finesAmt, 0);
      const totHours = yearData.reduce((a, d) => a + d.hoursWorked, 0);
      const score = Math.round(avgCov * 0.4 + avgAtt * 0.4 + Math.max(0, 100 - totInc * 10) * 0.2);
      return { orgName: org.name, orgColor: org.color, coverage: avgCov, attendance: avgAtt, incidents: totInc, finesAmt: totFines, hoursWorked: totHours, score, grade: score >= 90 ? "A" : score >= 75 ? "B" : "C" };
    });
    const totalCoverage = Math.round(summaryRows.reduce((s, r) => s + r.coverage, 0) / Math.max(summaryRows.length, 1));
    const totalAttendance = Math.round(summaryRows.reduce((s, r) => s + r.attendance, 0) / Math.max(summaryRows.length, 1));
    const monthlyRows = orgs.map(org => {
      const rows = months.map((m, mi) => {
        const d = synth(org.id, mi);
        const realFines = allFines.filter(f => f.orgId === org.id && f.date.startsWith(m.key));
        return { coverage: d.coverage, attendance: d.attendance, incidents: realFines.length > 0 ? realFines.length : d.incidents, finesAmt: realFines.length > 0 ? realFines.reduce((s, f) => s + f.amount, 0) : d.finesAmt };
      });
      return { orgName: org.name, coverage: rows.map(r => r.coverage), attendance: rows.map(r => r.attendance), incidents: rows.map(r => r.incidents), finesAmt: rows.map(r => r.finesAmt) };
    });
    return {
      holdingName: holding.name, inn: holding.inn, generatedAt: today, period,
      summaryRows, monthLabels: months.map(m => m.label), monthlyRows,
      totalCoverage, totalAttendance,
      totalIncidents: summaryRows.reduce((s, r) => s + r.incidents, 0),
      totalFines: summaryRows.reduce((s, r) => s + r.finesAmt, 0),
      totalHours: summaryRows.reduce((s, r) => s + r.hoursWorked, 0),
    };
  };

  // ── Shifts summary (as fines-style with employees/posts) ──────────────────
  const buildShiftsData = (): FinesReportData => {
    const activeEmps = employees.filter(e => e.status === "active");
    const rows = activeEmps.map(e => {
      const post = posts.find(p => p.officerId === e.id);
      const loc = post ? locations.find(l => l.id === post.locationId) : null;
      return { date: today, employeeName: e.name, rank: e.rank, postName: post?.name ?? "—", locationName: loc?.name ?? "—", reasonLabel: "На смене", note: e.shift, amount: 0 };
    });
    return {
      orgName: currentOrg?.name ?? "—", orgColor: currentOrg?.color ?? "#6366f1",
      holdingName: holding.name, generatedAt: today, filterLabel: "Все смены",
      rows, byEmployee: [], totalAmount: 0, totalCount: rows.length,
    };
  };

  // ── Employee Report ───────────────────────────────────────────────────────
  const buildEmployeeReport = (
    empFilter: number | "all",
    dateFrom: string,
    dateTo: string,
  ): EmployeeReportData => {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    const targetEmps = empFilter === "all" ? employees : employees.filter(e => e.id === empFilter);
    const filterLabel = empFilter === "all" ? "Все сотрудники" : (employees.find(e => e.id === empFilter)?.name ?? "—");

    // Фильтруем закрытые посты в периоде (по closedAt или actualHours)
    const closedPosts = posts.filter(p => {
      if (p.actualHours === null || p.officerId === null) return false;
      const closeDate = p.closedAt ? new Date(p.closedAt) : (p.confirmedAt ? new Date(p.confirmedAt) : null);
      if (!closeDate) return false;
      return closeDate >= fromDate && closeDate <= toDate;
    });

    const rows = targetEmps.map(emp => {
      const empPosts = closedPosts.filter(p => p.officerId === emp.id);
      const loc = locations.find(l => emp.location.startsWith(l.name));
      const base = loc?.hourlyRate ?? 0;
      const bonus = emp.seniorityBonus;
      const totalRate = base + bonus;
      const empFines = fines.filter(f => f.employeeId === emp.id && f.date >= dateFrom && f.date <= dateTo);

      const days: import("@/lib/export").EmployeeReportDayRow[] = empPosts.map(p => {
        const postLoc = locations.find(l => l.id === p.locationId);
        const postBase = postLoc?.hourlyRate ?? base;
        const rate = postBase + bonus;
        const hours = p.actualHours ?? 0;
        const earned = hours * rate;
        // Штрафы за конкретный пост
        const postFines = fines.filter(f => f.postId === p.id && f.employeeId === emp.id);
        const finesAmt = postFines.reduce((s, f) => s + f.amount, 0);
        const closeDate = p.closedAt ? new Date(p.closedAt) : (p.confirmedAt ? new Date(p.confirmedAt) : new Date());
        return {
          date: closeDate.toLocaleDateString("ru-RU"),
          locationName: postLoc?.name ?? emp.location,
          postName: p.name,
          hoursWorked: hours,
          baseRate: postBase,
          bonus,
          totalRate: rate,
          earned,
          finesAmount: finesAmt,
          net: Math.max(0, earned - finesAmt),
          isExtraShift: p.isExtraShift,
        };
      });

      // Штрафы без привязки к посту (просто в периоде)
      const otherFines = empFines.filter(f => !empPosts.find(p => p.id === f.postId));
      const extraFinesAmt = otherFines.reduce((s, f) => s + f.amount, 0);

      const totalHours = days.reduce((s, d) => s + d.hoursWorked, 0);
      const totalEarned = days.reduce((s, d) => s + d.earned, 0);
      const totalFines = days.reduce((s, d) => s + d.finesAmount, 0) + extraFinesAmt;
      const totalNet = Math.max(0, totalEarned - totalFines);

      return { employeeId: emp.id, employeeName: emp.name, rank: emp.rank, days, totalHours, totalEarned, totalFines, totalNet };
    });

    return {
      orgName: currentOrg?.name ?? "—",
      holdingName: holding.name,
      generatedAt: today,
      periodFrom: new Date(dateFrom).toLocaleDateString("ru-RU"),
      periodTo: new Date(dateTo).toLocaleDateString("ru-RU"),
      filterLabel,
      rows,
      grandTotalHours: rows.reduce((s, r) => s + r.totalHours, 0),
      grandTotalEarned: rows.reduce((s, r) => s + r.totalEarned, 0),
      grandTotalFines: rows.reduce((s, r) => s + r.totalFines, 0),
      grandTotalNet: rows.reduce((s, r) => s + r.totalNet, 0),
    };
  };

  // ── Location Report ───────────────────────────────────────────────────────
  const buildLocationReport = (
    locFilter: number | "all",
    dateFrom: string,
    dateTo: string,
  ): LocationReportData => {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

    const targetLocs = locFilter === "all" ? locations : locations.filter(l => l.id === locFilter);
    const filterLabel = locFilter === "all" ? "Все объекты" : (locations.find(l => l.id === locFilter)?.name ?? "—");

    const closedPosts = posts.filter(p => {
      if (p.actualHours === null || p.officerId === null) return false;
      const closeDate = p.closedAt ? new Date(p.closedAt) : (p.confirmedAt ? new Date(p.confirmedAt) : null);
      if (!closeDate) return false;
      return closeDate >= fromDate && closeDate <= toDate;
    });

    const rows = targetLocs.map(loc => {
      const locPosts = closedPosts.filter(p => p.locationId === loc.id);
      const empRows: import("@/lib/export").LocationReportEmpRow[] = locPosts.map(p => {
        const emp = employees.find(e => e.id === p.officerId);
        const bonus = emp?.seniorityBonus ?? 0;
        const rate = loc.hourlyRate + bonus;
        const hours = p.actualHours ?? 0;
        return {
          employeeName: emp?.name ?? "—",
          rank: emp?.rank ?? "—",
          postName: p.name,
          hoursWorked: hours,
          rate,
          earned: hours * rate,
          isExtraShift: p.isExtraShift,
        };
      });
      const totalHours = empRows.reduce((s, r) => s + r.hoursWorked, 0);
      const totalEarned = empRows.reduce((s, r) => s + r.earned, 0);
      return { locationName: loc.name, locationAddress: loc.address, employees: empRows, totalHours, totalEarned };
    });

    return {
      orgName: currentOrg?.name ?? "—",
      holdingName: holding.name,
      generatedAt: today,
      periodFrom: new Date(dateFrom).toLocaleDateString("ru-RU"),
      periodTo: new Date(dateTo).toLocaleDateString("ru-RU"),
      filterLabel,
      rows,
      grandTotalHours: rows.reduce((s, r) => s + r.totalHours, 0),
      grandTotalEarned: rows.reduce((s, r) => s + r.totalEarned, 0),
    };
  };

  return { buildFinesData, buildConsolidatedData, buildShiftsData, buildEmployeeReport, buildLocationReport, today };
}

export function Reports() {
  const { currentOrg, fines, employees, posts, locations } = useApp();
  const { buildFinesData, buildConsolidatedData, buildShiftsData, buildEmployeeReport, buildLocationReport } = useReportBuilders();

  const [generating, setGenerating] = useState<string | null>(null);

  // Дефолтный период — текущий месяц
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Состояния для отчёта по сотрудникам
  const [empDateFrom, setEmpDateFrom] = useState(defaultFrom);
  const [empDateTo, setEmpDateTo] = useState(defaultTo);
  const [empFilter, setEmpFilter] = useState<number | "all">("all");

  // Состояния для отчёта по объектам
  const [locDateFrom, setLocDateFrom] = useState(defaultFrom);
  const [locDateTo, setLocDateTo] = useState(defaultTo);
  const [locFilter, setLocFilter] = useState<number | "all">("all");

  const handle = async (id: string, fn: () => void) => {
    setGenerating(id);
    await new Promise(r => setTimeout(r, 100));
    fn();
    setGenerating(null);
  };

  const finesCount = fines.length;
  const empCount = employees.filter(e => e.status === "active").length;
  const postsCovered = posts.filter(p => p.status === "covered").length;
  const today = new Date().toLocaleDateString("ru-RU");

  type ReportDef = {
    id: string;
    title: string;
    description: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    badge?: string;
    stat: string;
    statLabel: string;
    formats: { fmt: "pdf" | "xlsx"; label: string; icon: string; desc: string }[];
  };

  const REPORT_DEFS: ReportDef[] = [
    {
      id: "fines",
      title: "Отчёт по штрафам",
      description: "Полная история нарушений, топ нарушителей, разбивка по причинам",
      icon: "BadgeAlert", iconBg: "bg-red-500/10", iconColor: "text-red-400",
      badge: finesCount > 0 ? `${finesCount} записей` : undefined,
      stat: String(finesCount), statLabel: "нарушений",
      formats: [
        { fmt: "pdf", label: "PDF", icon: "FileText", desc: "Документ с брендингом" },
        { fmt: "xlsx", label: "Excel", icon: "Table", desc: "3 листа: история, сотрудники, причины" },
      ],
    },
    {
      id: "consolidated",
      title: "Сводный отчёт холдинга",
      description: "KPI всех организаций, покрытие постов, явка, сравнительный рейтинг",
      icon: "BarChart3", iconBg: "bg-primary/10", iconColor: "text-primary",
      stat: `${Math.round((postsCovered / Math.max(posts.length, 1)) * 100)}%`, statLabel: "покрытие сейчас",
      formats: [
        { fmt: "pdf", label: "PDF", icon: "FileText", desc: "Многостраничный с KPI" },
        { fmt: "xlsx", label: "Excel", icon: "Table", desc: "5 листов: сводка + динамика" },
      ],
    },
    {
      id: "shifts",
      title: "Отчёт по сменам",
      description: "Текущие расстановки, кто на смене, занятые и вакантные посты",
      icon: "CalendarDays", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400",
      stat: String(empCount), statLabel: "на смене сейчас",
      formats: [
        { fmt: "pdf", label: "PDF", icon: "FileText", desc: "Список дежурных по объектам" },
        { fmt: "xlsx", label: "Excel", icon: "Table", desc: "Таблица расстановки" },
      ],
    },
  ];

  const onExport = (reportId: string, fmt: "pdf" | "xlsx") => {
    const key = `${reportId}-${fmt}`;
    if (reportId === "fines") {
      handle(key, () => {
        const data = buildFinesData();
        if (fmt === "pdf") { exportFinesPDF(data); } else { exportFinesExcel(data); }
      });
    } else if (reportId === "consolidated") {
      handle(key, () => {
        const data = buildConsolidatedData("Январь — Май 2026");
        if (fmt === "pdf") { exportPDF(data); } else { exportExcel(data); }
      });
    } else if (reportId === "shifts") {
      handle(key, () => {
        const data = buildShiftsData();
        if (fmt === "pdf") { exportFinesPDF(data); } else { exportFinesExcel(data); }
      });
    }
  };

  return (
    <div className="section-enter space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Отчёты</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {currentOrg?.shortName} · Генерация и скачивание документов
        </p>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Данные актуальны на", val: today, icon: "Clock" },
          { label: "Организация", val: currentOrg?.shortName ?? "—", icon: "Building2" },
          { label: "На смене", val: `${empCount} чел.`, icon: "UserCheck" },
          { label: "Покрытие постов", val: `${Math.round((postsCovered / Math.max(posts.length, 1)) * 100)}%`, icon: "ShieldCheck" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
            <Icon name={s.icon} size={14} className="text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">{s.label}:</span>
            <span className="text-xs font-semibold text-foreground">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {REPORT_DEFS.map(rep => (
          <div key={rep.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="p-5 border-b border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${rep.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon name={rep.icon} size={20} className={rep.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-sm leading-tight">{rep.title}</h3>
                    {rep.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-mono shrink-0">{rep.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rep.description}</p>
                </div>
              </div>
              {/* Stat */}
              <div className="flex items-baseline gap-1.5 px-3 py-2 bg-muted/40 rounded-xl">
                <span className={`text-2xl font-bold font-mono ${rep.iconColor}`}>{rep.stat}</span>
                <span className="text-xs text-muted-foreground">{rep.statLabel}</span>
              </div>
            </div>

            {/* Format buttons */}
            <div className="p-4 flex flex-col gap-2 flex-1 justify-end">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Скачать как</p>
              {rep.formats.map(f => {
                const key = `${rep.id}-${f.fmt}`;
                const isLoading = generating === key;
                return (
                  <button
                    key={f.fmt}
                    onClick={() => onExport(rep.id, f.fmt)}
                    disabled={!!generating}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left group
                      ${f.fmt === "pdf"
                        ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40"
                        : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40"}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.fmt === "pdf" ? "bg-red-500/15" : "bg-emerald-500/15"}`}>
                      {isLoading
                        ? <Icon name="Loader2" size={15} className={`animate-spin ${f.fmt === "pdf" ? "text-red-400" : "text-emerald-400"}`} />
                        : <Icon name={f.fmt === "pdf" ? "FileText" : "Table"} size={15} className={f.fmt === "pdf" ? "text-red-400" : "text-emerald-400"} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${f.fmt === "pdf" ? "text-red-400" : "text-emerald-400"}`}>
                        {isLoading ? "Генерация..." : f.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{f.desc}</p>
                    </div>
                    {!isLoading && (
                      <Icon name="Download" size={14} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Детальные отчёты с периодом ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Детальные отчёты с выбором периода</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* ── Отчёт по сотрудникам ── */}
          {(() => {
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
          })()}

          {/* ── Отчёт по объектам ── */}
          {(() => {
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
          })()}

        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-primary/5 border border-primary/20 rounded-xl">
        <Icon name="Info" size={16} className="text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Отчёты формируются на основе текущих данных организации{" "}
          <span className="text-foreground font-medium">{currentOrg?.shortName}</span>.
          Для отчётов по другой организации переключитесь через меню в сайдбаре.
        </p>
      </div>
    </div>
  );
}
