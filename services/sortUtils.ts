// Natural-sort comparator for window names: runs of digits compare by
// numeric value (window2 < window10, Project 2 < Project 10), everything
// else alphabetically and case-insensitively. Shared by every site that
// sorts by window name so the orderings always agree.
export const compareWindowNames = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// Comparator for dotted hostnames, ordered by significance: the 2nd-level
// label first (the site's actual name), then the TLD, then the 3rd/4th/...
// levels right-to-left. So "amazon.com" sorts before "aaa.nyc.gov" (amazon
// < nyc), and "mail.google.com" sits next to "www.google.com". Single-label
// hosts (localhost, "local") compare by that label alone.
export const compareDomains = (a: string, b: string): number => {
  const key = (d: string): string[] => {
    const parts = d.toLowerCase().split('.').filter(Boolean);
    if (parts.length < 2) return parts;
    const rev = [...parts].reverse(); // [tld, 2nd-level, 3rd-level, ...]
    return [rev[1], rev[0], ...rev.slice(2)];
  };
  const ka = key(a);
  const kb = key(b);
  const n = Math.max(ka.length, kb.length);
  for (let i = 0; i < n; i++) {
    const x = ka[i] ?? '';
    const y = kb[i] ?? '';
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};
