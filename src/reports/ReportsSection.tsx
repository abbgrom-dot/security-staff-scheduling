import { useState } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";
import {
  exportFinesPDF, exportFinesExcel,
  exportPDF, exportExcel,
} from "@/lib/export";
import { useReportBuilders } from "@/reports/useReportBuilders";
import EmployeeReportCard from "@/reports/EmployeeReportCard";
import LocationReportCard from "@/reports/LocationReportCard";

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
          <EmployeeReportCard
            buildEmployeeReport={buildEmployeeReport}
            empFilter={empFilter} setEmpFilter={setEmpFilter}
            empDateFrom={empDateFrom} setEmpDateFrom={setEmpDateFrom}
            empDateTo={empDateTo} setEmpDateTo={setEmpDateTo}
            employees={employees} generating={generating} handle={handle}
          />

          {/* ── Отчёт по объектам ── */}
          <LocationReportCard
            buildLocationReport={buildLocationReport}
            locFilter={locFilter} setLocFilter={setLocFilter}
            locDateFrom={locDateFrom} setLocDateFrom={setLocDateFrom}
            locDateTo={locDateTo} setLocDateTo={setLocDateTo}
            locations={locations} generating={generating} handle={handle}
          />

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
