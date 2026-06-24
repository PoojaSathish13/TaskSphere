import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { useAuthStore } from "@/infrastructure/store/auth-store";

export const useAuth = () => {
  const { setTokens, setMfaPending, setUser, logout, isAuthenticated } = useAuthStore();

  // 1. Fetch User profile (Query)
  const profileQuery = useQuery({
    queryKey: ["auth-profile"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/auth/me/");
      const profileData = response.data.data;
      setUser(profileData);
      return profileData;
    },
    enabled: isAuthenticated,
  });

  // 2. Login Mutation (supports intermediate MFA responses)
  const loginMutation = useMutation({
    mutationFn: async (credentials: Record<string, unknown>) => {
      const response = await apiClient.post("/api/v1/auth/login/", credentials);
      const data = response.data.data;
      
      if (data.mfa_required) {
        setMfaPending(true, data.mfa_token);
        return { mfaRequired: true };
      }

      const { access, refresh } = data;
      setTokens(access, refresh);
      return { mfaRequired: false, access, refresh };
    },
    onSuccess: (data) => {
      if (!data.mfaRequired) {
        // Re-trigger profile loading
        profileQuery.refetch();
      }
    },
  });

  // 3. Register Mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: Record<string, string>) => {
      const response = await apiClient.post("/api/v1/auth/register/", userData);
      return response.data.data;
    },
  });

  const handleLogout = () => {
    logout();
  };

  return {
    user: useAuthStore((state) => state.user),
    mfaPending: useAuthStore((state) => state.mfaPending),
    mfaToken: useAuthStore((state) => state.mfaToken),
    isLoading: profileQuery.isLoading || loginMutation.isPending,
    error: loginMutation.error || profileQuery.error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: handleLogout,
    isAuthenticated,
  };
};
