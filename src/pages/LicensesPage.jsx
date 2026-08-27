import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { fetchCompanies } from "@/shared/api/companyService";
import {
  blockLicense,
  createLicense,
  downloadLicenseFile,
  fetchLicenses,
} from "@/shared/api/licenseService";

const emptyForm = {
  companyId: "",
  deviceId: "",
  expiresAt: "",
  maxUsers: "5",
  plan: "BASIC",
};

function normalizeStatus(status) {
  return String(status || "ACTIVE").trim().toUpperCase();
}

function statusClasses(status) {
  return normalizeStatus(status) === "BLOCKED"
    ? "border-red-100 bg-red-50 text-red-700"
    : "border-emerald-100 bg-emerald-50 text-emerald-700";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function LicensesPage() {
  const [companies, setCompanies] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const companyById = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => map.set(Number(company.id), company));
    return map;
  }, [companies]);

  useEffect(() => {
    loadData();
  }, []);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3500);
  }

  async function loadData() {
    setLoading(true);
    const [companyResponse, licenseResponse] = await Promise.all([
      fetchCompanies(),
      fetchLicenses(),
    ]);

    if (companyResponse?.success) {
      setCompanies(Array.isArray(companyResponse.data) ? companyResponse.data : []);
    } else {
      showMessage(companyResponse?.message || "Failed to load companies.", "error");
    }

    if (licenseResponse?.success) {
      setLicenses(Array.isArray(licenseResponse.data) ? licenseResponse.data : []);
    } else {
      showMessage(licenseResponse?.message || "Failed to load licenses.", "error");
    }
    setLoading(false);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.companyId || !form.deviceId.trim() || !form.expiresAt || !form.maxUsers) {
      showMessage("Company, device id, expiry date, and max users are required.", "error");
      return;
    }

    setSaving(true);
    const response = await createLicense({
      companyId: Number(form.companyId),
      deviceId: form.deviceId.trim(),
      expiresAt: form.expiresAt,
      maxUsers: Number(form.maxUsers),
      plan: form.plan,
      status: "ACTIVE",
    });

    if (response?.success) {
      showMessage(response.message || "License created successfully.");
      setForm(emptyForm);
      await loadData();
    } else {
      showMessage(response?.message || "Failed to create license.", "error");
    }
    setSaving(false);
  }

  async function handleDownload(license) {
    setWorkingId(license.id);
    try {
      const blob = await downloadLicenseFile(license.id);
      const company = companyById.get(Number(license.companyId));
      const safeCompany = String(company?.companyName || `company-${license.companyId}`)
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      downloadBlob(blob, `${safeCompany || "license"}-license.dat`);
      showMessage("License downloaded.");
    } catch (error) {
      showMessage(error.message || "Failed to download license.", "error");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleBlock(license) {
    setWorkingId(license.id);
    const response = await blockLicense(license.id);
    if (response?.success) {
      showMessage(response.message || "License blocked.");
      await loadData();
    } else {
      showMessage(response?.message || "Failed to block license.", "error");
    }
    setWorkingId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">License Management</h1>
            <p className="mt-1 text-sm text-slate-500">Issue device-bound license files for companies.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>

        {message && (
          <div
            className={`rounded-lg border p-4 text-sm font-medium ${
              messageType === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create License</h2>
                <p className="text-xs text-slate-500">The downloaded file is named license.dat.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Company</label>
                <select
                  value={form.companyId}
                  onChange={(event) => updateField("companyId", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Device ID</label>
                <input
                  value={form.deviceId}
                  onChange={(event) => updateField("deviceId", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="AA-BB-CC-DD-EE-FF"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(event) => updateField("expiresAt", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Max Users</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUsers}
                    onChange={(event) => updateField("maxUsers", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Plan</label>
                <select
                  value={form.plan}
                  onChange={(event) => updateField("plan", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create License
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <ShieldCheck className="h-5 w-5 text-slate-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Licenses</h2>
                <p className="text-xs text-slate-500">{licenses.length} license record(s)</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading licenses...
              </div>
            ) : licenses.length === 0 ? (
              <div className="py-20 text-center text-sm font-semibold text-slate-600">No licenses found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Device</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Users</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {licenses.map((license) => {
                      const company = companyById.get(Number(license.companyId));
                      const blocked = normalizeStatus(license.status) === "BLOCKED";
                      return (
                        <tr key={license.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{company?.companyName || `Company ${license.companyId}`}</p>
                            <p className="text-xs text-slate-500">{license.licenseKey}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{license.deviceId}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                              {license.expiresAt || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{license.maxUsers || 1}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(license.status)}`}>
                              {normalizeStatus(license.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownload(license)}
                                disabled={workingId === license.id}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </button>
                              {!blocked && (
                                <button
                                  type="button"
                                  onClick={() => handleBlock(license)}
                                  disabled={workingId === license.id}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {workingId === license.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                                  Block
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
