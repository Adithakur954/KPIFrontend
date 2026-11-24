import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/shared/context/AuthContext";
import { captureOperationalInputs, fetchNativeAlarmCircles, fetchOperationalHistory } from "../services/nativeAlarmService";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const button = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50";
const numericFields = [["ms2Pending", "MS2 pending"], ["lrPending", "LR pending"], ["siteInventoryTotal", "Site inventory total"],
  ["siteUp", "Reported site up"], ["gpsAlarms", "Reported GPS alarms"], ["vswrAlarms", "Reported VSWR alarms"]];
const textFields = [["zoneOwner", "Zone owner"], ["circleOwner", "Circle owner"], ["majorReason", "Major reason"]];
const display = value => value == null ? "—" : String(value);
const cell = "whitespace-nowrap px-3 py-2";

function CaptureForm({ company, asOf, snapshot, onSaved }) {
  const initial = snapshot?.circles?.[0]?.input;
  const [circleId, setCircleId] = useState(String(initial?.circleId || ""));
  const [technology, setTechnology] = useState(initial?.technology || "4G");
  const [values, setValues] = useState(initial || {});
  const [sites, setSites] = useState(initial?.sites || []);
  const [circles, setCircles] = useState([]);
  const [reference, setReference] = useState("");
  const [includeSite, setIncludeSite] = useState(false);
  const [site, setSite] = useState({ state: "UNKNOWN", observedAt: asOf.slice(0, 19) + "Z", lrPending: "unknown" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchNativeAlarmCircles(company, controller.signal).then(setCircles).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => { controller.abort(); request.current?.abort(); };
  }, [company]);

  function choose(id, rat) {
    setCircleId(id); setTechnology(rat);
    const existing = snapshot?.circles?.find(context => String(context.input.circleId) === id && context.input.technology === rat)?.input;
    setValues(existing || {}); setSites(existing?.sites || []); setIncludeSite(false);
  }
  async function save(event) {
    event.preventDefault(); setError(""); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const input = { circleId: Number(circleId), technology, sites: [...sites] };
      for (const [key] of numericFields) input[key] = values[key] == null || values[key] === "" ? null : Number(values[key]);
      for (const [key] of textFields) input[key] = values[key]?.trim() || null;
      if (includeSite) {
        const update = { siteCode: site.siteCode.trim(), state: site.state, observedAt: site.observedAt.trim(),
          lrPending: site.lrPending === "unknown" ? null : site.lrPending === "yes",
          owner: site.owner?.trim() || null, recoveryReason: site.recoveryReason?.trim() || null, responsibility: site.responsibility?.trim() || null };
        input.sites = [...sites.filter(item => item.siteCode !== update.siteCode), update];
      }
      const contexts = (snapshot?.circles || []).map(context => context.input).filter(item => !(item.circleId === input.circleId && item.technology === technology));
      const sameSlot = snapshot?.effectiveAt && Date.parse(snapshot.effectiveAt) === Date.parse(asOf);
      await captureOperationalInputs(company, { effectiveAt: asOf, expectedRevision: sameSlot ? snapshot.revision : 0,
        expectedBaseSnapshotId: snapshot?.id ?? null, sourceReference: reference.trim(), circles: [...contexts, input] }, controller.signal);
      if (!controller.signal.aborted) onSaved();
    } catch (error) { if (!controller.signal.aborted) setError(error.message || "Operational inputs could not be saved."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <form className="mt-4 space-y-4 border-t border-slate-200 pt-4" onSubmit={save}>
    <p className="text-sm text-slate-600">Effective at {asOf}. Unknown counts stay blank. Saving creates a new immutable revision; it does not clear OSS alarms.</p>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1 text-sm">Circle<select required aria-label="Operational circle" className={field} value={circleId} onChange={event => choose(event.target.value, technology)}><option value="">Select circle</option>{circles.map(circle => <option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label>
      <label className="space-y-1 text-sm">Technology<select aria-label="Operational technology" className={field} value={technology} onChange={event => choose(circleId, event.target.value)}><option>4G</option><option>2G</option></select></label>
      {numericFields.map(([key, label]) => <label key={key} className="space-y-1 text-sm">{label}<input aria-label={label} type="number" min="0" max="10000000" step="1" placeholder="Unknown" className={field} value={values[key] ?? ""} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}
      {textFields.map(([key, label]) => <label key={key} className="space-y-1 text-sm">{label}<input aria-label={label} maxLength={key === "majorReason" ? 2000 : 160} className={field} value={values[key] ?? ""} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}
      <label className="space-y-1 text-sm">Source reference<input aria-label="Operational source reference" required maxLength="500" placeholder="Register, ticket or approved source for these figures" className={field} value={reference} onChange={event => setReference(event.target.value)} /></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeSite} onChange={event => setIncludeSite(event.target.checked)} />Add or correct a reported site update</label>
    {includeSite && <div className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-2">
      <label className="text-sm">Site code<input aria-label="Reported site code" required maxLength="128" className={field} value={site.siteCode || ""} onChange={event => setSite(current => ({ ...current, siteCode: event.target.value }))} /></label>
      <label className="text-sm">Reported state<select aria-label="Reported site state" className={field} value={site.state} onChange={event => setSite(current => ({ ...current, state: event.target.value }))}><option>UNKNOWN</option><option>UP</option><option>DOWN</option></select></label>
      <label className="text-sm">Observation time (ISO with offset)<input aria-label="Site observation time" required className={field} value={site.observedAt} onChange={event => setSite(current => ({ ...current, observedAt: event.target.value }))} /></label>
      <label className="text-sm">Site LR pending<select aria-label="Site LR pending" className={field} value={site.lrPending} onChange={event => setSite(current => ({ ...current, lrPending: event.target.value }))}><option value="unknown">Unknown</option><option value="yes">Yes</option><option value="no">No</option></select></label>
      {[["owner", "Site owner"], ["recoveryReason", "Recovery reason"], ["responsibility", "Responsibility"]].map(([key, label]) => <label key={key} className="text-sm">{label}<input aria-label={label} maxLength={key === "recoveryReason" ? 2000 : 160} className={field} value={site[key] || ""} onChange={event => setSite(current => ({ ...current, [key]: event.target.value }))} /></label>)}
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button className={button} disabled={busy || !circleId || !reference.trim()}>{busy ? "Saving revision…" : "Save operational revision"}</button>
  </form>;
}

export default function OperationalInputsPanel({ company, asOf, state, onSaved }) {
  const { user } = useAuth();
  const canWrite = ["ADMIN", "SUPER_ADMIN"].includes(String(user?.role || "").trim().toUpperCase());
  const snapshot = state?.snapshot;
  const [history, setHistory] = useState(null);
  const [editing, setEditing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const [siteCount, setSiteCount] = useState(25);
  const [error, setError] = useState("");
  const controller = useRef(null);
  const contexts = snapshot?.circles || [];
  const siteRows = contexts.flatMap(context => (context.input.sites || []).map(site => ({ ...site, circle: context.circleName, circleId: context.input.circleId, technology: context.input.technology })));
  useEffect(() => () => controller.current?.abort(), []);
  async function loadHistory() {
    controller.current?.abort(); const request = new AbortController(); controller.current = request; setError("");
    try { const rows = await fetchOperationalHistory(company, request.signal); if (!request.signal.aborted) setHistory(rows); }
    catch (error) { if (!request.signal.aborted) setError(error.message); }
  }
  return <section className="operational-inputs-card rounded-xl border border-slate-200 bg-white p-4" aria-label="Reported operational inputs">
    <p className="alarm-section-eyebrow">CUSTOMER-REPORTED CONTEXT</p>
    <h3 className="font-semibold text-slate-900">Reported operational inputs</h3>
    {!state?.enabled ? <p className="mt-2 text-sm text-slate-600">Operational data capture is not enabled. Contact your administrator to complete setup.</p> : <>
      <p className="mt-2 break-words text-sm text-slate-600">{snapshot?.id ? `Snapshot #${snapshot.id} · revision ${snapshot.revision} · effective ${snapshot.effectiveAt} · ${snapshot.sourceReference}` : "No operational inputs have been supplied at this cutoff."}</p>
      {contexts.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Circle", "Technology", "MS2 pending", "LR pending", "Inventory", "Reported site up", "GPS", "VSWR", "Circle owner", "Major reason"].map(label => <th key={label} className={cell}>{label}</th>)}</tr></thead><tbody>{contexts.slice(0, visibleCount).map(context => <tr key={`${context.input.circleId}-${context.input.technology}`} className="border-t border-slate-100"><td className={cell}>{context.circleName}</td><td className={cell}>{context.input.technology}</td>{["ms2Pending", "lrPending", "siteInventoryTotal", "siteUp", "gpsAlarms", "vswrAlarms", "circleOwner", "majorReason"].map(key => <td key={key} className={cell}>{display(context.input[key])}</td>)}</tr>)}</tbody></table></div>}
      {visibleCount < contexts.length && <button className={`${button} mt-2`} onClick={() => setVisibleCount(value => value + 25)}>Show next operational entries</button>}
      {siteRows.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Reported site updates ({siteRows.length})</summary><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Circle", "Technology", "Site", "Reported state", "Observed UTC", "Owner", "Recovery reason", "Responsibility"].map(label => <th key={label} className={cell}>{label}</th>)}</tr></thead><tbody>{siteRows.slice(0, siteCount).map(site => <tr key={`${site.circleId}-${site.technology}-${site.siteCode}`}><td className={cell}>{site.circle}</td><td className={cell}>{site.technology}</td>{["siteCode", "state", "observedAt", "owner", "recoveryReason", "responsibility"].map(key => <td key={key} className={cell}>{display(site[key])}</td>)}</tr>)}</tbody></table></div>{siteCount < siteRows.length && <button className={`${button} mt-2`} onClick={() => setSiteCount(value => value + 25)}>Show next site updates</button>}</details>}
      {canWrite && <details className="mt-4" onToggle={event => setEditing(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold text-blue-700">Capture or correct operational inputs</summary>{editing && <CaptureForm key={`${company}-${asOf}-${snapshot?.id || "none"}`} company={company} asOf={asOf} snapshot={snapshot} onSaved={onSaved} />}</details>}
      <button className={`${button} mt-4`} onClick={loadHistory}>Load revision history</button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {history && <ul className="mt-3 space-y-2 text-xs text-slate-600">{history.length ? history.map(row => <li key={row.id}>#{row.id} · revision {row.revision} · {row.effective_at} · {row.source_reference} · actor {row.created_by}</li>) : <li>No recorded revisions.</li>}</ul>}
    </>}
  </section>;
}
