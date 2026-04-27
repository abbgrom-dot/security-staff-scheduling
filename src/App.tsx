import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────────────────────────
type Section =
  | "dashboard"
  | "placements"
  | "employees"
  | "reports"
  | "schedule"
  | "export"
  | "analytics"
  | "settings";

interface Employee {
  id: number;
  name: string;
  rank: string;
  status: "active" | "off" | "sick";
  location: string;
  shift: string;
  phone: string;
}

interface Post {
  id: number;
  name: string;
  location: string;
  officer: string | null;
  time: string;
  status: "covered" | "vacant" | "alert";
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const employees: Employee[] = [
  { id: 1, name: "Иванов Сергей А.", rank: "Ст. охранник", status: "active", location: "Объект А — Главный вход", shift: "08:00 – 20:00", phone: "+7 900 123-45-67" },
  { id: 2, name: "Петров Андрей В.", rank: "Охранник", status: "active", location: "Объект А — Периметр", shift: "08:00 – 20:00", phone: "+7 900 234-56-78" },
  { id: 3, name: "Смирнова Елена К.", rank: "Охранник", status: "active", location: "Объект Б — КПП", shift: "20:00 – 08:00", phone: "+7 900 345-67-89" },
  { id: 4, name: "Козлов Дмитрий И.", rank: "Охранник", status: "off", location: "—", shift: "Выходной", phone: "+7 900 456-78-90" },
  { id: 5, name: "Николаева Ирина Р.", rank: "Ст. охранник", status: "active", location: "Объект В — Парковка", shift: "08:00 – 20:00", phone: "+7 900 567-89-01" },
  { id: 6, name: "Волков Павел С.", rank: "Охранник", status: "sick", location: "—", shift: "Больничный", phone: "+7 900 678-90-12" },
  { id: 7, name: "Морозов Алексей Г.", rank: "Охранник", status: "active", location: "Объект Б — Склад", shift: "08:00 – 20:00", phone: "+7 900 789-01-23" },
  { id: 8, name: "Фёдорова Наталья В.", rank: "Охранник", status: "active", location: "Объект В — Главный вход", shift: "20:00 – 08:00", phone: "+7 900 890-12-34" },
];

const posts: Post[] = [
  { id: 1, name: "Главный вход", location: "Объект А", officer: "Иванов С.А.", time: "08:00 – 20:00", status: "covered" },
  { id: 2, name: "Периметр (сев.)", location: "Объект А", officer: "Петров А.В.", time: "08:00 – 20:00", status: "covered" },
  { id: 3, name: "Периметр (юж.)", location: "Объект А", officer: null, time: "08:00 – 20:00", status: "vacant" },
  { id: 4, name: "КПП", location: "Объект Б", officer: "Смирнова Е.К.", time: "20:00 – 08:00", status: "covered" },
  { id: 5, name: "Склад", location: "Объект Б", officer: "Морозов А.Г.", time: "08:00 – 20:00", status: "covered" },
  { id: 6, name: "Ворота въезда", location: "Объект Б", officer: null, time: "08:00 – 20:00", status: "alert" },
  { id: 7, name: "Парковка", location: "Объект В", officer: "Николаева И.Р.", time: "08:00 – 20:00", status: "covered" },
  { id: 8, name: "Главный вход", location: "Объект В", officer: "Фёдорова Н.В.", time: "20:00 – 08:00", status: "covered" },
];

const navItems = [
  { key: "dashboard", label: "Главная", icon: "LayoutDashboard" },
  { key: "placements", label: "Расстановки", icon: "MapPin" },
  { key: "employees", label: "Сотрудники", icon: "Users" },
  { key: "reports", label: "Отчёты", icon: "FileText" },
  { key: "schedule", label: "График", icon: "CalendarDays" },
  { key: "export", label: "Экспорт", icon: "Download" },
  { key: "analytics", label: "Аналитика", icon: "BarChart3" },
  { key: "settings", label: "Настройки", icon: "Settings" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusBadge = (status: Employee["status"]) => {
  if (status === "active") return <span className="badge-active">На смене</span>;
  if (status === "sick") return <span className="badge-danger">Больничный</span>;
  return <span className="badge-inactive">Выходной</span>;
};

const postBadge = (status: Post["status"]) => {
  if (status === "covered") return <span className="badge-active">Закрыт</span>;
  if (status === "alert") return <span className="badge-danger">Тревога</span>;
  return <span className="badge-warning">Вакантен</span>;
};

// ─── Sections ─────────────────────────────────────────────────────────────────
function Dashboard() {
  const active = employees.filter((e) => e.status === "active").length;
  const covered = posts.filter((p) => p.status === "covered").length;
  const vacant = posts.filter((p) => p.status === "vacant").length;
  const alert = posts.filter((p) => p.status === "alert").length;

  return (
    <div className="section-enter space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-border p-8 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        <div className="relative z-10">
          <p className="text-xs font-mono text-primary uppercase tracking-widest mb-2">27 апреля 2026 / Понедельник</p>
          <h1 className="text-3xl font-bold text-foreground mb-1">Добро пожаловать</h1>
          <p className="text-muted-foreground">SecureOps — система управления охраной</p>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5">
          <Icon name="Shield" size={160} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "На смене", value: active, icon: "UserCheck", color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Постов закрыто", value: covered, icon: "ShieldCheck", color: "text-primary", bg: "bg-primary/10" },
          { label: "Вакантных постов", value: vacant, icon: "ShieldOff", color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Тревоги", value: alert, icon: "AlertTriangle", color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <Icon name={s.icon} size={20} className={s.color} />
            </div>
            <div className={`text-3xl font-bold font-mono ${s.color} mb-1`}>{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Тревоги и вакансии</h3>
            <Icon name="Bell" size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {posts.filter(p => p.status !== "covered").map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.location} · {p.time}</p>
                </div>
                {postBadge(p.status)}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Сотрудники на смене</h3>
            <Icon name="Users" size={16} className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {employees.filter(e => e.status === "active").slice(0, 5).map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.location}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{e.shift.split(" – ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Placements() {
  const [selected, setSelected] = useState<Post | null>(null);
  const locations = ["Объект А", "Объект Б", "Объект В"];

  return (
    <div className="section-enter space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Расстановки</h2>
        <p className="text-muted-foreground text-sm mt-1">Назначение охранников на посты по объектам</p>
      </div>

      {locations.map(loc => (
        <div key={loc} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Building2" size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground">{loc}</h3>
            <span className="ml-auto text-xs text-muted-foreground font-mono">
              {posts.filter(p => p.location === loc && p.status === "covered").length}/{posts.filter(p => p.location === loc).length} постов закрыто
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {posts.filter(p => p.location === loc).map(post => (
              <button
                key={post.id}
                onClick={() => setSelected(post)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02]
                  ${post.status === "covered" ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" :
                    post.status === "alert" ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50" :
                    "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-sm text-foreground">{post.name}</span>
                  {postBadge(post.status)}
                </div>
                <p className="text-xs text-muted-foreground mb-1 font-mono">{post.time}</p>
                {post.officer ? (
                  <p className="text-xs text-foreground flex items-center gap-1">
                    <Icon name="User" size={11} /> {post.officer}
                  </p>
                ) : (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <Icon name="UserX" size={11} /> Не назначен
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md section-enter"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-foreground">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Объект</span><span className="font-medium">{selected.location}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Время</span><span className="font-mono">{selected.time}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Охранник</span><span className="font-medium">{selected.officer ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Статус</span>{postBadge(selected.status)}</div>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                Изменить назначение
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm hover:bg-secondary transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Employees() {
  const [filter, setFilter] = useState<"all" | "active" | "off" | "sick">("all");
  const filtered = filter === "all" ? employees : employees.filter(e => e.status === filter);

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Сотрудники</h2>
          <p className="text-muted-foreground text-sm mt-1">База охранников и их текущий статус</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Icon name="UserPlus" size={16} />
          Добавить
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Все" },
          { key: "active", label: "На смене" },
          { key: "off", label: "Выходной" },
          { key: "sick", label: "Больничный" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as "all" | "active" | "off" | "sick")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                {["Сотрудник", "Должность", "Статус", "Локация / Смена", "Телефон"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {e.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground text-sm">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{e.rank}</td>
                  <td className="px-5 py-4">{statusBadge(e.status)}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-foreground">{e.location}</p>
                    <p className="text-xs font-mono text-muted-foreground">{e.shift}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{e.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Schedule() {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const schedule: Record<string, (string | null)[]> = {
    "Иванов С.А.": ["Дн", "Дн", null, null, "Дн", "Дн", null],
    "Петров А.В.": ["Дн", null, "Дн", "Дн", null, null, "Дн"],
    "Смирнова Е.К.": ["Ноч", "Ноч", null, null, "Ноч", null, null],
    "Козлов Д.И.": [null, null, "Дн", "Дн", null, "Дн", "Дн"],
    "Николаева И.Р.": ["Дн", "Дн", "Дн", null, null, null, "Дн"],
    "Волков П.С.": [null, null, null, null, null, null, null],
    "Морозов А.Г.": ["Дн", null, null, "Дн", "Дн", "Дн", null],
    "Фёдорова Н.В.": ["Ноч", null, "Ноч", "Ноч", null, null, "Ноч"],
  };

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">График смен</h2>
          <p className="text-muted-foreground text-sm mt-1">Неделя 27 апреля — 3 мая 2026</p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground items-center">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/30 inline-block" /> Дневная</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-500/40 inline-block" /> Ночная</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted inline-block" /> Выходной</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3 w-44">
                  Сотрудник
                </th>
                {days.map((d, i) => (
                  <th key={d} className={`text-center text-xs font-medium uppercase tracking-wider px-3 py-3 
                    ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {d}
                    {i === 0 && <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(schedule).map(([name, shifts]) => (
                <tr key={name} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-foreground whitespace-nowrap">{name}</td>
                  {shifts.map((s, ci) => (
                    <td key={ci} className="px-2 py-3 text-center">
                      {s === "Дн" && (
                        <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-primary/20 text-primary text-xs font-mono font-semibold">
                          Дн
                        </span>
                      )}
                      {s === "Ноч" && (
                        <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
                          Ноч
                        </span>
                      )}
                      {s === null && (
                        <span className="inline-flex items-center justify-center w-10 h-7 rounded-lg bg-muted/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-border" />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Reports() {
  const reports = [
    { title: "Сводка за апрель 2026", date: "27.04.2026", type: "Месячный", size: "148 КБ" },
    { title: "Инцидент — Объект Б, ворота", date: "25.04.2026", type: "Инцидент", size: "56 КБ" },
    { title: "Смены — 3я неделя апреля", date: "21.04.2026", type: "Еженедельный", size: "98 КБ" },
    { title: "Пропуски и опоздания — апрель", date: "20.04.2026", type: "Кадровый", size: "72 КБ" },
    { title: "Сводка за март 2026", date: "31.03.2026", type: "Месячный", size: "162 КБ" },
  ];

  return (
    <div className="section-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Отчёты</h2>
          <p className="text-muted-foreground text-sm mt-1">Сформированные и архивные отчёты</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Icon name="Plus" size={16} />
          Новый отчёт
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border/50">
        {reports.map((r, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon name="FileText" size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.date} · {r.type} · {r.size}</p>
            </div>
            <span className="badge-active hidden sm:inline-flex">Готов</span>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Download" size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics() {
  const data = [
    { label: "Пн", day: 6, night: 2 },
    { label: "Вт", day: 5, night: 3 },
    { label: "Ср", day: 7, night: 1 },
    { label: "Чт", day: 4, night: 4 },
    { label: "Пт", day: 6, night: 2 },
    { label: "Сб", day: 3, night: 3 },
    { label: "Вс", day: 4, night: 2 },
  ];
  const max = 10;

  return (
    <div className="section-enter space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Аналитика</h2>
        <p className="text-muted-foreground text-sm mt-1">Статистика смен и покрытия объектов</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Часов отработано", value: "1 248", suffix: "ч", trend: "+8%" },
          { label: "Средняя явка", value: "94", suffix: "%", trend: "+2%" },
          { label: "Покрытие постов", value: "87", suffix: "%", trend: "-3%" },
          { label: "Инциденты", value: "2", suffix: "шт", trend: "=0" },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="text-2xl font-bold font-mono text-foreground mb-0.5">
              {k.value}<span className="text-sm text-muted-foreground ml-1">{k.suffix}</span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">{k.label}</div>
            <div className={`text-xs font-mono ${k.trend.startsWith("+") ? "text-emerald-400" : k.trend.startsWith("-") ? "text-red-400" : "text-muted-foreground"}`}>
              {k.trend} к прошлой неделе
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-6">Распределение смен по дням</h3>
        <div className="flex items-end gap-3" style={{ height: "140px" }}>
          {data.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full">
              <div className="w-full flex flex-col-reverse gap-0.5 flex-1">
                <div
                  className="w-full rounded-t bg-primary/40 transition-all duration-700"
                  style={{ height: `${(d.day / max) * 100}%` }}
                />
                <div
                  className="w-full rounded-t bg-indigo-500/40 transition-all duration-700"
                  style={{ height: `${(d.night / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono shrink-0">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded bg-primary/40" /> Дневные
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 h-3 rounded bg-indigo-500/40" /> Ночные
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Покрытие объектов</h3>
        <div className="space-y-4">
          {[
            { name: "Объект А", pct: 67, covered: 2, total: 3 },
            { name: "Объект Б", pct: 67, covered: 2, total: 3 },
            { name: "Объект В", pct: 100, covered: 2, total: 2 },
          ].map(o => (
            <div key={o.name}>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-foreground font-medium">{o.name}</span>
                <span className="text-muted-foreground font-mono">{o.covered}/{o.total} постов</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${o.pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: `${o.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExportPage() {
  const formats = [
    { label: "Excel (.xlsx)", icon: "Table", desc: "Таблица смен и сотрудников" },
    { label: "PDF отчёт", icon: "FileText", desc: "Готовый документ с печатью" },
    { label: "CSV данные", icon: "Database", desc: "Сырые данные для интеграции" },
    { label: "Word документ", icon: "FileType", desc: "Редактируемый шаблон отчёта" },
  ];

  return (
    <div className="section-enter space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Экспорт</h2>
        <p className="text-muted-foreground text-sm mt-1">Выгрузка данных в различных форматах</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formats.map(f => (
          <button
            key={f.label}
            className="text-left p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon name={f.icon} size={22} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
              <Icon name="Download" size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Параметры экспорта</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Период</label>
            <select className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground">
              <option>Текущая неделя</option>
              <option>Текущий месяц</option>
              <option>Прошлый месяц</option>
              <option>Произвольный период</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Объект</label>
            <select className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground">
              <option>Все объекты</option>
              <option>Объект А</option>
              <option>Объект Б</option>
              <option>Объект В</option>
            </select>
          </div>
        </div>
        <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          Экспортировать
        </button>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="section-enter space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Настройки</h2>
        <p className="text-muted-foreground text-sm mt-1">Конфигурация системы и параметры организации</p>
      </div>

      {[
        {
          title: "Организация",
          items: [
            { label: "Название", value: "ООО «Охранная Группа»" },
            { label: "Лицензия", value: "ЧО-123456 / до 31.12.2027" },
            { label: "Контакт", value: "+7 800 123-45-67" },
          ],
        },
        {
          title: "Смены",
          items: [
            { label: "Дневная смена", value: "08:00 – 20:00" },
            { label: "Ночная смена", value: "20:00 – 08:00" },
            { label: "Мин. охранников на объект", value: "2" },
          ],
        },
        {
          title: "Уведомления",
          items: [
            { label: "Email для отчётов", value: "admin@example.com" },
            { label: "SMS-тревога", value: "+7 900 000-00-00" },
          ],
        },
      ].map(section => (
        <div key={section.title} className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
          <div className="space-y-4">
            {section.items.map(item => (
              <div key={item.label} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-center">
                <label className="text-sm text-muted-foreground">{item.label}</label>
                <input
                  defaultValue={item.value}
                  className="bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
              Сохранить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderSection = () => {
    switch (active) {
      case "dashboard": return <Dashboard />;
      case "placements": return <Placements />;
      case "employees": return <Employees />;
      case "reports": return <Reports />;
      case "schedule": return <Schedule />;
      case "export": return <ExportPage />;
      case "analytics": return <Analytics />;
      case "settings": return <Settings />;
    }
  };

  const handleNav = (key: Section) => {
    setActive(key);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon name="Shield" size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">SecureOps</p>
              <p className="text-xs text-muted-foreground font-mono">v1.0</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key as Section)}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">АД</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Администратор</p>
              <p className="text-xs text-muted-foreground">Главный диспетчер</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0 bg-background/80 backdrop-blur-sm">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="Menu" size={20} />
          </button>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">
              {navItems.find(n => n.key === active)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">Система активна</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Bell" size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6" key={active}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}