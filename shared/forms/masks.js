// Return fresh options: mask instances must never share mutable configuration/state.
export function mobileMaskOptions() {
  return { mask: '(00) 00000-0000' };
}
