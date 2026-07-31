// Natural-sort comparator for window names: runs of digits compare by
// numeric value (window2 < window10, Project 2 < Project 10), everything
// else alphabetically and case-insensitively. Shared by every site that
// sorts by window name so the orderings always agree.
export const compareWindowNames = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
