import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/infrastructure/api/api-client";
import { useAuthStore } from "@/infrastructure/store/auth-store";

export const useAuthActions = () => {
  const queryClient = useQueryClient();
  const { setTokens, setMfaPending } = useAuthStore();

  // 1. Forgot Password
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post("/api/v1/auth/forgot-password/", { email });
      return response.data;
    },
  });

  // 2. Reset Password
  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const response = await apiClient.post("/api/v1/auth/reset-password/", {
        uidb64: payload.uid,
        token: payload.token,
        new_password: payload.newPassword,
      });
      return response.data;
    },
  });

  // 3. Change Password (Authenticated)
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const response = await apiClient.post("/api/v1/auth/change-password/", {
        old_password: payload.oldPassword,
        new_password: payload.newPassword,
      });
      return response.data;
    },
  });

  // 4. MFA Enable (Generate secret)
  const mfaEnableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post("/api/v1/auth/mfa/enable/");
      return response.data.data; // returns secret and provisioning_uri
    },
  });

  // 5. MFA Confirm (Activate TOTP)
  const mfaConfirmMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiClient.post("/api/v1/auth/mfa/confirm/", { code });
      return response.data.data; // returns backup recovery codes
    },
  });

  // 6. MFA Verify (Login verification)
  const mfaVerifyMutation = useMutation({
    mutationFn: async (payload: { mfaToken: string; code: string }) => {
      const response = await apiClient.post("/api/v1/auth/mfa/verify/", {
        mfa_token: payload.mfaToken,
        code: payload.code,
      });
      const { access, refresh } = response.data.data;
      setTokens(access, refresh);
      return { access, refresh };
    },
  });

  // 7. Get Active Sessions
  const sessionsQuery = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/auth/sessions/");
      return response.data.data || [];
    },
    enabled: useAuthStore((state) => state.isAuthenticated),
  });

  // 8. Revoke Session
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiClient.post(`/api/v1/auth/sessions/${sessionId}/revoke/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
    },
  });

  return {
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isForgotPasswordLoading: forgotPasswordMutation.isPending,
    
    resetPassword: resetPasswordMutation.mutateAsync,
    isResetPasswordLoading: resetPasswordMutation.isPending,
    
    changePassword: changePasswordMutation.mutateAsync,
    isChangePasswordLoading: changePasswordMutation.isPending,
    
    mfaEnable: mfaEnableMutation.mutateAsync,
    isMfaEnableLoading: mfaEnableMutation.isPending,
    
    mfaConfirm: mfaConfirmMutation.mutateAsync,
    isMfaConfirmLoading: mfaConfirmMutation.isPending,
    
    mfaVerify: mfaVerifyMutation.mutateAsync,
    isMfaVerifyLoading: mfaVerifyMutation.isPending,
    
    sessions: sessionsQuery.data,
    isSessionsLoading: sessionsQuery.isLoading,
    refetchSessions: sessionsQuery.refetch,
    
    revokeSession: revokeSessionMutation.mutateAsync,
  };
};
export default useAuthActions;
