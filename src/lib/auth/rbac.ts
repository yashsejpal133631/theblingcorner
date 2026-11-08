export type Role = "CUSTOMER" | "VENDOR" | "SUPER_ADMIN";

/**
 * Checks if a user's role satisfies any of the allowed roles
 */
export function hasRole(userRole: Role | undefined | null, allowedRoles: Role[]): boolean {
  if (!userRole) return false;
  // SUPER_ADMIN has access to everything
  if (userRole === "SUPER_ADMIN") return true;
  return allowedRoles.includes(userRole);
}

/**
 * Validates whether a given string is a valid system Role
 */
export function isValidRole(role: string): role is Role {
  return role === "CUSTOMER" || role === "VENDOR" || role === "SUPER_ADMIN";
}

