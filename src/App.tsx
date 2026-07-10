import { useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import LoginScreen from "@/components/LoginScreen";
import OrgSwitcher from "@/components/OrgSwitcher";
import UsersSection from "@/components/UsersSection";
import HoldingSection from "@/components/HoldingSection";
import Icon from "@/components/ui/icon";
import type { Section } from "@/types";
import { NAV_ITEMS } from "@/app/shared";
import {
  Dashboard, Objects, Placements, Employees, Fines,
  Schedule, Reports, Analytics, ExportPage, Settings,
} from "@/app/sections";

// ─── Shell ────────────────────────────────────────────────────────────────────
function Shell() {
  const { session, logout, can, fines, posts, holding, currentOrg, isSuperAdmin, switchOrg, loading, loadError } = useApp();
  const [active, setActive] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
        <Icon name="Shield" size={32} className="text-primary" />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon name="Loader2" size={16} className="animate-spin" />
        <span className="text-sm">Загрузка данных...</span>
      </div>
    </div>
  );

  if (loadError) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
      <Icon name="AlertTriangle" size={40} className="text-red-400" />
      <p className="text-foreground font-medium">Не удалось загрузить данные</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">{loadError}</p>
      <button onClick={() => location.reload()} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
        Повторить
      </button>
    </div>
  );

  if (!session) return <LoginScreen />;

  // holding-only items visible only to superadmin
  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.holdingOnly) return isSuperAdmin();
    return !item.perm || can(item.perm as Parameters<typeof can>[0]);
  });
  const unresolved = posts.filter(p => p.status === "alert" || p.status === "vacant").length;

  const handleSwitchOrg = (orgId: number) => {
    switchOrg(orgId);
    setActive("dashboard");
    setSidebarOpen(false);
  };

  const renderSection = () => {
    switch (active) {
      case "dashboard":  return <Dashboard />;
      case "objects":    return <Objects />;
      case "placements": return <Placements />;
      case "employees":  return <Employees />;
      case "fines":      return <Fines />;
      case "reports":    return <Reports />;
      case "schedule":   return <Schedule />;
      case "export":     return <ExportPage />;
      case "analytics":  return <Analytics />;
      case "users":      return <UsersSection />;
      case "holding":    return <HoldingSection onSwitchOrg={handleSwitchOrg} />;
      case "settings":   return <Settings />;
    }
  };

  const handleNav = (k: Section) => { setActive(k); setSidebarOpen(false); };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Holding header */}
        <div className="px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            {holding.logo
              ? <img src={holding.logo} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
              : <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0"><Icon name="Shield" size={18} className="text-primary" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm truncate">{holding.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">ИНН {holding.inn}</p>
            </div>
          </div>
          {/* Org switcher */}
          <OrgSwitcher onSwitch={handleSwitchOrg} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}>
              <Icon name={item.icon} size={18} />
              {item.label}
              {item.key === "fines" && fines.length > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{fines.length}</span>
              )}
              {item.key === "placements" && unresolved > 0 && (
                <span className="ml-auto text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{unresolved}</span>
              )}
            </button>
          ))}

          {/* Divider before holding section */}
          {isSuperAdmin() && (
            <div className="mt-2 pt-2 border-t border-sidebar-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">Управление холдингом</p>
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0" style={{ backgroundColor: currentOrg?.color ? currentOrg.color + "30" : undefined, borderColor: currentOrg?.color, border: `1px solid ${currentOrg?.color ?? "transparent"}` }}>
              {session.user.avatarInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
            <button onClick={logout} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0" title="Выйти">
              <Icon name="LogOut" size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 shrink-0 bg-background/80 backdrop-blur-sm">
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground" onClick={() => setSidebarOpen(true)}><Icon name="Menu" size={20} /></button>
          <div className="flex-1 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{NAV_ITEMS.find(n => n.key === active)?.label}</span>
            {currentOrg && (
              <span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={{ color: currentOrg.color, borderColor: currentOrg.color + "40", backgroundColor: currentOrg.color + "15" }}>
                {currentOrg.shortName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
              <span className="text-xs text-muted-foreground hidden sm:block">Система активна</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Icon name="Bell" size={18} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" key={active}>{renderSection()}</main>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
