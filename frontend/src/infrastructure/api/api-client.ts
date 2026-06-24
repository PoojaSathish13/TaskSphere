import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { useAuthStore } from "../store/auth-store";

// Base API instance
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach Auth & Tenant contexts
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken, activeOrganizationId } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (activeOrganizationId) {
      config.headers["X-Organization-ID"] = activeOrganizationId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-resolve 401 token refreshes
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      return Promise.reject(error);
    }

    // Capture standard error envelopes if present
    const responseData = error.response.data;

    // Check if error is 401 and request hasn't been retried
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, setTokens } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${env.NEXT_PUBLIC_API_URL}/api/v1/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        // The simplejwt refresh returns a new access token
        const newAccessToken = response.data.access;
        // SimpleJWT can optionally rotate refresh tokens
        const newRefreshToken = response.data.refresh || refreshToken;

        setTokens(newAccessToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        logout();
        return Promise.reject(refreshError);
      }
    }

    // Standardize error propagation
    return Promise.reject(
      responseData || {
        success: false,
        data: null,
        meta: null,
        errors: [{ code: "NETWORK_ERROR", message: error.message, field: null }],
      }
    );
  }
);
