export const EMPTY_MAP_ROWS = Object.freeze([]);

export function validCoordinates(lat, lon) {
  return typeof lat === 'number' && typeof lon === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/** Fetch every page or fail explicitly; never present a truncated upload as complete. */
export async function loadSitePages(fetchPage, fileId, { signal, pageSize = 2000, maxRows = 100000 } = {}) {
  const rows = [];
  let totalCount;
  for (let page = 1; page <= Math.ceil(maxRows / pageSize) + 1; page++) {
    signal?.throwIfAborted();
    const response = await fetchPage(fileId, page, pageSize, signal);
    signal?.throwIfAborted();
    if (!response?.success) throw new Error(response?.message || 'Failed to load site data.');
    if (!Array.isArray(response.data)) throw new Error('Site data response is invalid.');
    const metadata = response.pagination;
    const reportedCount = metadata?.totalCount == null ? undefined : Number(metadata.totalCount);
    if (reportedCount !== undefined && (!Number.isFinite(reportedCount) || reportedCount < 0)) throw new Error('Invalid site row count.');
    if (totalCount !== undefined && reportedCount !== undefined && totalCount !== reportedCount) throw new Error('Site upload changed during loading. Select the file again.');
    totalCount ??= reportedCount;
    rows.push(...response.data);
    if (rows.length > maxRows || totalCount > maxRows) throw new Error(`Site upload exceeds the ${maxRows.toLocaleString()} row map limit. Select a smaller upload.`);
    const hasNext = metadata?.hasNextPage ?? (metadata?.totalPages != null ? page < Number(metadata.totalPages) : false);
    if (!hasNext) {
      if (totalCount !== undefined && rows.length !== totalCount) throw new Error('Site upload did not load completely. Select the file again.');
      return { ...response, data: rows };
    }
    if (!response.data.length) throw new Error('Site upload pagination returned an empty intermediate page.');
  }
  throw new Error('Site upload pagination exceeded its safety limit.');
}

/** Bounding-box candidates only. Callers retain their exact distance/bearing checks. */
export function createNearbySiteIndex(sites, radiusKm = 8) {
  const angular = radiusKm / 6371;
  const step = angular * 180 / Math.PI;
  const buckets = new Map();
  sites.forEach((site, index) => {
    if (!validCoordinates(site.lat, site.lon)) return;
    const key = `${Math.floor((site.lat + 90) / step)}:${Math.floor((site.lon + 180) / step)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  });
  return source => {
    if (!validCoordinates(source.lat, source.lon)) return [];
    if (Math.abs(source.lat) + step >= 90) return sites;
    const longitudeDelta = Math.asin(Math.min(1, Math.sin(angular) / Math.cos(source.lat * Math.PI / 180))) * 180 / Math.PI;
    let ranges = [[source.lon - longitudeDelta, source.lon + longitudeDelta]];
    if (ranges[0][0] < -180) ranges = [[ranges[0][0] + 360, 180], [-180, ranges[0][1]]];
    else if (ranges[0][1] > 180) ranges = [[ranges[0][0], 180], [-180, ranges[0][1] - 360]];
    const matches = new Set();
    for (let lat = Math.floor((source.lat - step + 90) / step); lat <= Math.floor((source.lat + step + 90) / step); lat++) {
      for (const [low, high] of ranges) {
        for (let lon = Math.floor((low + 180) / step); lon <= Math.floor((high + 180) / step); lon++) {
          for (const index of buckets.get(`${lat}:${lon}`) || EMPTY_MAP_ROWS) matches.add(index);
        }
      }
    }
    // Preserve existing source order and ranking/tie semantics.
    return [...matches].sort((left, right) => left - right).map(index => sites[index]);
  };
}
