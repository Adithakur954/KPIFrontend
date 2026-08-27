import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import {
  activateCompany,
  blockCompany,
  createCompany,
  fetchCompanies,
} from "@/shared/api/companyService";
import {
  blockLicense,
  createLicense,
  downloadLicenseFile,
  fetchLicenses,
} from "@/shared/api/licenseService";
import { createUserAccount, fetchUsers } from "@/shared/api/userService";

const tabs = [
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "licenses", label: "Licenses", icon: KeyRound },
  { id: "users", label: "Accounts", icon: Users },
];

const emptyCompanyForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
};

const emptyLicenseForm = {
  companyId: "",
  deviceId: "",
  expiresAt: "",
  maxUsers: "5",
  plan: "BASIC",
};

const emptyUserForm = {
  email: "",
  password: "",
  companyId: "",
  role: "USER",
  status: "ACTIVE",
};

function normalize(value, fallback = "ACTIVE") {
  return String(value || fallback).trim().toUpperCase();
}

function statusClasses(status) {
  return normalize(status) === "BLOCKED"
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

export default function AdminManagementPage() {
  const [activeTab, setActiveTab] = useState("companies");
  const [companies, setCompanies] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [licenseForm, setLicenseForm] = useState(emptyLicenseForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const companyById = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => map.set(Number(company.id), company));
    return map;
  }, [companies]);

  const summary = useMemo(() => {
    const activeCompanies = companies.filter((company) => normalize(company.status) === "ACTIVE").length;
    const activeLicenses = licenses.filter((license) => normalize(license.status) === "ACTIVE").length;
    const activeUsers = users.filter((item) => normalize(item.status) === "ACTIVE").length;
    return { activeCompanies, activeLicenses, activeUsers };
  }, [companies, licenses, users]);

  useEffect(() => {
    loadAll();
  }, []);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3500);
  }

  async function loadAll() {
    setLoading(true);
    const [companiesResponse, licensesResponse, usersResponse] = await Promise.all([
      fetchCompanies(),
      fetchLicenses(),
      fetchUsers(),
    ]);

    if (companiesResponse?.success) {
      setCompanies(Array.isArray(companiesResponse.data) ? companiesResponse.data : []);
    }
    if (licensesResponse?.success) {
      setLicenses(Array.isArray(licensesResponse.data) ? licensesResponse.data : []);
    }
    if (usersResponse?.success) {
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
    }

    const errorMessage =
      !companiesResponse?.success
        ? companiesResponse?.message
        : !licensesResponse?.success
          ? licensesResponse?.message
          : !usersResponse?.success
            ? usersResponse?.message
            : "";
    if (errorMessage) showMessage(errorMessage, "error");
    setLoading(false);
  }

  async function handleCreateCompany(event) {
    event.preventDefault();
    if (!companyForm.companyName.trim()) {
      showMessage("Company name is required.", "error");
      return;
    }
    setSaving(true);
    const response = await createCompany({
      ...companyForm,
      companyName: companyForm.companyName.trim(),
      status: "ACTIVE",
    });
    if (response?.success) {
      setCompanyForm(emptyCompanyForm);
      showMessage("Company created.");
      await loadAll();
    } else {
      showMessage(response?.message || "Failed to create company.", "error");
    }
    setSaving(false);
  }

  async function handleToggleCompany(company) {
    const blocked = normalize(company.status) === "BLOCKED";
    setWorkingId(`company-${company.id}`);
    const response = blocked
      ? await activateCompany(company.id)
      : await blockCompany(company.id);
    if (response?.success) {
      showMessage(blocked ? "Company activated." : "Company blocked.");
      await loadAll();
    } else {
      showMessage(response?.message || "Failed to update company.", "error");
    }
    setWorkingId("");
  }

  async function handleCreateLicense(event) {
    event.preventDefault();
    if (!licenseForm.companyId || !licenseForm.deviceId.trim() || !licenseForm.expiresAt || !licenseForm.maxUsers) {
      showMessage("Company, device id, expiry date, and max users are required.", "error");
      return;
    }
    setSaving(true);
    const response = await createLicense({
      companyId: Number(licenseForm.companyId),
      deviceId: licenseForm.deviceId.trim(),
      expiresAt: licenseForm.expiresAt,
      maxUsers: Number(licenseForm.maxUsers),
      plan: licenseForm.plan,
      status: "ACTIVE",
    });
    if (response?.success) {
      setLicenseForm(emptyLicenseForm);
      showMessage("License created.");
      await loadAll();
    } else {
      showMessage(response?.message || "Failed to create license.", "error");
    }
    setSaving(false);
  }

  async function handleDownloadLicense(license) {
    setWorkingId(`license-download-${license.id}`);
    try {
      const blob = await downloadLicenseFile(license.id);
      const company = companyById.get(Number(license.companyId));
      const name = String(company?.companyName || `company-${license.companyId}`)
        .replace(/[^a-z0-9_-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      downloadBlob(blob, `${name || "company"}-license.dat`);
      showMessage("License downloaded.");
    } catch (error) {
      showMessage(error.message || "Failed to download license.", "error");
    }
    setWorkingId("");
  }

  async function handleBlockLicense(license) {
    setWorkingId(`license-block-${license.id}`);
    const response = await blockLicense(license.id);
    if (response?.success) {
      showMessage("License blocked.");
      await loadAll();
    } else {
      showMessage(response?.message || "Failed to block license.", "error");
    }
    setWorkingId("");
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    if (!userForm.email.trim() || !userForm.password.trim()) {
      showMessage("Email and password are required.", "error");
      return;
    }
    setSaving(true);
    const response = await createUserAccount({
      email: userForm.email.trim(),
      password: userForm.password,
      role: userForm.role,
      status: userForm.status,
      companyId: userForm.companyId ? Number(userForm.companyId) : null,
    });
    if (response?.success) {
      setUserForm(emptyUserForm);
      showMessage("Account created.");
      await loadAll();
    } else {
      showMessage(response?.message || "Failed to create account.", "error");
    }
    setSaving(false);
  }

  const activeCompanies = companies.filter((company) => normalize(company.status) === "ACTIVE");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Admin Management</h1>
            <p className="mt-1 text-sm text-slate-500">Companies, licenses, and user access in one workspace.</p>
          </div>
          <button
            type="button"
            onClick={loadAll}
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
            ["Active Companies", summary.activeCompanies, Building2],
            ["Active Licenses", summary.activeLicenses, KeyRound],
            ["Active Users", summary.activeUsers, Users],
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

        <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "companies" && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={handleCreateCompany} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <PanelTitle icon={Building2} title="Create Company" subtitle="New companies start active." />
              <TextInput label="Company Name" value={companyForm.companyName} onChange={(value) => setCompanyForm({ ...companyForm, companyName: value })} />
              <TextInput label="Contact Name" value={companyForm.contactName} onChange={(value) => setCompanyForm({ ...companyForm, contactName: value })} />
              <TextInput label="Email" type="email" value={companyForm.email} onChange={(value) => setCompanyForm({ ...companyForm, email: value })} />
              <TextInput label="Phone" value={companyForm.phone} onChange={(value) => setCompanyForm({ ...companyForm, phone: value })} />
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
                <textarea
                  rows={3}
                  value={companyForm.address}
                  onChange={(event) => setCompanyForm({ ...companyForm, address: event.target.value })}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <PrimaryButton saving={saving} icon={Plus}>Create Company</PrimaryButton>
            </form>

            <DataPanel title="Companies" subtitle={`${companies.length} company record(s)`} loading={loading}>
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
                    const blocked = normalize(company.status) === "BLOCKED";
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
                        <td className="px-4 py-3"><StatusBadge status={company.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleCompany(company)}
                            disabled={workingId === `company-${company.id}`}
                            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 ${
                              blocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                            }`}
                          >
                            {blocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            {blocked ? "Activate" : "Block"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataPanel>
          </div>
        )}

        {activeTab === "licenses" && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={handleCreateLicense} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <PanelTitle icon={KeyRound} title="Create License" subtitle="Issue license.dat for a device." />
              <SelectInput
                label="Company"
                value={licenseForm.companyId}
                onChange={(value) => setLicenseForm({ ...licenseForm, companyId: value })}
                options={activeCompanies.map((company) => ({ value: company.id, label: company.companyName }))}
                placeholder="Select company"
              />
              <TextInput label="Device ID" value={licenseForm.deviceId} onChange={(value) => setLicenseForm({ ...licenseForm, deviceId: value })} placeholder="AA-BB-CC-DD-EE-FF" />
              <TextInput label="Expiry Date" type="date" value={licenseForm.expiresAt} onChange={(value) => setLicenseForm({ ...licenseForm, expiresAt: value })} />
              <TextInput label="Max Users" type="number" value={licenseForm.maxUsers} onChange={(value) => setLicenseForm({ ...licenseForm, maxUsers: value })} />
              <SelectInput
                label="Plan"
                value={licenseForm.plan}
                onChange={(value) => setLicenseForm({ ...licenseForm, plan: value })}
                options={["BASIC", "PRO", "ENTERPRISE"].map((plan) => ({ value: plan, label: plan }))}
              />
              <PrimaryButton saving={saving} icon={Plus}>Create License</PrimaryButton>
            </form>

            <DataPanel title="Licenses" subtitle={`${licenses.length} license record(s)`} loading={loading}>
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
                    const blocked = normalize(license.status) === "BLOCKED";
                    return (
                      <tr key={license.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{companyById.get(Number(license.companyId))?.companyName || `Company ${license.companyId}`}</p>
                          <p className="text-xs text-slate-500">{license.licenseKey}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{license.deviceId}</td>
                        <td className="px-4 py-3 text-slate-600">{license.expiresAt || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{license.maxUsers || 1}</td>
                        <td className="px-4 py-3"><StatusBadge status={license.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleDownloadLicense(license)}
                              disabled={workingId === `license-download-${license.id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </button>
                            {!blocked && (
                              <button
                                type="button"
                                onClick={() => handleBlockLicense(license)}
                                disabled={workingId === `license-block-${license.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                              >
                                <Lock className="h-3.5 w-3.5" />
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
            </DataPanel>
          </div>
        )}

        {activeTab === "users" && (
          <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
            <form onSubmit={handleCreateUser} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <PanelTitle icon={UserPlus} title="Create Account" subtitle="Assign company and role." />
              <TextInput label="Email" type="email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} placeholder="user@company.com" />
              <TextInput label="Password" type="password" value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} placeholder="Example@123" />
              <SelectInput
                label="Company"
                value={userForm.companyId}
                onChange={(value) => setUserForm({ ...userForm, companyId: value })}
                options={companies.map((company) => ({ value: company.id, label: company.companyName }))}
                placeholder="No company"
              />
              <SelectInput
                label="Role"
                value={userForm.role}
                onChange={(value) => setUserForm({ ...userForm, role: value })}
                options={["USER", "ADMIN", "SUPER_ADMIN"].map((role) => ({ value: role, label: role.replace("_", " ") }))}
              />
              <SelectInput
                label="Status"
                value={userForm.status}
                onChange={(value) => setUserForm({ ...userForm, status: value })}
                options={["ACTIVE", "BLOCKED"].map((status) => ({ value: status, label: status }))}
              />
              <PrimaryButton saving={saving} icon={UserPlus}>Create Account</PrimaryButton>
            </form>

            <DataPanel title="Accounts" subtitle={`${users.length} account record(s)`} loading={loading}>
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((account) => (
                    <tr key={account.id || account.email} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{account.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          <ShieldCheck className="h-3 w-3" />
                          {normalize(account.role, "USER")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{companyById.get(Number(account.companyId))?.companyName || account.companyId || "-"}</td>
                      <td className="px-4 py-3"><StatusBadge status={account.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataPanel>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options, placeholder }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ saving, icon: Icon, children }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function DataPanel({ title, subtitle, loading, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(status)}`}>
      <CheckCircle className="h-3 w-3" />
      {normalize(status)}
    </span>
  );
}
