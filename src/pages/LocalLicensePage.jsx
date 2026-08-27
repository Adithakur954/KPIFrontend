import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  FileUp,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  fetchDeviceId,
  fetchLocalLicenseStatus,
  uploadLocalLicense,
} from "@/shared/api/localLicenseService";

export default function LocalLicensePage() {
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3500);
  }

  async function loadStatus() {
    setLoading(true);
    const [deviceResponse, statusResponse] = await Promise.all([
      fetchDeviceId(),
      fetchLocalLicenseStatus(),
    ]);
    if (deviceResponse?.success) {
      setDeviceId(deviceResponse.data?.deviceId || "");
    }
    if (statusResponse?.success) {
      setStatus(statusResponse.data || null);
    } else {
      setStatus({ valid: false, message: statusResponse?.message || "License status unavailable." });
    }
    setLoading(false);
  }

  async function copyDeviceId() {
    if (!deviceId) return;
    await navigator.clipboard.writeText(deviceId);
    showMessage("Device id copied.");
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      showMessage("Choose a license.dat file first.", "error");
      return;
    }
    setUploading(true);
    const response = await uploadLocalLicense(file);
    if (response?.success) {
      setFile(null);
      showMessage(response.message || "License uploaded.");
      await loadStatus();
    } else {
      showMessage(response?.message || "License upload failed.", "error");
    }
    setUploading(false);
  }

  const valid = Boolean(status?.valid);
  const license = status?.license || {};

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Local License</h1>
            <p className="mt-1 text-sm text-slate-500">Install and validate the license file for this device.</p>
          </div>
          <button
            type="button"
            onClick={loadStatus}
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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Current Device ID</h2>
                  <p className="text-xs text-slate-500">Use this value when creating a license.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <code className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
                  {deviceId || "Loading..."}
                </code>
                <button
                  type="button"
                  onClick={copyDeviceId}
                  disabled={!deviceId}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Upload license.dat</h2>
                  <p className="text-xs text-slate-500">The backend stores the file after validation.</p>
                </div>
              </div>
              <input
                type="file"
                accept=".dat"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
              />
              <button
                type="submit"
                disabled={uploading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Upload License
              </button>
            </form>
          </div>

          <div className={`rounded-lg border bg-white p-6 shadow-sm ${valid ? "border-emerald-200" : "border-red-200"}`}>
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${valid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {valid ? <CheckCircle className="h-6 w-6" /> : <ShieldX className="h-6 w-6" />}
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              {loading ? "Checking License" : valid ? "License Valid" : "License Invalid"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {loading ? "Loading current license status..." : status?.message || "No status message available."}
            </p>

            <div className="mt-6 space-y-3 text-sm">
              {[
                ["Company", license.companyName],
                ["License Key", license.licenseKey],
                ["Device", license.deviceId || status?.deviceId],
                ["Max Users", license.maxUsers],
                ["Expiry", license.expiresAt],
                ["Path", status?.licensePath],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                  <p className="mt-1 break-words font-medium text-slate-800">{value || "-"}</p>
                </div>
              ))}
            </div>

            {!valid && !loading && (
              <div className="mt-5 flex gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Create a license using this device id, then upload the downloaded license.dat here.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
