const FAVORITE_WEEKDAY_LABELS = [
  '\u65e5',
  '\u4e00',
  '\u4e8c',
  '\u4e09',
  '\u56db',
  '\u4e94',
  '\u516d'
];

export function normalizeFavoriteDate(value) {
  try {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = String(value.getFullYear()).padStart(4, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';

    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';

    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || (dt.getMonth() + 1) !== m || dt.getDate() !== d) return '';

    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
}

export function formatFavoriteDateLine(value) {
  const normalized = normalizeFavoriteDate(value);
  if (!normalized) return '';
  return `${normalized.slice(0, 4)}\u5e74 ${normalized.slice(5, 7)}\u6708${normalized.slice(8, 10)}\u65e5`;
}

export function getFavoriteDateWeekdayLabel(value) {
  const normalized = normalizeFavoriteDate(value);
  if (!normalized) return '';

  const y = Number(normalized.slice(0, 4));
  const m = Number(normalized.slice(5, 7));
  const d = Number(normalized.slice(8, 10));
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return FAVORITE_WEEKDAY_LABELS[weekday] || '';
}
