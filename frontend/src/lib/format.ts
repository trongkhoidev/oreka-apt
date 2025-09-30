export function shorten(addr: string, head = 6, tail = 4) {
  if (!addr) return '';
  return addr.length > head + tail ? `${addr.slice(0, head)}…${addr.slice(-tail)}` : addr;
}

export function formatHuman(v?: string | number) {
  if (v == null) return '0';
  const s = typeof v === 'number' ? String(v) : v;
  const [int, frac = ''] = s.split('.');
  const intFmt = Number(int).toLocaleString();
  const fracTrim = frac.replace(/0+$/, '');
  return fracTrim ? `${intFmt}.${fracTrim.slice(0, 6)}` : intFmt;
}


