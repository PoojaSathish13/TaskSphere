import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents duplicate network loads when clicking off tabs
      retry: 1, // Max retries on fail
      staleTime: 1000 * 60 * 5, // 5 minutes stale caches
    },
  },
});
