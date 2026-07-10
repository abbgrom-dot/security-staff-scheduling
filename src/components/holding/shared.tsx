import type { Organization } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽";
export const inputCls = "w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors";

export function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
        {label}{req && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export const ORG_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
];

export const EMPTY_ORG: Omit<Organization, "id" | "holdingId"> = {
  name: "", shortName: "", inn: "", address: "", phone: "", license: "", color: "#6366f1",
};
