import type { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import type { Permission } from "@/types";

/**
 * Гард доступа по правам. Рендерит children только если у пользователя есть право(а).
 *
 * <Can perm="objects:edit">...</Can>                — нужно одно право
 * <Can any={["fines:edit","fines:view"]}>...</Can>  — достаточно любого из
 * <Can all={["users:edit","roles:edit"]}>...</Can>  — нужны все
 * fallback — что показать при отсутствии прав (по умолчанию ничего)
 * orgId — проверить право в контексте конкретной организации (по умолчанию активная)
 */
export default function Can({
  perm, any, all, orgId, fallback = null, children,
}: {
  perm?: Permission;
  any?: Permission[];
  all?: Permission[];
  orgId?: number;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny, canAll } = useApp();

  let allowed = true;
  if (perm) allowed = allowed && can(perm, orgId);
  if (any && any.length) allowed = allowed && canAny(any, orgId);
  if (all && all.length) allowed = allowed && canAll(all, orgId);

  return <>{allowed ? children : fallback}</>;
}
