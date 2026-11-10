export function numericChartValue(value) {
  if (value == null || typeof value === 'boolean' || (typeof value === 'string' && value.trim() === '')) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

/** One-pass mean aggregation without retaining a second array of every source row. */
export function aggregateChartRows(rows, dimension) {
  const groups = new Map();
  for (const row of rows || []) {
    const rawKey = row?.[dimension];
    const rawValue = row?.value;
    if (rawKey == null || String(rawKey).trim() === '') continue;
    const value = numericChartValue(rawValue);
    if (!Number.isFinite(value)) continue;
    const key = String(rawKey);
    let group = groups.get(key);
    if (!group) { group = { first: row, sum: 0, count: 0 }; groups.set(key, group); }
    group.sum += value; group.count++;
  }
  return [...groups].map(([key, group]) => ({
    ...group.first, [dimension]: key, value: group.sum / group.count, count: group.count, items: undefined,
  }));
}
