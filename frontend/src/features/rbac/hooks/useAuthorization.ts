"use client";

import { useAuthStore } from "@/infrastructure/store/auth-store";

export const useAuthorization = () => {
  const { user, activeOrganizationId, isAuthenticated } = useAuthStore();

  // Find active membership details in currently selected Organization context
  const activeMembership = user?.memberships.find(
    (membership) => membership.organization.id === activeOrganizationId
  );

  const hasPermission = (permissionCode: string): boolean => {
    if (!isAuthenticated || !activeMembership) return false;
    
    // Super Admin role overrides all permission codes
    if (activeMembership.role_code === "SUPER_ADMIN") return true;

    return activeMembership.permissions?.includes(permissionCode) || false;
  };

  const hasRole = (roleCode: string): boolean => {
    if (!isAuthenticated || !activeMembership) return false;
    return activeMembership.role_code === roleCode;
  };

  return {
    hasPermission,
    hasRole,
    roleCode: activeMembership?.role_code || null,
    roleName: activeMembership?.role_name || null,
    permissions: activeMembership?.permissions || [],
  };
};
export default useAuthorization;
