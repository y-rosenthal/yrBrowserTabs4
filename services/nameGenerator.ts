/**
 * Generates a deterministic default name based on the window index.
 * Index 0 -> "window1", index 1 -> "window2", etc.
 */
export const generateWindowName = (index: number): string => {
  return `window${index + 1}`;
};

export const generateWindowNames = (windowIds: string[]): Record<string, string> => {
  const map: Record<string, string> = {};

  // The input order represents the logical "1st, 2nd, 3rd" window as provided by the OS.
  windowIds.forEach((id, index) => {
    map[id] = generateWindowName(index);
  });

  return map;
};
