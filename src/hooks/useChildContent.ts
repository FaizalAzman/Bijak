import { useContentIndex, type ContentIndex } from '@/features/content/registry';
import { useApp } from '@/store/app';

/** The syllabus as the active child sees it: Maths & Science in their school's teaching language. */
export function useChildContent(): ContentIndex {
  const medium = useApp((s) => s.profiles.find((p) => p.id === s.activeProfileId)?.medium);
  return useContentIndex(medium);
}
