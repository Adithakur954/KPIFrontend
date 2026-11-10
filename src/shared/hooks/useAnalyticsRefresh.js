import { useEffect, useState } from 'react';

export default function useAnalyticsRefresh() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('analytics:invalidate', refresh);
    return () => window.removeEventListener('analytics:invalidate', refresh);
  }, []);
  return revision;
}
