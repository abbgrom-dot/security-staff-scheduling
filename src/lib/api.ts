import type {
  Holding, Organization, Role, AppUser,
  Location, Employee, Post, FineReason, FineRecord,
} from "@/types";

const AUTH_URL = "https://functions.poehali.dev/bc06acd2-de7b-40ab-9289-ad071f198ef2";
const DATA_URL = "https://functions.poehali.dev/b6898e8b-e3eb-42fa-aa4b-67c62a8eb31f";

export interface AllData {
  holding: Holding;
  orgs: Organization[];
  roles: Role[];
  users: AppUser[];
  locations: Location[];
  employees: Employee[];
  posts: Post[];
  fineReasons: FineReason[];
  fines: FineRecord[];
}

export async function apiLogin(email: string, password: string): Promise<AppUser> {
  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка входа");
  return data.user as AppUser;
}

export async function apiChangePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "changePassword", userId, currentPassword, newPassword }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка смены пароля");
}

export async function apiLoadAll(): Promise<AllData> {
  const r = await fetch(DATA_URL, { method: "GET" });
  if (!r.ok) throw new Error("Не удалось загрузить данные");
  return r.json();
}

type Mutation = {
  entity: string;
  action: string;
  data: object;
};

async function mutate<T = unknown>(m: Mutation): Promise<T> {
  const r = await fetch(DATA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(m),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Ошибка сохранения");
  return data as T;
}

// ── Orgs ──
export const apiAddOrg = (d: Omit<Organization, "id">) => mutate<{ item: Organization }>({ entity: "org", action: "add", data: d });
export const apiEditOrg = (d: Organization) => mutate<{ item: Organization }>({ entity: "org", action: "edit", data: d });
export const apiDeleteOrg = (id: number) => mutate({ entity: "org", action: "delete", data: { id } });

// ── Roles ──
export const apiAddRole = (d: Omit<Role, "id">) => mutate<{ item: Role }>({ entity: "role", action: "add", data: d });
export const apiEditRole = (d: Role) => mutate<{ item: Role }>({ entity: "role", action: "edit", data: d });
export const apiDeleteRole = (id: number) => mutate({ entity: "role", action: "delete", data: { id } });

// ── Users ──
export const apiAddUser = (d: Omit<AppUser, "id"> & { password?: string }) => mutate<{ item: AppUser }>({ entity: "user", action: "add", data: d });
export const apiEditUser = (id: number, d: Partial<AppUser>) => mutate<{ item: AppUser }>({ entity: "user", action: "edit", data: { id, ...d } });
export const apiDeleteUser = (id: number) => mutate({ entity: "user", action: "delete", data: { id } });

// ── Locations ──
export const apiAddLocation = (d: Omit<Location, "id">) => mutate<{ item: Location }>({ entity: "location", action: "add", data: d });
export const apiEditLocation = (d: Location) => mutate<{ item: Location }>({ entity: "location", action: "edit", data: d });
export const apiDeleteLocation = (id: number) => mutate({ entity: "location", action: "delete", data: { id } });

// ── Employees ──
export const apiAddEmployee = (d: Omit<Employee, "id">) => mutate<{ item: Employee }>({ entity: "employee", action: "add", data: d });
export const apiEditEmployee = (d: Employee) => mutate<{ item: Employee }>({ entity: "employee", action: "edit", data: d });
export const apiSetEmployeeStatus = (id: number, status: Employee["status"]) => mutate<{ item: Employee }>({ entity: "employee", action: "setStatus", data: { id, status } });
export const apiDeleteEmployee = (id: number) => mutate({ entity: "employee", action: "delete", data: { id } });

// ── Posts ──
export const apiAssignPost = (id: number, officerId: number | null, status: Post["status"], isExtraShift: boolean) =>
  mutate<{ item: Post }>({ entity: "post", action: "assign", data: { id, officerId, status, isExtraShift } });
export const apiConfirmPost = (id: number, confirmedAt: string, confirmedBy: string, actualStartTime: string) =>
  mutate<{ item: Post }>({ entity: "post", action: "confirm", data: { id, confirmedAt, confirmedBy, actualStartTime } });
export const apiClosePost = (id: number, actualHours: number, closedAt: string, closeReason: string, closeNote: string | null) =>
  mutate<{ item: Post }>({ entity: "post", action: "close", data: { id, actualHours, closedAt, closeReason, closeNote } });

// ── Fine reasons ──
export const apiReplaceFineReasons = (orgId: number, reasons: FineReason[]) =>
  mutate<{ items: FineReason[] }>({ entity: "fineReasons", action: "replace", data: { orgId, reasons } });

// ── Fines ──
export const apiAddFine = (d: Omit<FineRecord, "id">) => mutate<{ item: FineRecord }>({ entity: "fine", action: "add", data: d });