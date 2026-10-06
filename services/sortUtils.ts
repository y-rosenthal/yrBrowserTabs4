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

// Two-label public suffixes under which sites register a 3rd-level name
// ("bbc.co.uk", not "co.uk"). Not the full Public Suffix List — just the
// common country-code second levels, enough for everyday browsing.
const MULTI_LABEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'sch.uk', 'nhs.uk',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'org.nz', 'net.nz', 'govt.nz', 'ac.nz',
  'co.za', 'org.za', 'gov.za', 'ac.za',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.mx', 'org.mx', 'gob.mx', 'com.ar',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'com.hk', 'org.hk', 'com.tw', 'org.tw', 'edu.tw',
  'com.sg', 'edu.sg', 'gov.sg',
  'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in',
  'co.il', 'org.il', 'ac.il', 'gov.il',
  'co.kr', 'or.kr', 'ac.kr',
  'com.tr', 'org.tr', 'gov.tr', 'com.ua',
  'co.id', 'or.id', 'ac.id', 'go.id',
  'com.my', 'com.ph', 'com.vn', 'com.pk', 'com.eg', 'com.sa',
  'co.th', 'ac.th', 'go.th',
]);

// The registrable site a hostname belongs to, so subdomains can be combined:
// "account.bambibaby.com" and "www.bambibaby.com" → "bambibaby.com";
// "news.bbc.co.uk" → "bbc.co.uk". IP addresses, single-label hosts
// (localhost, "local") and already-bare domains are returned unchanged.
export const getSiteOf = (hostname: string): string => {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') || /^\d+(\.\d+){3}$/.test(host)) return host; // IPv6 / IPv4
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join('.');
  return labels.slice(MULTI_LABEL_SUFFIXES.has(lastTwo) ? -3 : -2).join('.');
};
