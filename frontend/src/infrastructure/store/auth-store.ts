import { create } from "zustand";

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser?: boolean;
  mfa_enabled?: boolean;
  memberships: Array<{
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    role_name: string;
    role_code: string;
    permissions?: string[];
  }>;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeOrganizationId: string | null;
  isAuthenticated: boolean;
  
  // --- MFA Intermediate State ---
  mfaPending: boolean;
  mfaToken: string | null;

  setTokens: (access: string, refresh: string) => void;
  setMfaPending: (pending: boolean, token: string | null) => void;
  setUser: (user: UserProfile) => void;
  setActiveOrganizationId: (orgId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const isClient = typeof window !== "undefined";
  const initialAccess = isClient ? localStorage.getItem("ts_access") : null;
  const initialRefresh = isClient ? localStorage.getItem("ts_refresh") : null;
  const initialOrg = isClient ? localStorage.getItem("ts_org") : null;

  return {
    user: null,
    accessToken: initialAccess,
    refreshToken: initialRefresh,
    activeOrganizationId: initialOrg,
    isAuthenticated: !!initialAccess,
    
    mfaPending: false,
    mfaToken: null,

    setTokens: (access, refresh) => {
      if (isClient) {
        localStorage.setItem("ts_access", access);
        localStorage.setItem("ts_refresh", refresh);
      }
      set({ accessToken: access, refreshToken: refresh, isAuthenticated: true, mfaPending: false, mfaToken: null });
    },

    setMfaPending: (pending, token) => {
      set({ mfaPending: pending, mfaToken: token });
    },

    setUser: (user) => {
      let activeOrg = useAuthStore.getState().activeOrganizationId;
      if (!activeOrg && user.memberships.length > 0) {
        activeOrg = user.memberships[0].organization.id;
        if (isClient && activeOrg) {
          localStorage.setItem("ts_org", activeOrg);
        }
      }
      set({ user, activeOrganizationId: activeOrg });
    },

    setActiveOrganizationId: (orgId) => {
      if (isClient) {
        if (orgId) {
          localStorage.setItem("ts_org", orgId);
        } else {
          localStorage.removeItem("ts_org");
        }
      }
      set({ activeOrganizationId: orgId });
    },

    logout: () => {
      if (isClient) {
        localStorage.removeItem("ts_access");
        localStorage.removeItem("ts_refresh");
        localStorage.removeItem("ts_org");
      }
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        activeOrganizationId: null,
        isAuthenticated: false,
        mfaPending: false,
        mfaToken: null,
      });
    },
  };
});
