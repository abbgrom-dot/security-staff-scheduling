import type { Section, Location, Post } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────
export const TYPE_LABELS = { office: "Офис / БЦ", warehouse: "Склад", retail: "Торговый объект", industrial: "Промышленный", residential: "Жилой комплекс" } as const;
export const TYPE_COLORS = {
  office: "text-primary bg-primary/10 border-primary/20",
  warehouse: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  retail: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  industrial: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  residential: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
} as const;

export const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";

// ─── Helpers: проверки сотрудников ────────────────────────────────────────────
export const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

/** Возвращает дату истечения срока (дата проверки + 1 год) */
export function expiryDate(checkDate: string): Date | null {
  if (!checkDate) return null;
  const d = new Date(checkDate);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** Дней до истечения. Отрицательное значение = уже просрочено */
export function daysUntilExpiry(checkDate: string): number | null {
  const exp = expiryDate(checkDate);
  if (!exp) return null;
  return Math.ceil((exp.getTime() - TODAY.getTime()) / 86_400_000);
}

export type CheckStatus = "ok" | "warning" | "expired" | "missing";

export function checkStatus(checkDate: string): CheckStatus {
  if (!checkDate) return "missing";
  const days = daysUntilExpiry(checkDate);
  if (days === null) return "missing";
  if (days < 0)  return "expired";
  if (days <= 30) return "warning";
  return "ok";
}

export function checkBadge(status: CheckStatus, days: number | null) {
  if (status === "expired") return { label: "Просрочено",        cls: "text-red-400 bg-red-500/10 border-red-500/30" };
  if (status === "warning") return { label: `${days} дн.`,       cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  if (status === "missing") return { label: "Не указано",        cls: "text-muted-foreground bg-muted/40 border-border" };
  return                          { label: `${days} дн.`,        cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
}
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
export const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors";

export function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}{req && <span className="text-red-400 ml-1">*</span>}</label>
      {children}
    </div>
  );
}

export const postBadge = (s: Post["status"]) => s === "covered" ? <span className="badge-active">Закрыт</span> : s === "alert" ? <span className="badge-danger">Тревога</span> : <span className="badge-warning">Вакантен</span>;

// ─── Nav ─────────────────────────────────────────────────────────────────────
export const NAV_ITEMS: { key: Section; label: string; icon: string; perm?: string; holdingOnly?: boolean }[] = [
  { key: "dashboard",  label: "Главная",          icon: "LayoutDashboard", perm: "dashboard:view" },
  { key: "objects",    label: "Объекты",           icon: "Building2",       perm: "objects:view" },
  { key: "placements", label: "Расстановки",       icon: "MapPin",          perm: "placements:view" },
  { key: "employees",  label: "Сотрудники",        icon: "Users",           perm: "employees:view" },
  { key: "fines",      label: "Штрафы",            icon: "BadgeAlert",      perm: "fines:view" },
  { key: "reports",    label: "Отчёты",            icon: "FileText",        perm: "reports:view" },
  { key: "schedule",   label: "График",            icon: "CalendarDays",    perm: "schedule:view" },
  { key: "export",     label: "Экспорт",           icon: "Download",        perm: "export:use" },
  { key: "analytics",  label: "Аналитика",         icon: "BarChart3",       perm: "analytics:view" },
  { key: "users",      label: "Пользователи",      icon: "UserCog",         perm: "users:view" },
  { key: "settings",   label: "Настройки",         icon: "Settings",        perm: "settings:edit" },
  { key: "holding",    label: "Холдинг",           icon: "Network",         perm: "holding:view", holdingOnly: true },
];

// ─── Location Form ────────────────────────────────────────────────────────────
export const EMPTY_LOC: Omit<Location, "id" | "orgId"> = { name: "", address: "", type: "office", posts: 1, contact: "", note: "", hourlyRate: 200 };
