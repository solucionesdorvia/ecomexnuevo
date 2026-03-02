export type AppRole = "user" | "operator" | "admin" | "expert";

export type RolePermission =
  | "quote:view"
  | "quote:edit"
  | "quote:validate"
  | "quote:export"
  | "quote:override"
  | "comment:write"
  | "operator:use";

const MAP: Record<AppRole, RolePermission[]> = {
  user: ["quote:view", "quote:edit", "quote:export", "comment:write"],
  operator: [
    "quote:view",
    "quote:edit",
    "quote:validate",
    "quote:export",
    "quote:override",
    "comment:write",
    "operator:use",
  ],
  expert: ["quote:view", "quote:validate", "quote:export", "comment:write"],
  admin: [
    "quote:view",
    "quote:edit",
    "quote:validate",
    "quote:export",
    "quote:override",
    "comment:write",
    "operator:use",
  ],
};

export function can(role: AppRole | null | undefined, permission: RolePermission) {
  if (!role) return false;
  return MAP[role]?.includes(permission) ?? false;
}

export function roleLabel(role: AppRole | null | undefined) {
  if (role === "admin") return "Admin empresa";
  if (role === "operator") return "Operador interno";
  if (role === "expert") return "Consultor experto";
  return "Cliente";
}

export const ROLE_ACCESS_DESCRIPTION: Array<{
  role: AppRole;
  title: string;
  detail: string;
  permissions: RolePermission[];
}> = [
  {
    role: "user",
    title: "Cliente",
    detail: "Crea cotizaciones, exporta reportes y conversa con especialistas.",
    permissions: MAP.user,
  },
  {
    role: "operator",
    title: "Operador interno",
    detail: "Gestiona presupuestos internos, ajustes y validaciones operativas.",
    permissions: MAP.operator,
  },
  {
    role: "expert",
    title: "Consultor experto",
    detail: "Valida clasificación, riesgos y recomendaciones finales.",
    permissions: MAP.expert,
  },
  {
    role: "admin",
    title: "Admin empresa",
    detail: "Control total de usuarios, operaciones, overrides y exportación.",
    permissions: MAP.admin,
  },
];

