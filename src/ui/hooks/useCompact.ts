import { useMediaQuery } from '@mui/material';

/** Single source for the "compact chrome" breakpoint used across the UI. */
export function useCompact(): boolean {
  return useMediaQuery('(max-height: 700px), (max-width: 1100px)');
}

/** Layout editing requires a pointer-friendly viewport. */
export function useCanEditLayout(): boolean {
  return useMediaQuery('(min-width: 900px)');
}
