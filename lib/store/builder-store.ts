import { create } from "zustand";

/**
 * Transient UI state for the course builder (Phase 2). Persisted course data
 * lives in the DB via server actions + React Query — only ephemeral view state
 * belongs here.
 */
interface BuilderState {
  expandedUnits: Record<string, boolean>;
  toggleUnit: (unitId: string) => void;
  setUnitExpanded: (unitId: string, expanded: boolean) => void;

  activeChapterId: string | null;
  setActiveChapter: (chapterId: string | null) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  expandedUnits: {},
  toggleUnit: (unitId) =>
    set((s) => ({
      expandedUnits: { ...s.expandedUnits, [unitId]: !s.expandedUnits[unitId] },
    })),
  setUnitExpanded: (unitId, expanded) =>
    set((s) => ({ expandedUnits: { ...s.expandedUnits, [unitId]: expanded } })),

  activeChapterId: null,
  setActiveChapter: (chapterId) => set({ activeChapterId: chapterId }),
}));
