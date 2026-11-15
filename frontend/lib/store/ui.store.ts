import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isKycModalOpen: boolean;
  openKycModal: () => void;
  closeKycModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  isKycModalOpen: false,
  openKycModal: () => set({ isKycModalOpen: true }),
  closeKycModal: () => set({ isKycModalOpen: false }),
}));

