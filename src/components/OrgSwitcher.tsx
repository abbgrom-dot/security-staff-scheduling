import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import Icon from "@/components/ui/icon";

export default function OrgSwitcher({ onSwitch }: { onSwitch?: (orgId: number) => void }) {
  const { session, orgs, switchOrg, isSuperAdmin } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const doSwitch = (orgId: number) => {
    if (onSwitch) onSwitch(orgId);
    else switchOrg(orgId);
    setOpen(false);
  };

  const availableOrgs = session
    ? orgs.filter(o => session.user.orgIds.includes(o.id))
    : [];
  const current = orgs.find(o => o.id === session?.currentOrgId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!current || availableOrgs.length <= 1) {
    return (
      <div className="px-3 py-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: current?.color ?? "#6366f1" }} />
        <span className="text-xs font-medium text-foreground truncate">{current?.shortName ?? "—"}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left"
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: current.color }} />
        <span className="text-xs font-medium text-foreground flex-1 truncate">{current.shortName}</span>
        <Icon name="ChevronsUpDown" size={13} className="text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1.5">
            {isSuperAdmin() ? "Все организации холдинга" : "Ваши организации"}
          </p>
          {availableOrgs.map(org => (
            <button
              key={org.id}
              onClick={() => doSwitch(org.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left
                ${org.id === current.id ? "bg-muted/30" : ""}`}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: org.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{org.shortName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{org.inn}</p>
              </div>
              {org.id === current.id && <Icon name="Check" size={12} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}