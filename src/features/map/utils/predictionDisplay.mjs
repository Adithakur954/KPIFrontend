const key = value => String(value ?? "").trim().toLowerCase();

// A matching site is location context only; it does not establish a cell-level match.
export function findPredictionSite(prediction, sites) {
  const siteKeys = [prediction?.site, prediction?.siteName, prediction?.siteInfo?.siteId, prediction?.siteInfo?.siteName].map(key).filter(Boolean);
  const cellKeys = [prediction?.cellName, prediction?.cell, prediction?.sourceCell].map(key).filter(Boolean);
  return (sites || []).find(site => {
    const names = [site.SITEID, site.Site_Name].map(key).filter(Boolean);
    const cells = (site.cells || []).flatMap(cell => [cell.Cell_Name, cell.Cell_ID]).map(key).filter(Boolean);
    return siteKeys.some(value => names.includes(value)) || cellKeys.some(value => cells.includes(value));
  }) || null;
}

export function predictionEvidence(item) {
  const reasons = Array.isArray(item?.reasons) ? item.reasons : [];
  const evidence = Array.isArray(item?.evidence) ? item.evidence : [];
  return { reasons: reasons.length ? reasons : item?.reason ? [item.reason] : [], evidence };
}
