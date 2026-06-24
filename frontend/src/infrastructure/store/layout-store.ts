import { create } from "zustand";

interface LayoutState {
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  theme: "light" | "dark";

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useLayoutStore = create<LayoutState>((set) => {
  const isClient = typeof window !== "undefined";
  const initialTheme = isClient && document.documentElement.classList.contains("dark") ? "dark" : "light"; // Default is light theme

  return {
    isSidebarCollapsed: false,
    isCommandPaletteOpen: false,
    theme: initialTheme,

    toggleSidebar: () =>
      set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

    toggleCommandPalette: () =>
      set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

    setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

    toggleTheme: () => {
      set((state) => {
        const nextTheme = state.theme === "dark" ? "light" : "dark";
        if (isClient) {
          if (nextTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
        return { theme: nextTheme };
      });
    },

    setTheme: (theme) => {
      if (isClient) {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      set({ theme });
    },
  };
});
export default useLayoutStore;
