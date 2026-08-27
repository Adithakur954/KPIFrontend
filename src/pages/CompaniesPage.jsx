import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import {
  activateCompany,
  blockCompany,
  createCompany,
  fetchCompanies,
} from "@/shared/api/companyService";

const emptyForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
};

function normalizeStatus(status) {
  return String(status || "ACTIVE").trim().toUpperCase();
}

function statusClasses(status) {
  return normalizeStatus(status) === "BLOCKED"
    ? "border-red-100 bg-red-50 text-red-700"
    : "border-emerald-100 bg-emerald-50 text-emerald-700";
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const summary = useMemo(() => {
    const active = companies.filter((company) => normalizeStatus(company.status) === "ACTIVE").length;
    const blocked = companies.filter((company) => normalizeStatus(company.status) === "BLOCKED").length;
    return { active, blocked, total: companies.length };
  }, [companies]);

  useEffect(() => {
    loadCompanies();
  }, []);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3500);
  }

  async function loadCompanies() {
    setLoading(true);
    const response = await fetchCompanies();
    if (response?.success) {
      setCompanies(Array.isArray(response.data) ? response.data : []);
    } else {
      showMessage(response?.message || "Failed to load companies.", "error");
    }
    setLoading(false);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.companyName.trim()) {
      showMessage("Company name is required.", "error");
      return;
    }

    setSaving(true);
    const response = await createCompany({
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      status: "ACTIVE",
    });
    if (response?.success) {
      showMessage(response.message || "Company created successfully.");
      setForm(emptyForm);
      await loadCompanies();
    } else {
      showMessage(response?.message || "Failed to create company.", "error");
    }
    setSaving(false);
  }

  async function toggleCompany(company) {
    setUpdatingId(company.id);
    const blocked = normalizeStatus(company.status) === "BLOCKED";
    const response = blocked
      ? await activateCompany(company.id)
      : await blockCompany(company.id);
    if (response?.success) {
      showMessage(response.message || "Company updated successfully.");
      await loadCompanies();
    } else {
      showMessage(response?.message || "Failed to update company.", "error");
    }
    setUpdatingId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Company Management</h1>
            <p className="mt-1 text-sm text-slate-500">Create companies and control tenant access.</p>
          </div>
          <button
            type="button"
            onClick={loadCompanies}
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

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Total Companies", summary.total, Building2],
            ["Active", summary.active, CheckCircle],
            ["Blocked", summary.blocked, ShieldAlert],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create Company</h2>
                <p className="text-xs text-slate-500">New companies start as active.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Company Name</label>
                <input
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Contact Name</label>
                <input
                  value={form.contactName}
                  onChange={(event) => updateField("contactName", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Primary contact"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="admin@company.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Address"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Company
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <Building2 className="h-5 w-5 text-slate-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
                <p className="text-xs text-slate-500">{companies.length} company record(s)</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading companies...
              </div>
            ) : companies.length === 0 ? (
              <div className="py-20 text-center text-sm font-semibold text-slate-600">No companies found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {companies.map((company) => {
                      const blocked = normalizeStatus(company.status) === "BLOCKED";
                      return (
                        <tr key={company.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{company.companyName}</p>
                            <p className="text-xs text-slate-500">ID {company.id}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <p>{company.contactName || "-"}</p>
                            <p className="text-xs">{company.email || company.phone || ""}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(company.status)}`}>
                              {normalizeStatus(company.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => toggleCompany(company)}
                              disabled={updatingId === company.id}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-60 ${
                                blocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                              }`}
                            >
                              {updatingId === company.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : blocked ? (
                                <Unlock className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                              {blocked ? "Activate" : "Block"}
                            </button>
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
