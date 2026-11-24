const pending = new Map();
const MAX_PENDING = 128;
const aborted = signal => signal?.reason || new DOMException('Request aborted', 'AbortError');

/** Share only concurrent reads. Each subscriber owns its cancellation and result.
 * No settled result is cached, so Refresh always requests current server data.
 */
export function sharedRead(key, load, signal) {
  if (signal?.aborted) return Promise.reject(aborted(signal));
  let entry = pending.get(key);
  if (!entry) {
    if (pending.size >= MAX_PENDING) return load(signal);
    const controller = new AbortController();
    entry = { controller, consumers: 0 };
    pending.set(key, entry);
    entry.promise = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw aborted(controller.signal);
      return load(controller.signal);
    }).finally(() => {
      if (pending.get(key) === entry) pending.delete(key);
    });
  }
  const copy = entry.consumers > 0;
  entry.consumers++;
  return new Promise((resolve, reject) => {
    let done = false;
    const release = () => {
      if (done) return false;
      done = true;
      signal?.removeEventListener('abort', cancel);
      entry.consumers--;
      return true;
    };
    const cancel = () => {
      if (!release()) return;
      if (entry.consumers === 0) {
        if (pending.get(key) === entry) pending.delete(key);
        entry.controller.abort();
      }
      reject(aborted(signal));
    };
    signal?.addEventListener('abort', cancel, { once: true });
    entry.promise.then(value => {
      if (!release()) return;
      try { resolve(copy ? structuredClone(value) : value); } catch (error) { reject(error); }
    }, error => { if (release()) reject(error); });
  });
}
