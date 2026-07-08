import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type {
  Holding, Organization, Role, AppUser,
  Location, Employee, Post, FineReason, FineRecord,
  AuthSession, Permission,
} from "@/types";
import {
  INIT_HOLDING,
} from "@/data";
import {
  apiLoadAll, apiLogin,
  apiAddOrg, apiEditOrg, apiDeleteOrg,
  apiAddRole, apiEditRole, apiDeleteRole,
  apiAddUser, apiEditUser, apiDeleteUser, apiChangePassword,
  apiAddLocation, apiEditLocation, apiDeleteLocation,
  apiAddEmployee, apiEditEmployee, apiSetEmployeeStatus, apiDeleteEmployee,
  apiAssignPost, apiConfirmPost, apiClosePost,
  apiReplaceFineReasons, apiAddFine,
} from "@/lib/api";

interface AppContextValue {
  // Loading & data readiness
  loading: boolean;
  loadError: string | null;

  // Auth
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: number) => void;
  can: (p: Permission) => boolean;
  isSuperAdmin: () => boolean;

  // Holding & Orgs
  holding: Holding;
  orgs: Organization[];
  addOrg: (d: Omit<Organization, "id" | "holdingId">) => void;
  editOrg: (id: number, d: Omit<Organization, "id" | "holdingId">) => void;
  deleteOrg: (id: number) => void;
  currentOrg: Organization | undefined;

  // Roles
  roles: Role[];
  addRole: (d: Omit<Role, "id">) => void;
  editRole: (id: number, d: Omit<Role, "id">) => void;
  deleteRole: (id: number) => void;

  // Users
  users: AppUser[];
  addUser: (d: Omit<AppUser, "id" | "holdingId" | "lastLogin"> & { password?: string }) => void;
  editUser: (id: number, d: Partial<AppUser>) => void;
  deleteUser: (id: number) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Domain (scoped to currentOrgId)
  locations: Location[];
  addLocation: (d: Omit<Location, "id" | "orgId">) => void;
  editLocation: (id: number, d: Omit<Location, "id" | "orgId">) => void;
  deleteLocation: (id: number) => void;

  employees: Employee[];
  addEmployee: (d: Omit<Employee, "id" | "orgId">) => void;
  editEmployee: (id: number, d: Omit<Employee, "id" | "orgId">) => void;
  deleteEmployee: (id: number) => void;

  posts: Post[];
  assignPost: (postId: number, officerId: number | null, fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;
  confirmPost: (postId: number, actualStartTime: string, confirmedBy: string) => void;
  closePost: (postId: number, actualHours: number, reason: "auto" | "manual", note: string, fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null) => void;

  fineReasons: FineReason[];
  setFineReasons: (reasons: FineReason[]) => void;

  fines: FineRecord[];

  // Global (all orgs) — for holding view
  allLocations: Location[];
  allEmployees: Employee[];
  allPosts: Post[];
  allFines: FineRecord[];
}

const Ctx = createContext<AppContextValue | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be inside AppProvider");
  return v;
}

function maxId<T extends { id: number }>(arr: T[]) {
  return arr.length === 0 ? 0 : Math.max(...arr.map(x => x.id));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [holding, setHolding] = useState<Holding>(INIT_HOLDING);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);

  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [allFineReasons, setAllFineReasons] = useState<FineReason[]>([]);
  const [allFines, setAllFines] = useState<FineRecord[]>([]);

  // ── Initial load from API ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    apiLoadAll()
      .then(data => {
        if (cancelled) return;
        if (data.holding) setHolding(data.holding);
        setOrgs(data.orgs);
        setRoles(data.roles);
        setUsers(data.users);
        setAllLocations(data.locations);
        setAllEmployees(data.employees);
        setAllPosts(data.posts);
        setAllFineReasons(data.fineReasons);
        setAllFines(data.fines);
      })
      .catch(err => { if (!cancelled) setLoadError(err.message || "Ошибка загрузки"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const currentOrgId = session?.currentOrgId ?? 0;
  const currentOrg = orgs.find(o => o.id === currentOrgId);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const user = await apiLogin(email, password);
    // sync fresh user into users list
    setUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      return exists ? prev.map(u => u.id === user.id ? user : u) : [...prev, user];
    });
    const defaultOrg = user.orgIds[0];
    setSession({ user, currentOrgId: defaultOrg });
  };

  const logout = () => setSession(null);

  const switchOrg = (orgId: number) => {
    if (!session) return;
    setSession(s => s ? { ...s, currentOrgId: orgId } : s);
  };

  // ── Permissions ──────────────────────────────────────────────────────────
  const getUserPermissions = (user: AppUser): Set<Permission> => {
    const perms = new Set<Permission>();
    user.roleIds.forEach(rid => {
      const role = roles.find(r => r.id === rid);
      role?.permissions.forEach(p => perms.add(p));
    });
    return perms;
  };

  const can = (p: Permission): boolean => {
    if (!session) return false;
    return getUserPermissions(session.user).has(p);
  };

  const isSuperAdmin = () => {
    if (!session) return false;
    return session.user.roleIds.some(rid => roles.find(r => r.id === rid)?.permissions.includes("holding:view"));
  };

  // ── Orgs CRUD ────────────────────────────────────────────────────────────
  const addOrg = (d: Omit<Organization, "id" | "holdingId">) => {
    apiAddOrg({ holdingId: holding.id, ...d })
      .then(res => setOrgs(prev => [...prev, res.item]))
      .catch(console.error);
  };
  const editOrg = (id: number, d: Omit<Organization, "id" | "holdingId">) => {
    const updated = { id, holdingId: holding.id, ...d };
    setOrgs(prev => prev.map(o => o.id === id ? updated : o));
    apiEditOrg(updated).catch(console.error);
  };
  const deleteOrg = (id: number) => {
    setOrgs(prev => prev.filter(o => o.id !== id));
    apiDeleteOrg(id).catch(console.error);
  };

  // ── Roles CRUD ───────────────────────────────────────────────────────────
  const addRole = (d: Omit<Role, "id">) => {
    apiAddRole(d).then(res => setRoles(prev => [...prev, res.item])).catch(console.error);
  };
  const editRole = (id: number, d: Omit<Role, "id">) => {
    const updated = { id, ...d };
    setRoles(prev => prev.map(r => r.id === id ? updated : r));
    apiEditRole(updated).catch(console.error);
  };
  const deleteRole = (id: number) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    apiDeleteRole(id).catch(console.error);
  };

  // ── Users CRUD ───────────────────────────────────────────────────────────
  const addUser = (d: Omit<AppUser, "id" | "holdingId" | "lastLogin"> & { password?: string }) => {
    const payload = { holdingId: holding.id, lastLogin: new Date().toISOString().slice(0, 10), ...d };
    apiAddUser(payload).then(res => setUsers(prev => [...prev, res.item])).catch(console.error);
  };
  const editUser = (id: number, d: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...d } : u));
    apiEditUser(id, d).catch(console.error);
  };
  const deleteUser = (id: number) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    apiDeleteUser(id).catch(console.error);
  };
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) throw new Error("Нет активной сессии");
    await apiChangePassword(session.user.id, currentPassword, newPassword);
  };

  // ── Scoped domain data ───────────────────────────────────────────────────
  const locations = allLocations.filter(l => l.orgId === currentOrgId);
  const employees = allEmployees.filter(e => e.orgId === currentOrgId);
  const posts = allPosts.filter(p => p.orgId === currentOrgId);
  const fineReasons = allFineReasons.filter(r => r.orgId === currentOrgId);
  const fines = allFines.filter(f => f.orgId === currentOrgId);

  const addLocation = (d: Omit<Location, "id" | "orgId">) => {
    apiAddLocation({ orgId: currentOrgId, ...d })
      .then(res => setAllLocations(prev => [...prev, res.item]))
      .catch(console.error);
  };
  const editLocation = (id: number, d: Omit<Location, "id" | "orgId">) => {
    const updated = { id, orgId: currentOrgId, ...d };
    setAllLocations(prev => prev.map(l => l.id === id ? updated : l));
    apiEditLocation(updated).catch(console.error);
  };
  const deleteLocation = (id: number) => {
    setAllLocations(prev => prev.filter(l => l.id !== id));
    apiDeleteLocation(id).catch(console.error);
  };

  const addEmployee = (d: Omit<Employee, "id" | "orgId">) => {
    apiAddEmployee({ orgId: currentOrgId, ...d })
      .then(res => setAllEmployees(prev => [...prev, res.item]))
      .catch(console.error);
  };
  const editEmployee = (id: number, d: Omit<Employee, "id" | "orgId">) => {
    const updated = { id, orgId: currentOrgId, ...d };
    setAllEmployees(prev => prev.map(e => e.id === id ? updated : e));
    apiEditEmployee(updated).catch(console.error);
  };
  const deleteEmployee = (id: number) => {
    setAllEmployees(prev => prev.filter(e => e.id !== id));
    apiDeleteEmployee(id).catch(console.error);
  };

  const assignPost = (
    postId: number,
    officerId: number | null,
    fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null
  ) => {
    const newEmp = officerId !== null ? allEmployees.find(e => e.id === officerId) : null;
    const isExtraShift = newEmp?.status === "off" || newEmp?.status === "extra";
    const status: Post["status"] = officerId !== null ? "covered" : "vacant";

    setAllPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p, officerId, status, isExtraShift: isExtraShift ?? false,
        confirmedAt: null, confirmedBy: null, actualStartTime: null, actualHours: null,
        closedAt: null, closeReason: null, closeNote: null,
      };
    }));
    apiAssignPost(postId, officerId, status, isExtraShift ?? false).catch(console.error);

    // Переводим сотрудника в статус "extra" если он выходной и его назначили
    if (newEmp && newEmp.status === "off") {
      setAllEmployees(prev => prev.map(e => e.id === newEmp.id ? { ...e, status: "extra" as const } : e));
      apiSetEmployeeStatus(newEmp.id, "extra").catch(console.error);
    }

    // При замене или снятии — возвращаем предыдущего "extra" → "off"
    const post = allPosts.find(p => p.id === postId);
    if (post?.officerId && post.officerId !== officerId) {
      const prevEmp = allEmployees.find(e => e.id === post.officerId);
      if (prevEmp?.status === "extra") {
        setAllEmployees(prev => prev.map(e => e.id === prevEmp.id ? { ...e, status: "off" as const } : e));
        apiSetEmployeeStatus(prevEmp.id, "off").catch(console.error);
      }
    }

    if (fine) {
      const today = new Date().toISOString().slice(0, 10);
      const record = { orgId: currentOrgId, date: today, postId, ...fine };
      setAllFines(prev => [...prev, { id: maxId(prev) + 1, ...record }]);
      apiAddFine(record).then(res => {
        setAllFines(prev => prev.map(f => f.id === maxId(prev) ? res.item : f));
      }).catch(console.error);
    }
  };

  // Оператор подтверждает фактическое заступление
  const confirmPost = (postId: number, actualStartTime: string, confirmedBy: string) => {
    const confirmedAt = new Date().toISOString();
    setAllPosts(prev => prev.map(p =>
      p.id !== postId ? p : { ...p, confirmedAt, confirmedBy, actualStartTime, actualHours: null }
    ));
    apiConfirmPost(postId, confirmedAt, confirmedBy, actualStartTime).catch(console.error);
  };

  // Оператор закрывает смену — фиксирует часы, причину, штраф
  const closePost = (
    postId: number,
    actualHours: number,
    reason: "auto" | "manual",
    note: string,
    fine: Omit<FineRecord, "id" | "date" | "postId" | "orgId"> | null,
  ) => {
    const closedAt = new Date().toISOString();
    setAllPosts(prev => prev.map(p =>
      p.id !== postId ? p : { ...p, actualHours, closedAt, closeReason: reason, closeNote: note || null }
    ));
    apiClosePost(postId, actualHours, closedAt, reason, note || null).catch(console.error);

    // Сотрудник active/extra → off после завершения смены
    const post = allPosts.find(p => p.id === postId);
    if (post?.officerId) {
      const emp = allEmployees.find(e => e.id === post.officerId);
      if (emp && (emp.status === "active" || emp.status === "extra")) {
        setAllEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: "off" as const } : e));
        apiSetEmployeeStatus(emp.id, "off").catch(console.error);
      }
    }

    if (fine) {
      const today = new Date().toISOString().slice(0, 10);
      const record = { orgId: currentOrgId, date: today, postId, ...fine };
      setAllFines(prev => [...prev, { id: maxId(prev) + 1, ...record }]);
      apiAddFine(record).then(res => {
        setAllFines(prev => prev.map(f => f.id === maxId(prev) ? res.item : f));
      }).catch(console.error);
    }
  };

  const setFineReasons = (reasons: FineReason[]) => {
    setAllFineReasons(prev => [...prev.filter(r => r.orgId !== currentOrgId), ...reasons]);
    apiReplaceFineReasons(currentOrgId, reasons)
      .then(res => setAllFineReasons(prev => [...prev.filter(r => r.orgId !== currentOrgId), ...res.items]))
      .catch(console.error);
  };

  const value: AppContextValue = {
    loading, loadError,
    session, login, logout, switchOrg, can, isSuperAdmin,
    holding, orgs, addOrg, editOrg, deleteOrg, currentOrg,
    roles, addRole, editRole, deleteRole,
    users, addUser, editUser, deleteUser, changePassword,
    locations, addLocation, editLocation, deleteLocation,
    employees, addEmployee, editEmployee, deleteEmployee,
    posts, assignPost, confirmPost, closePost,
    fineReasons, setFineReasons,
    fines,
    allLocations, allEmployees, allPosts, allFines,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}