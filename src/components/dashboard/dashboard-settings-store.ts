'use client';

import { create } from 'zustand';

type SettingsStore = {
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
};

export const useDashboardSettings = create<SettingsStore>((set) => ({
  isSettingsOpen: false,
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
}));
