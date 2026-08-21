import { useApp } from "@/context/AppContext";
import type {
  FinesReportData, ExportReportData, EmployeeReportData, LocationReportData,
} from "@/lib/export";
import { fmtDate } from "@/app/shared";

export function useReportBuilders() {
  const { fines, employees, posts, locations, fineReasons, currentOrg, holding, allLocations, allEmployees, allPosts, allFines, orgs, schedule } = useApp();

  const today = new Date().toLocaleDateString("ru-RU");
  const nowD = new Date();
  const todayIso = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}-${String(nowD.getDate()).padStart(2, "0")}`;

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
  // Последние 6 месяцев от текущей даты
  const months = Array.from({ length: 6 }, (_, i) => {
    const n = new Date();
    const d = new Date(n.getFullYear(), n.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }) };
  });

  // Реальные показатели организации за месяц (из базы)
  const orgMonthStats = (orgId: number, monthKey: string) => {
    const oPosts = allPosts.filter(p => p.orgId === orgId);
    // Смены, закрытые в этом месяце
    const closed = oPosts.filter(p => p.actualHours !== null && (p.closedAt ?? "").startsWith(monthKey));
    const hoursWorked = closed.reduce((s, p) => s + (p.actualHours ?? 0), 0);
    // Явка: подтверждённые из назначенных
    const assigned = oPosts.filter(p => p.officerId !== null);
    const confirmed = assigned.filter(p => p.confirmedAt !== null);
    const attendance = assigned.length > 0 ? Math.round((confirmed.length / assigned.length) * 100) : 0;
    // Покрытие постов
    const coverage = oPosts.length > 0
      ? Math.round((oPosts.filter(p => p.status === "covered").length / oPosts.length) * 100)
      : 0;
    // Штрафы = инциденты
    const mFines = allFines.filter(f => f.orgId === orgId && f.date.startsWith(monthKey));
    return {
      coverage, attendance,
      incidents: mFines.length,
      finesAmt: mFines.reduce((s, f) => s + f.amount, 0),
      hoursWorked,
    };
  };

  const buildConsolidatedData = (period: string): ExportReportData => {
    const summaryRows = orgs.map(org => {
      const yearData = months.map(m => orgMonthStats(org.id, m.key));
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
      const rows = months.map(m => orgMonthStats(org.id, m.key));
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
    // Смены из графика на сегодня + фактически назначенные посты
    const planned = schedule.filter(s => s.date === todayIso && s.kind !== "off");
    const rows = planned.map(s => {
      const e = employees.find(x => x.id === s.employeeId);
      const post = s.postId ? posts.find(p => p.id === s.postId) : undefined;
      const loc = locations.find(l => l.id === s.locationId);
      return {
        date: s.date,
        employeeName: e?.name ?? "—",
        rank: e?.rank ?? "—",
        postName: post?.name ?? "—",
        locationName: loc?.name ?? "—",
        reasonLabel: s.isExtra ? "Подработка" : (s.kind === "night" ? "Ночная смена" : "Дневная смена"),
        note: s.shift,
        amount: 0,
      };
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
      const loc = locations.find(l => emp.location === l.name) ?? locations.find(l => emp.location.startsWith(l.name));
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