import type { SessionUser } from "@/lib/auth/session";

/** Operador/admin puede ver cualquier Operation; usuario solo la propia. */
export function operationWhereForUser(user: SessionUser, operationId: string) {
  if (user.role === "operator" || user.role === "admin") {
    return { id: operationId };
  }
  return { id: operationId, userId: user.id };
}
