import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw, AlertTriangle, Building2 } from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { downloadNativeAlarmReport, fetchAlarmCompanies, fetchNativeAlarmSummary } from "../services/nativeAlarmService";

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const count = value => Number(value ?? 0).toLocaleString();
const utc = value => {
  if (!value) return "Not available";
  const date = new Date(/(?:z|[+-]\d{2}:?\d{2})$/i.test(String(value)) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
};
function initialCutoff() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function SummaryTable({ groups, circle = false }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(groups.length / 25));
  const current = Math.min(page, pageCount);
  const visible = groups.slice((current - 1) * 25, current * 25);
  return <><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm">
    <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr>
      {["Zone", ...(circle ? ["Circle"] : []), "Technology", "Observed", "Included", "Critical", "Major", "Minor", "Service affecting", "Known down sites", "<12h", "12–48h", ">48–<72h", "≥72h"].map(label => <th className="whitespace-nowrap px-3 py-3" key={label}>{label}</th>)}
    </tr></thead><tbody>{visible.map(group => <tr className="border-t border-slate-100" key={`${group.zone}-${group.circleId ?? "zone"}-${group.technology}`}>
      <td className="px-3 py-3 font-medium">{group.zone}</td>{circle && <td className="px-3 py-3">{group.circle}</td>}<td className="px-3 py-3">{group.technology}</td>
      {[group.observedRecords, group.includedRecords, group.critical, group.major, group.minor, group.serviceAffectingRecords, group.knownDownSites,
        group.downSiteAge?.under12Hours, group.downSiteAge?.from12To48Hours, group.downSiteAge?.above48Under72Hours, group.downSiteAge?.atLeast72Hours].map((value, index) => <td className="px-3 py-3 tabular-nums" key={index}>{count(value)}</td>)}
  </tr>)}</tbody></table></div>{pageCount > 1 && <nav aria-label={`${circle ? "Circle" : "Zone"} summary pages`} className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 p-3 text-sm">
    <span>{(current - 1) * 25 + 1}–{Math.min(current * 25, groups.length)} of {count(groups.length)} rows</span>
    <button className={buttonClass} disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button>
    <button className={buttonClass} disabled={current === pageCount} onClick={() => setPage(current + 1)}>Next</button>
  </nav>}</>;
}

export default function NativeAlarmSummary() {
  const { user } = useAuth();
  const isSuperAdmin = String(user?.role || "").trim().toUpperCase() === "SUPER_ADMIN";
  const assignedCompany = String(user?.companyId || user?.company?.id || "");
  const [selectedCompany, setSelectedCompany] = useState("");
  const company = isSuperAdmin ? selectedCompany : assignedCompany;
  const [companies, setCompanies] = useState([]);
  const [cutoff, setCutoff] = useState(initialCutoff);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");
  const [circleId, setCircleId] = useState("");
  const active = useRef(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const controller = new AbortController();
    fetchAlarmCompanies(controller.signal).then(setCompanies).catch(error => {
      if (!controller.signal.aborted) setCompanyError(error.message || "Company list could not be loaded.");
    });
    return () => controller.abort();
  }, [isSuperAdmin]);

  const load = useCallback(async () => {
    active.current?.abort();
    if (!company) { setData(null); setLoading(false); return; }
    const controller = new AbortController(); active.current = controller;
    setData(null); setError(""); setExportError(""); setCircleId("");
    const date = new Date(cutoff);
    if (Number.isNaN(date.getTime())) { setError("Choose a valid report cutoff."); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetchNativeAlarmSummary(company, date.toISOString(), controller.signal);
      if (!controller.signal.aborted) setData(response);
    } catch (error) {
      if (!controller.signal.aborted) setError(error.message || "Alarm summaries could not be loaded.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [company, cutoff]);

  useEffect(() => { void load(); return () => active.current?.abort(); }, [load]);

  async function download(format) {
    setExporting(format); setExportError("");
    try { await downloadNativeAlarmReport(company, data.asOf, circleId, format); }
    catch (error) { setExportError(error.message || "Report could not be downloaded."); }
    finally { setExporting(""); }
  }

  const summary = data?.reportSummary;
  const circleRows = summary?.circles || [];
  const circles = [...new Map(circleRows.map(group => [String(group.circleId), group.circle])).entries()];
  const shown = circleId ? circleRows.filter(group => String(group.circleId) === circleId) : circleRows;
  const missingFeeds = Math.max(0, Number(data?.configuredActiveFeeds || 0) - (data?.sources?.length || 0));

  return <section className="space-y-5" aria-label="National and circle alarm summaries">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">National &amp; circle summaries</h2>
      <p className="mt-1 text-sm text-slate-600">Customer-classified OSS snapshots for 2G and 4G, with source evidence and report downloads.</p>
      <div className="mt-4 grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-2 text-sm font-medium text-slate-700"><span className="flex items-center gap-2"><Building2 size={16} />Company</span>
          {isSuperAdmin ? <select className={inputClass} value={selectedCompany} onChange={event => setSelectedCompany(event.target.value)}>
            <option value="">Select a company</option>{companies.map(item => <option value={item.id} key={item.id}>{item.companyName || item.company_name || `Company ${item.id}`}</option>)}
          </select> : <div className={inputClass}>{assignedCompany ? (user?.companyName || user?.company?.companyName || `Company ${assignedCompany}`) : "No assigned company"}</div>}
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700"><span>Report cutoff (your local time)</span><input className={inputClass} type="datetime-local" value={cutoff} onChange={event => setCutoff(event.target.value)} /></label>
        <button className={buttonClass} disabled={!company || loading} onClick={load}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh summary</button>
      </div>
      {companyError && <p role="alert" className="mt-3 text-sm text-red-700">{companyError}</p>}
      {!company && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{isSuperAdmin ? "Select the company whose alarms you want to review." : "Ask your administrator to assign your account to a company."}</p>}
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Loading source snapshots and summaries…</div>}
    {data && !summary && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Detailed summaries are unavailable. Please contact your administrator.</div>}
    {summary && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Observed records", summary.observedRecords], ["Included by customer rules", summary.includedRecords], ["Known down sites", summary.knownDownSites], ["Unmapped catalogue", summary.unmappedCatalogue]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{count(value)}</p></div>)}</div>
      {!data.sources?.length ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No completed OSS snapshots are available at this cutoff. Source imports must complete before a report can be generated.</div> : <>
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="min-w-48 flex-1 space-y-2 text-sm font-medium text-slate-700"><span>Report scope</span><select className={inputClass} value={circleId} onChange={event => setCircleId(event.target.value)}><option value="">National — all circles</option>{circles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          {["xlsx", "pdf", "csv"].map(format => <button key={format} disabled={Boolean(exporting)} onClick={() => download(format)} className={buttonClass}><Download size={16} />{exporting === format ? "Preparing…" : format === "xlsx" ? "Excel report" : format.toUpperCase()}</button>)}
          {exportError && <p role="alert" className="w-full text-sm text-red-700">{exportError}</p>}
        </div>
        {!circleId && <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h3 className="p-4 font-semibold text-slate-900">Zone summary</h3><SummaryTable groups={summary.zones || []} /></div>}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><h3 className="p-4 font-semibold text-slate-900">Circle summary</h3><SummaryTable key={circleId || "all"} groups={shown} circle /></div>
      </>}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="flex items-center gap-2 font-semibold"><AlertTriangle size={17} />Source coverage and pending inputs</p>
        {summary.unmappedCatalogue > 0 && <p className="mt-2">{count(summary.unmappedCatalogue)} observations have no matching customer classification rule.</p>}
        {circleRows.some(group => group.unmappedSites > 0) && <p className="mt-2">{count(circleRows.reduce((total, group) => total + Number(group.unmappedSites || 0), 0))} observations lack a site mapping. They are excluded from known-down-site counts.</p>}
        {missingFeeds > 0 && <p className="mt-2">{missingFeeds} configured source(s) have no completed snapshot at this cutoff.</p>}
        <p className="mt-2">MS2/LR, site-up totals and operational reasons are not inferred. Missing inputs stay blank in Excel.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">{summary.pendingOperationalInputs.map(input => <li key={input}>{input}</li>)}</ul>
      </div>
      <details className="rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold text-slate-800">Source timestamps &amp; calculation notes</summary>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">{data.sources?.map(source => <li key={source.id}>Feed #{source.feed_id} · Import #{source.id} · {utc(source.snapshot_at)}</li>)}</ul>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-slate-600">{summary.notes.map(note => <li key={note}>{note}</li>)}</ul>
      </details>
    </>}
  </section>;
}
