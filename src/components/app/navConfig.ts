export type AppNavItem = {
  href: string;
  label: string;
  icon: string;
  group: "core" | "operations" | "intelligence" | "workspace";
  description: string;
  primary?: boolean;
  operatorOnly?: boolean;
};

export const APP_NAV_GROUP_LABELS: Record<AppNavItem["group"], string> = {
  core: "Flujo principal",
  operations: "Ejecucion",
  intelligence: "Inteligencia",
  workspace: "Workspace",
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: "/app",
    label: "Inicio",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4",
    group: "core",
    description: "Estado general de tu operacion.",
  },
  {
    href: "/app/nueva",
    label: "Nueva operacion",
    icon: "M12 4v16m8-8H4",
    group: "core",
    description: "Iniciar una cotizacion o presupuesto.",
    primary: true,
  },
  {
    href: "/app/operaciones",
    label: "Operaciones",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    group: "operations",
    description: "Pipeline completo de importaciones.",
  },
  {
    href: "/app/documentos",
    label: "Documentos",
    icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    group: "operations",
    description: "Repositorio de archivos por operacion.",
  },
  {
    href: "/app/proveedores",
    label: "Proveedores",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    group: "operations",
    description: "Base de proveedores y relacion comercial.",
  },
  {
    href: "/app/costos",
    label: "Costos",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1",
    group: "intelligence",
    description: "Desglose economico consolidado.",
  },
  {
    href: "/app/analisis",
    label: "Analisis",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    group: "intelligence",
    description: "Lectura ejecutiva de cada cotizacion.",
  },
  {
    href: "/app/reportes",
    label: "Reportes",
    icon: "M11 3l1.5 2.5L15 6l-2 1.9.5 2.6L11 9.2 8.5 10.5 9 7.9 7 6l2.5-.5L11 3zM4 12h16M7 16h10M9 20h6",
    group: "intelligence",
    description: "Historial exportable y evidencia.",
  },
  {
    href: "/app/configuracion",
    label: "Configuracion",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    group: "workspace",
    description: "Cuenta, empresa y preferencias del sistema.",
  },
  {
    href: "/app/operador",
    label: "Operador",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    group: "workspace",
    description: "Gestion interna para equipo operador.",
    operatorOnly: true,
  },
];

export function matchNavItem(pathname: string, isOperator: boolean) {
  const visible = APP_NAV_ITEMS.filter((item) => (item.operatorOnly ? isOperator : true));
  return visible.find((item) =>
    item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
}

export function buildBreadcrumbs(pathname: string, isOperator: boolean) {
  const visible = APP_NAV_ITEMS.filter((item) => (item.operatorOnly ? isOperator : true));
  const crumbs: { label: string; href: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current += `/${segment}`;
    const hit = visible.find((item) => item.href === current);
    if (hit) crumbs.push({ label: hit.label, href: hit.href });
    else if (segment !== "app") crumbs.push({ label: segment, href: current });
  }
  return crumbs;
}
