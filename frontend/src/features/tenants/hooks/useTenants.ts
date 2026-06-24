import { useAuthStore } from "@/infrastructure/store/auth-store";
import { queryClient } from "@/infrastructure/query/query-client";

export const useTenants = () => {
  const { user, activeOrganizationId, setActiveOrganizationId } = useAuthStore();

  const switchOrganization = (orgId: string) => {
    // 1. Confirm user has membership mapping inside target org
    const orgExists = user?.memberships.some(
      (m) => m.organization.id === orgId
    );
    
    if (!orgExists) {
      console.error("Access violation: User is not mapped to target workspace.");
      return;
    }

    // 2. Set active tenant context
    setActiveOrganizationId(orgId);

    // 3. CRITICAL: Wipe out TanStack Query cache.
    // Wiping the cache prevents residual query caches of organization A 
    // from being read in the dashboard of organization B.
    queryClient.clear();
  };

  const activeOrganization = user?.memberships.find(
    (m) => m.organization.id === activeOrganizationId
  )?.organization;

  return {
    organizations: user?.memberships.map((m) => m.organization) || [],
    activeOrganization,
    switchOrganization,
  };
};
export default useTenants;
