import { create } from 'zustand';
import { Score, Sport, Region, CategoryScore } from '@/types';

interface DashboardStore {
    // Data
    regions: Region[];
    sports: Sport[];
    scores: Score[];
    categoryScores: CategoryScore[];
    loading: boolean;
    error: string | null;

    // Filters & Selected Items
    selectedRegionId: string | null;
    selectedSportId: string | null;
    selectedCategory: string | null;

    // Actions
    setRegions: (regions: Region[]) => void;
    setSports: (sports: Sport[]) => void;
    setScores: (scores: Score[]) => void;
    setCategoryScores: (scores: CategoryScore[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    setSelectedRegionId: (id: string | null) => void;
    setSelectedSportId: (id: string | null) => void;
    setSelectedCategory: (category: string | null) => void;
}

export const useStore = create<DashboardStore>((set) => ({
    // Initial State
    regions: [],
    sports: [],
    scores: [],
    categoryScores: [],
    loading: false,
    error: null,

    selectedRegionId: null,
    selectedSportId: null,
    selectedCategory: null,

    // Actions
    setRegions: (regions) => set({ regions }),
    setSports: (sports) => set({ sports }),
    setScores: (scores) => set({ scores }),
    setCategoryScores: (categoryScores) => set({ categoryScores }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setSelectedRegionId: (id) => set({ selectedRegionId: id }),
    setSelectedSportId: (id) => set({ selectedSportId: id }),
    setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
