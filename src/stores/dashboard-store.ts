'use client';

import { create } from 'zustand';
import type { UserProfile } from '@/lib/types';

type DashboardState = {
  familyMembers: UserProfile[];
  selectedMemberId: string | null;
  setFamilyMembers: (members: UserProfile[]) => void;
  setSelectedMemberId: (memberId: string | null) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  familyMembers: [],
  selectedMemberId: null,
  setFamilyMembers: (members) => set({ familyMembers: members }),
  setSelectedMemberId: (memberId) => set({ selectedMemberId: memberId }),
}));
