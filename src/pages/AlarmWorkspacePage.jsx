import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, RefreshCw, Download, ArrowRight, Database, FileCheck2, Settings2, Mail } from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { apiFetch } from "@/shared/api/apiClient";
import PageHeading from "@/shared/components/common/PageHeading";
import PageState from "@/shared/components/common/PageState";
import Modal from "@/shared/components/common/Modal";
import { alarmRequest, alarmDownload, readOutcome, utcLabel } from "@/features/alarms/workflowApi";
import "./alarmWorkspace.css";

const tabs = ["Overview", "Imports & evidence", "Configuration", "Automation & mail"];
const oems = ["NOKIA", "ERICSSON", "ZTE", "HUAWEI", "SAMSUNG"];
const options = values => values.map(value => ({ value, label: value }));
const statuses = new Set(["QUEUED", "RUNNING"]);
const statusTone = value => ["SUCCEEDED", "CAPTURED", "ACCEPTED", "MAPPED"].includes(value) ? "good" : ["FAILED", "UNKNOWN"].includes(value) ? "bad" : "neutral";
function Badge({ value }) { return <span className={`oss-badge oss-${statusTone(value)}`}>{String(value || "Unmapped").replaceAll("_", " ")}</span>; }
function Panel({ title, description, children, actions }) { return <section className="oss-panel"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</header>{children}</section>; }
function CreateForm({ title, fields, submit, busy, children, button = "Save" }) {
  return <form className="oss-form" onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const body = {};
    for (const field of fields) body[field.name] = field.type === "checkbox" ? data.has(field.name) : field.numeric ? data.get(field.name) ? Number(data.get(field.name)) : null : data.get(field.name);
    if (await submit(body)) form.reset();
  }}><h3>{title}</h3><div className="oss-fields">{fields.map(field => <label key={field.name} className={field.type === "checkbox" ? "oss-check" : ""}><span>{field.label}</span>{field.options ? <select name={field.name} required={field.required !== false} defaultValue={field.defaultValue ?? ""}><option value="">{field.required === false ? "All circles / none" : "Choose…"}</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input name={field.name} type={field.type || "text"} required={field.type !== "checkbox" && field.required !== false} defaultValue={field.defaultValue} min={field.type === "number" ? 0 : undefined} maxLength={field.maxLength || 512} placeholder={field.placeholder} />}</label>)}</div>{children}<button className="oss-button oss-primary" disabled={busy}>{busy ? "Working…" : button}</button></form>;
}

export default function AlarmWorkspacePage() {
  const { user } = useAuth();
  const superAdmin = String(user?.role).toUpperCase() === "SUPER_ADMIN";
  const ownCompany = user?.companyId ?? user?.company_id ?? "";
  const [company, setCompany] = useState(String(ownCompany));
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!superAdmin) return;
    const controller = new AbortController();
    apiFetch("api/v1/companies", { authRequired: true, signal: controller.signal }).then(result => setCompanies(result.data || [])).catch(error => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [superAdmin]);
  const selectedCompany = superAdmin ? company : String(ownCompany);
  return <div className="oss-workspace"><PageHeading eyebrow="Monitoring / Native OSS alarms" title="Alarm operations" description="Source snapshots, customer classification and traceable report delivery" icon={BellRing} />
    {superAdmin && <label className="oss-company">Company scope<select value={company} onChange={event => setCompany(event.target.value)}><option value="">Select a company</option>{companies.map(item => <option key={item.id} value={item.id}>{item.companyName}</option>)}</select></label>}
    {error && <div role="alert" className="oss-alert">{error}</div>}
    {selectedCompany ? <Workspace key={selectedCompany} company={selectedCompany} canWrite={["ADMIN", "SUPER_ADMIN"].includes(String(user?.role).toUpperCase())} /> : <PageState title="Choose a company to continue">Your account needs an assigned company or explicit administrator scope.</PageState>}
  </div>;
}

function Workspace({ company, canWrite }) {
  const [tab, setTab] = useState(tabs[0]);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState(null);
  const historyController = useRef(null);
  const request = useCallback((path, opts, config) => alarmRequest(company, path, opts, config), [company]);
  const loadController = useRef(null);
  const refresh = useCallback(async () => {
    loadController.current?.abort(); const controller = new AbortController(); loadController.current = controller;
    try {
      const opts = { signal: controller.signal };
      const [zones, circles, aliases, feeds, runs, dashboard, status, settings, deliveries, catalogue] = await Promise.all([
        request("zones?limit=200", opts, true), request("circles?limit=200", opts, true), request("circle-aliases?limit=200", opts, true), request("feeds?limit=200", opts, true),
        request("imports", opts), request("dashboard", opts), request("status", opts), request("automation", opts), request("deliveries", opts), request("catalogue", opts),
      ]);
      if (controller.signal.aborted) return;
      setData({ zones, circles, aliases, feeds, runs, dashboard, status, settings, deliveries, catalogue });
      setSelectedRun(previous => previous ?? runs[0]?.id ?? null);
    } catch (error) { if (error.name !== "AbortError") setError(error.message); }
  }, [request]);
  useEffect(() => { refresh(); return () => { loadController.current?.abort(); historyController.current?.abort(); }; }, [refresh]);
  const pending = data?.runs.some(run => statuses.has(run.status)) || data?.deliveries.some(item => ["QUEUED", "PREPARING", "SENDING"].includes(item.status));
  useEffect(() => {
    if (!pending || busy) return;
    const timer = window.setInterval(() => { if (!document.hidden) refresh(); }, 5000);
    return () => window.clearInterval(timer);
  }, [pending, busy, refresh]);
  const currentRun = data?.runs.find(run => run.id === selectedRun);
  useEffect(() => {
    if (!selectedRun || currentRun?.status !== "SUCCEEDED") return;
    const controller = new AbortController();
    request(`imports/${selectedRun}/observations`, { query: { afterId: cursor, limit: 100 }, signal: controller.signal })
      .then(rows => setEvidence({ run: selectedRun, cursor, rows })).catch(error => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [selectedRun, currentRun?.status, cursor, request]);
  async function act(task, message = "Saved successfully.") {
    setBusy(true); setError(""); setNotice("");
    try { await task(); setNotice(message); await refresh(); return true; }
    catch (error) { setError(error.message); return false; }
    finally { setBusy(false); }
  }
  if (!data) return <><PageState title={error ? "Alarm workspace could not load" : "Loading alarm workspace"} variant={error ? "error" : "loading"} action={error && <button className="oss-button" onClick={() => { setError(""); refresh(); }}>Try again</button>}>{error || "Loading the selected company's configuration and snapshots."}</PageState></>;
  const total = key => data.dashboard.circles.reduce((sum, row) => sum + Number(row[key] || 0), 0);
  const outcome = readOutcome(currentRun);
  const evidenceRows = evidence?.run === selectedRun && evidence?.cursor === cursor ? evidence.rows : [];
  const chooseRun = id => { setSelectedRun(id); setCursor(0); setTab(tabs[1]); };
  const download = (path, name) => act(() => alarmDownload(company, path, name), "Download prepared.");
  return <>
    <div className="oss-context"><span><Database size={15} /> Company {company} · {data.feeds.length} configured sources</span><button className="oss-button" onClick={refresh} disabled={busy}><RefreshCw size={15} /> Refresh</button></div>
    {!data.status.workflowEnabled && <div className="oss-alert">Alarm processing is disabled. An administrator must enable the workflow after the database upgrade.</div>}
    {error && <div role="alert" className="oss-alert oss-error">{error}<button aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}
    {notice && <div role="status" className="oss-notice">{notice}</div>}
    <nav className="oss-tabs" aria-label="Alarm workspace sections">{tabs.map(item => <button key={item} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === tabs[0] && <>
      {!data.runs.length && <div className="oss-hero"><div><span className="oss-eyebrow">SOURCE-AWARE OPERATIONS</span><h2>Every alarm has a source.<br />Every report has a history.</h2><p>Review the latest snapshot for each feed, with customer classification kept separate from the original OSS severity.</p><button className="oss-button" onClick={() => setTab(tabs[1])}>Review imports <ArrowRight size={16} /></button></div><div className="oss-steps">{[[Settings2, "Configure", "Circles, source profiles and catalogue"], [FileCheck2, "Validate & import", "Frozen files, errors and safe retries"], [Mail, "Report & deliver", "Scoped reports and delivery outcomes"]].map(([icon, title, text]) => { const Icon = icon; return <div key={title}><Icon size={20} /><span><strong>{title}</strong><small>{text}</small></span></div>; })}</div></div>}
      <div className="oss-metrics">{[["Observed records", total("observed_alarms"), "Across latest source snapshots"], ["Critical", total("critical"), "Included by customer catalogue"], ["Known down sites", total("down_sites"), "Requires site mapping + catalogue"], ["Needs catalogue mapping", total("unmapped_catalogue"), "Not assigned a guessed severity"]].map(([label, value, help]) => <article key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{help}</small></article>)}</div>
      <Panel title="National & circle overview" description="Latest imported snapshot per source. Check freshness before using these totals." actions={<div className="oss-actions">{["pdf", "csv"].map(format => <button className="oss-button" key={format} disabled={busy || !data.dashboard.sources.length} onClick={() => download(`dashboard/report/${format}?asOf=${encodeURIComponent(data.dashboard.asOf)}`, `alarm-national-report.${format}`)}><Download size={15} /> {format.toUpperCase()}</button>)}</div>}><div className="oss-table-wrap"><table><thead><tr>{["Zone", "Circle", "Observed", "Critical", "Major", "Minor", "Down sites", "Unmapped rules"].map(text => <th key={text}>{text}</th>)}</tr></thead><tbody>{data.dashboard.circles.map((row, index) => <tr key={`${row.circle_id}-${index}`}><td>{row.zone_name}</td><td>{row.circle_name}</td>{["observed_alarms", "critical", "major", "minor", "down_sites", "unmapped_catalogue"].map(key => <td key={key}>{Number(row[key] || 0).toLocaleString()}</td>)}</tr>)}</tbody></table></div>{!data.dashboard.circles.length && <PageState title="No imported alarm evidence yet">Configure a source and import its first snapshot to populate this overview.</PageState>}<p className="oss-footnote">{data.dashboard.warning}</p></Panel>
      <Panel title="Source freshness & snapshot history" description="Each source can have a different observation time; these are not live network measurements."><div className="oss-source-list">{data.dashboard.sources.map(source => <button key={source.id} onClick={() => chooseRun(source.id)}><span>Feed #{source.feed_id}<small>{utcLabel(source.snapshot_at)}</small></span><span>Import #{source.id} <ArrowRight size={15} /></span></button>)}</div></Panel>
    </>}
    {tab === tabs[1] && <>
      {canWrite && <Panel title="Import a source snapshot" description="The source file and configuration are frozen for reproducible processing. Maximum 10 MiB / 5,000 records."><form className="oss-import" onSubmit={event => {
        event.preventDefault(); const fields = new FormData(event.currentTarget); const file = fields.get("file");
        if (!file?.size || file.size > 10 * 1024 * 1024) { setError("Select a non-empty CSV/XLSX file of at most 10 MiB."); return; }
        const body = new FormData(); body.append("file", file); body.append("snapshotAt", `${fields.get("at")}:00Z`);
        act(async () => { const run = await request(`feeds/${fields.get("feed")}/imports`, { method: "POST", body }); setSelectedRun(run.id); setCursor(0); }, "Snapshot queued. Progress will refresh automatically.");
      }}><label>Source profile<select name="feed" required><option value="">Select an active source</option>{data.feeds.filter(feed => feed.active).map(feed => <option key={feed.id} value={feed.id}>{feed.name} · {feed.oem} {feed.technology}</option>)}</select></label><label>Snapshot time (UTC)<input type="datetime-local" name="at" required defaultValue={new Date().toISOString().slice(0, 16)} /></label><label>Raw alarm file<input type="file" name="file" accept=".csv,.xlsx" required /></label><button className="oss-button oss-primary" disabled={busy || !data.status.workflowEnabled}>Validate & queue</button></form></Panel>}
      <div className="oss-two-column"><Panel title="Import history" description="Same source + snapshot + content is reused, not appended twice."><div className="oss-run-list">{data.runs.map(run => <button className={run.id === selectedRun ? "selected" : ""} key={run.id} onClick={() => chooseRun(run.id)}><span><strong>Import #{run.id} · Feed #{run.feed_id}</strong><small>{utcLabel(run.snapshot_at)}</small></span><Badge value={run.status} /></button>)}</div>{!data.runs.length && <PageState title="No imports yet" />}</Panel>
      <Panel title={currentRun ? `Import #${currentRun.id}` : "Select an import"} description={currentRun?.message}>{currentRun && <>
        <Badge value={currentRun.status} /><p className="oss-footnote">{utcLabel(currentRun.snapshot_at)} · {currentRun.attempts} processing attempt(s)</p>
        {currentRun.status === "FAILED" && <><p className="oss-alert">No partial alarm observations were committed. A retry uses the original file and configuration.</p>{outcome.issues?.map((issue, index) => <p key={index}>Row {issue.sourceRow} · {issue.field}: {issue.message}</p>)}{canWrite && <button className="oss-button" disabled={busy} onClick={() => act(() => request(`imports/${currentRun.id}/retry`, { method: "POST" }), "Retry queued.")}>Retry frozen source</button>}{canWrite && <form className="oss-form" onSubmit={event => { event.preventDefault(); const body = new FormData(event.currentTarget); act(async () => { const replacement = await request(`imports/${currentRun.id}/replace`, { method: "POST", body }); setSelectedRun(replacement.id); setCursor(0); }, "Corrected revision queued with current configuration."); }}><h3>Replace failed snapshot</h3><p className="oss-footnote">Use after correcting the file or mappings. The previous failed revision remains in history.</p><label>Corrected source file<input name="file" type="file" accept=".csv,.xlsx" required /></label><button className="oss-button" disabled={busy}>Queue corrected revision</button></form>}</>}
        {currentRun.status === "SUCCEEDED" && <><div className="oss-mini-metrics">{[["Distinct alarms", outcome.distinctAlarms], ["New to comparison", outcome.previousRunId ? outcome.newAlarms : "No baseline"], ["Continuing", outcome.previousRunId ? outcome.continuingAlarms : "No baseline"], ["Not observed again", outcome.previousRunId ? outcome.notObservedAgain : "No baseline"]].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value ?? "—"}</strong></div>)}</div><p className="oss-footnote">“Not observed again” is not confirmed clearance. Alarm identity is provisional until validated against native OEM semantics.</p><div className="oss-actions">{["pdf", "csv"].map(format => <button className="oss-button" key={format} disabled={busy} onClick={() => download(`imports/${currentRun.id}/report/${format}`, `alarm-report-${currentRun.id}.${format}`)}><Download size={15} /> {format.toUpperCase()}</button>)}</div></>}
      </>}</Panel></div>
      {currentRun?.status === "SUCCEEDED" && <Panel title="Alarm evidence" description="Original OSS severity, customer classification and site mapping are shown independently."><div className="oss-table-wrap"><table><thead><tr>{["Resource / alarm", "Circle / site", "Source severity", "Customer classification", "Raised (UTC)", "Trace"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{evidenceRows.map(row => <tr key={row.id}><td className="oss-alarm-text"><strong>{row.resource_name}</strong><small>{row.alarm_code} · {row.alarm_text}</small>{row.supplementary_information && <details><summary>Source details</summary><p>{row.supplementary_information}</p></details>}</td><td>{row.circle_name}<small>{row.site_code || "Site unmapped"}</small></td><td>{row.source_severity || "Not provided"}</td><td><Badge value={row.classification} />{row.included === false || row.included === 0 ? <small>Excluded by catalogue</small> : null}</td><td>{utcLabel(row.raised_at)}</td><td><button className="oss-button" onClick={() => { setHistory({ row, payload: null }); historyController.current?.abort(); const controller = new AbortController(); historyController.current = controller; request(`feeds/${currentRun.feed_id}/alarms/${row.identity_key}/history`, { signal: controller.signal }).then(payload => { if (!controller.signal.aborted) setHistory(previous => previous?.row.id === row.id ? { row, payload } : previous); }).catch(error => { if (error.name !== "AbortError") setError(error.message); }); }}>History</button></td></tr>)}</tbody></table></div><div className="oss-actions"><button className="oss-button" disabled={!cursor} onClick={() => setCursor(0)}>First page</button><button className="oss-button" disabled={evidenceRows.length < 100} onClick={() => setCursor(evidenceRows.at(-1).id)}>Next 100</button></div></Panel>}
    </>}
    {tab === tabs[2] && <Configuration data={data} request={request} act={act} busy={busy} canWrite={canWrite} />}
    {tab === tabs[3] && <Automation key={data.settings.version} data={data} act={act} request={request} busy={busy} canWrite={canWrite} download={download} />}
    {history && <Modal title="Alarm history & operator review" onClose={() => { historyController.current?.abort(); setHistory(null); }}><p>{history.row.resource_name}</p><p className="oss-footnote">{history.row.alarm_text}</p>{history.payload ? <><h3>Source observations</h3>{history.payload.snapshots.map(row => <p key={row.run_id}>{utcLabel(row.snapshot_at)} · {row.classification} · Import #{row.run_id}</p>)}<h3>Operator actions</h3>{history.payload.operatorEvents.map(event => <p key={event.id}><Badge value={event.action} /> {event.note}<small>{utcLabel(event.created_at)}</small></p>)}<p className="oss-footnote">{history.payload.warning}</p>{canWrite && <CreateForm title="Record an operator action" busy={busy} fields={[{ name: "action", label: "Action", options: options(["ACKNOWLEDGED", "RESOLVED", "NOTE"]) }, { name: "note", label: "Reason / evidence", maxLength: 2000 }]} submit={body => act(async () => { await request(`feeds/${currentRun.feed_id}/alarms/${history.row.identity_key}/events`, { method: "POST", body }); const payload = await request(`feeds/${currentRun.feed_id}/alarms/${history.row.identity_key}/history`); setHistory({ ...history, payload }); })} />}</> : <PageState title="Loading alarm history" variant="loading" />}</Modal>}
  </>;
}

function Configuration({ data, request, act, busy, canWrite }) {
  const circles = data.circles.map(row => ({ value: row.id, label: `${row.code} · ${row.name}` }));
  const zones = data.zones.map(row => ({ value: row.id, label: `${row.code} · ${row.name}` }));
  const feeds = data.feeds.map(row => ({ value: row.id, label: row.name }));
  const post = (path, body, config = true) => act(() => request(path, { method: "POST", body }, config));
  return <>
    <Panel title="Source profiles" description="Profiles start inactive. Review circle mapping, catalogue and source timezone before activation."><div className="oss-source-list">{data.feeds.map(feed => <div key={feed.id}><span><strong>{feed.name}</strong><small>{feed.sourceKey} · {feed.oem} {feed.technology} · {feed.fileFormat} · {feed.sourceTimezone} · {feed.dumpType}</small></span><Badge value={feed.active ? "ACTIVE" : "INACTIVE"} />{canWrite && <button className="oss-button" disabled={busy} onClick={() => act(() => request(`feeds/${feed.id}`, { method: "PUT", body: { ...feed, active: !feed.active } }, true))}>{feed.active ? "Deactivate" : "Activate"}</button>}</div>)}</div></Panel>
    {canWrite ? <div className="oss-config-grid">
      <CreateForm title="1. Add a zone" busy={busy} fields={[{ name: "code", label: "Zone code", maxLength: 64 }, { name: "name", label: "Display name", maxLength: 160 }]} submit={body => post("zones", body)} />
      <CreateForm title="2. Add a circle" busy={busy} fields={[{ name: "zoneId", label: "Zone", numeric: true, options: zones }, { name: "code", label: "Canonical circle code", maxLength: 64 }, { name: "name", label: "Circle name", maxLength: 160 }]} submit={body => post("circles", body)} />
      <CreateForm title="3. Map a circle alias" busy={busy} fields={[{ name: "circleId", label: "Canonical circle", numeric: true, options: circles }, { name: "alias", label: "Exact source alias", placeholder: "Use an approved source alias", maxLength: 64 }]} submit={body => post("circle-aliases", body)}><p className="oss-footnote">Aliases are explicit; the portal does not guess that two circle names are equivalent.</p></CreateForm>
      <CreateForm title="4. Add a source feed" busy={busy} fields={[{ name: "sourceKey", label: "Stable source key", maxLength: 64 }, { name: "name", label: "Source name", maxLength: 160 }, { name: "oem", label: "OEM", options: options([...oems, "MIXED"]) }, { name: "technology", label: "Technology", options: options(["2G", "4G"]) }, { name: "fileFormat", label: "Format", options: options(["CSV", "XLSX"]) }, { name: "sheet", label: "Raw sheet (XLSX only)", required: false, maxLength: 31 }, { name: "sourceTimezone", label: "Source timezone", placeholder: "Asia/Kolkata", maxLength: 64 }, { name: "dumpType", label: "Dump semantics", options: options(["SNAPSHOT", "DELTA"]) }, { name: "circleId", label: "Restrict to circle (optional)", numeric: true, required: false, options: circles }]} submit={body => post("feeds", body)} />
      <CreateForm title="5. Add a customer catalogue rule" busy={busy} fields={[{ name: "oem", label: "OEM", options: options(oems) }, { name: "technology", label: "Technology", options: options(["2G", "4G"]) }, { name: "matchField", label: "Match field", options: options(["CODE", "TEXT"]) }, { name: "matchValue", label: "Exact code or alarm text", maxLength: 255 }, { name: "classification", label: "Customer classification", options: options(["CRITICAL", "MAJOR", "MINOR"]) }, { name: "included", label: "Include in dashboard", type: "checkbox" }, { name: "serviceAffecting", label: "Service affecting", type: "checkbox" }, { name: "siteDown", label: "Indicates site down", type: "checkbox" }]} submit={body => post("catalogue", body, false)}><p className="oss-footnote">Enter the customer's catalogue. Source severity is never copied into this classification automatically.</p></CreateForm>
      <CreateForm title="6. Map an OSS object to a site" busy={busy} fields={[{ name: "feedId", label: "Source", numeric: true, options: feeds }, { name: "circleId", label: "Circle", numeric: true, options: circles }, { name: "objectKey", label: "Exact source resource / DN" }, { name: "siteCode", label: "Physical site code", maxLength: 128 }]} submit={({ feedId, ...body }) => post(`feeds/${feedId}/sites`, body, false)} />
    </div> : <p className="oss-footnote">An administrator manages this company's mappings and source profiles.</p>}
    <Panel title="Approved circle aliases" description="Showing up to 200 mappings, including protected canonical codes."><div className="oss-chips">{data.aliases.map(alias => <span key={alias.id}>{alias.alias} → {data.circles.find(circle => circle.id === alias.circleId)?.code || alias.circleId}{alias.canonical ? " · canonical" : canWrite && <button aria-label={`Remove alias ${alias.alias}`} disabled={busy} onClick={() => act(() => request(`circle-aliases/${alias.id}`, { method: "DELETE" }, true))}>×</button>}</span>)}</div></Panel>
    <Panel title="Customer catalogue" description="Rules are captured at import time. Removing a current rule does not rewrite previous snapshots."><div className="oss-table-wrap"><table><thead><tr>{["OEM / RAT", "Match", "Classification", "Included", "Site down", ""].map((label, index) => <th key={index}>{label}</th>)}</tr></thead><tbody>{data.catalogue.map(rule => <tr key={rule.id}><td>{rule.oem} {rule.technology}</td><td>{rule.matchField}: {rule.matchValue}</td><td>{rule.classification}</td><td>{rule.included ? "Yes" : "No"}</td><td>{rule.siteDown ? "Yes" : "No"}</td><td>{canWrite && <button className="oss-button" disabled={busy} onClick={() => act(() => request(`catalogue/${rule.id}`, { method: "DELETE" }))}>Remove</button>}</td></tr>)}</tbody></table></div>{!data.catalogue.length && <p className="oss-footnote">No customer rules configured. Imported alarms will retain an explicit UNMAPPED classification.</p>}</Panel>
  </>;
}

function Automation({ data, act, request, busy, canWrite, download }) {
  const [settings, setSettings] = useState(data.settings);
  const circles = data.circles.map(circle => ({ value: circle.id, label: circle.name }));
  const save = body => act(() => request("automation", { method: "PUT", body }), "Automation settings saved. New imports capture these settings.");
  const routeFields = [{ name: "key", label: "Route / policy key", maxLength: 64 }, { name: "circleId", label: "Circle scope (optional)", numeric: true, required: false, options: circles }, { name: "recipients", label: "Recipient emails", placeholder: "Comma-separated approved addresses", maxLength: 4000 }, { name: "mode", label: "Delivery mode", options: options(data.status.smtpEnabled ? ["CAPTURE", "SMTP"] : ["CAPTURE"]) }];
  return <>
    <Panel title="Automation controls" description="CAPTURE creates a downloadable email preview. SMTP ACCEPTED means the provider accepted the message, not inbox delivery."><div className="oss-mini-metrics"><div><small>Processing</small><strong>{data.status.workflowEnabled ? "Enabled" : "Disabled"}</strong></div><div><small>Approved input root</small><strong>{data.status.inputRootConfigured ? "Configured" : "Not configured"}</strong></div><div><small>Outbound SMTP</small><strong>{data.status.smtpEnabled ? "Enabled" : "Disabled"}</strong></div></div>{canWrite && <form className="oss-import" onSubmit={event => { event.preventDefault(); save(settings); }}><label className="oss-check"><span>Enable configured automation</span><input type="checkbox" checked={settings.enabled} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} /></label><label>Source freshness limit (minutes)<input type="number" min="1" max="10080" required value={settings.freshnessMinutes} onChange={event => setSettings({ ...settings, freshnessMinutes: Number(event.target.value) })} /></label><button className="oss-button oss-primary" disabled={busy}>Save controls</button></form>}<p className="oss-footnote">{data.status.folderStatus?.[0]?.last_poll_message || "No folder polling recorded. Manual source imports remain available."}</p></Panel>
    {canWrite && <div className="oss-config-grid">
      <CreateForm title="Report recipients" fields={routeFields} busy={busy} submit={body => save({ ...settings, reports: [...settings.reports, { ...body, recipients: body.recipients.split(",").map(value => value.trim()).filter(Boolean) }] })} />
      <CreateForm title="Escalation policy" fields={[...routeFields, { name: "classification", label: "Included customer classification", options: options(["CRITICAL", "MAJOR", "MINOR"]) }, { name: "minAgeHours", label: "Minimum age (hours)", type: "number", numeric: true }]} busy={busy} submit={body => save({ ...settings, escalations: [...settings.escalations, { ...body, recipients: body.recipients.split(",").map(value => value.trim()).filter(Boolean) }] })}><p className="oss-footnote">Evaluated against each fresh source snapshot, once per alarm identity and policy definition.</p></CreateForm>
      {data.status.inputRootConfigured && <CreateForm title="Daily folder watch" busy={busy} fields={[{ name: "feedId", label: "Source", numeric: true, options: data.feeds.map(feed => ({ value: feed.id, label: feed.name })) }, { name: "folder", label: "Folder relative to approved input root" }, { name: "timestampSource", label: "Snapshot timestamp source", options: options(["SIDECAR", "FILE_MODIFIED_UTC"]) }, { name: "windowStart", label: "Local processing start (optional)", type: "time", required: false }, { name: "windowEnd", label: "Local delivery deadline (optional)", type: "time", required: false }, { name: "timezone", label: "Schedule timezone (if using a window)", placeholder: "Asia/Kolkata", required: false }]} submit={body => save({ ...settings, watches: [...settings.watches, body] })}><p className="oss-footnote">SIDECAR uses a .ready.json with checksum and snapshotAt. File-modified mode uses the stable file's UTC modification time. Configure only the agreed source convention.</p></CreateForm>}
    </div>}
    <Panel title="Configured routes, escalation stages & watches"><div className="oss-source-list">{[...["reports", "escalations", "watches"].flatMap(type => settings[type].map((item, index) => ({ type, index, item })))].map(({ type, index, item }) => <div key={`${type}-${index}`}><span><strong>{type}: {item.key || `Feed ${item.feedId}`}</strong><small>{item.recipients?.join(", ") || `${item.folder} · ${item.timestampSource}`}{item.classification ? ` · ${item.classification} after ${item.minAgeHours}h` : ""}</small></span>{item.mode && <Badge value={item.mode} />}{canWrite && <button className="oss-button" disabled={busy} onClick={() => save({ ...settings, [type]: settings[type].filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>}</div>)}</div></Panel>
    <Panel title="Delivery history" description="Unknown SMTP outcomes require reconciliation; automatic retries are blocked."><div className="oss-table-wrap"><table><thead><tr>{["Delivery", "Import", "Mode", "Outcome", "Details", "Action"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{data.deliveries.map(item => <tr key={item.id}><td>#{item.id}</td><td>#{item.run_id}</td><td>{item.mode}</td><td><Badge value={item.status} /></td><td>{item.message}</td><td>{item.status === "CAPTURED" && <button className="oss-button" disabled={busy} onClick={() => download(`deliveries/${item.id}/capture`, `alarm-email-${item.id}.eml`)}>Download email</button>}{item.status === "FAILED" && canWrite && <button className="oss-button" disabled={busy} onClick={() => act(() => request(`deliveries/${item.id}/retry`, { method: "POST" }))}>Retry</button>}</td></tr>)}</tbody></table></div>{!data.deliveries.length && <PageState title="No delivery attempts yet">Add approved recipients and enable automation before submitting a new snapshot.</PageState>}</Panel>
  </>;
}
