import { create } from "zustand";

export type BgPreset = "cotton-candy" | "sunset-dream" | "ocean-lavender" | "matcha-cream" | "blue-ocean";
export type FontPreset = "sans" | "outfit" | "inter" | "lexend";

interface LayoutState {
  isSidebarCollapsed: boolean;
  isCommandPaletteOpen: boolean;
  theme: "light" | "dark";
  bgPreset: BgPreset;
  fontPreset: FontPreset;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setBgPreset: (preset: BgPreset) => void;
  setFontPreset: (preset: FontPreset) => void;
}

export const useLayoutStore = create<LayoutState>((set) => {
  const isClient = typeof window !== "undefined";
  const initialTheme = isClient && document.documentElement.classList.contains("dark") ? "dark" : "light"; // Default is light theme

  return {
    isSidebarCollapsed: false,
    isCommandPaletteOpen: false,
    theme: initialTheme,
    bgPreset: "cotton-candy",
    fontPreset: "sans",

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

    setBgPreset: (preset) => set({ bgPreset: preset }),
    setFontPreset: (preset) => set({ fontPreset: preset }),
  };
});
export default useLayoutStore;
