import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GroupFilters {
  meetingDays: string[];
  categories: string[];
  searchQuery: string;
  onlyWithFriends: boolean;
}

interface GroupFiltersState {
  filters: GroupFilters;
  setMeetingDays: (days: string[]) => void;
  setCategories: (categories: string[]) => void;
  setSearchQuery: (query: string) => void;
  setOnlyWithFriends: (only: boolean) => void;
  clearFilters: () => void;
  resetFilters: () => void;
}

const defaultFilters: GroupFilters = {
  meetingDays: [],
  categories: [],
  searchQuery: '',
  onlyWithFriends: false,
};

export const useGroupFiltersStore = create<GroupFiltersState>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      
      setMeetingDays: (days: string[]) =>
        set((state) => ({
          filters: { ...state.filters, meetingDays: days },
        })),
      
      setCategories: (categories: string[]) =>
        set((state) => ({
          filters: { ...state.filters, categories },
        })),
      
      setSearchQuery: (query: string) =>
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        })),

      setOnlyWithFriends: (only: boolean) =>
        set((state) => ({
          filters: { ...state.filters, onlyWithFriends: only },
        })),
      
      clearFilters: () =>
        set(() => ({
          filters: defaultFilters,
        })),
      
      resetFilters: () =>
        set(() => ({
          filters: defaultFilters,
        })),
    }),
    {
      name: 'group-filters-storage',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);
