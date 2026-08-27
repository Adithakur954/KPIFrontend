import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createUserAccount,
  fetchUsers,
} from "@/shared/api/userService";
import { fetchCompanies } from "@/shared/api/companyService";
import { useAuth } from "@/shared/context/AuthContext";

const emptyForm = {
  email: "",
  password: "",
  companyId: "",
  role: "USER",
  status: "ACTIVE",
};

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function statusClasses(status) {
  return normalizeRole(status) === "BLOCKED"
    ? "border-red-100 bg-red-50 text-red-700"
    : "border-emerald-100 bg-emerald-50 text-emerald-700";
}

export default function CreateAccountPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const isSuperAdmin = normalizeRole(user?.role) === "SUPER_ADMIN";

  const sortedUsers = useMemo(() => {
    return [...users].sort((first, second) => {
      const firstRole = normalizeRole(first.role) === "SUPER_ADMIN" ? 0 : 1;
      const secondRole = normalizeRole(second.role) === "SUPER_ADMIN" ? 0 : 1;
      if (firstRole !== secondRole) return firstRole - secondRole;
      return String(first.email || "").localeCompare(String(second.email || ""));
    });
  }, [users]);

  const companyById = useMemo(() => {
    const map = new Map();
    companies.forEach((company) => map.set(Number(company.id), company));
    return map;
  }, [companies]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  async function loadUsers() {
    setLoading(true);
    const [usersResponse, companiesResponse] = await Promise.all([
      fetchUsers(),
      fetchCompanies(),
    ]);
    if (usersResponse?.success) {
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
    } else {
      showMessage(usersResponse?.message || "Failed to load accounts.", "error");
    }
    if (companiesResponse?.success) {
      setCompanies(Array.isArray(companiesResponse.data) ? companiesResponse.data : []);
    } else {
      showMessage(companiesResponse?.message || "Failed to load companies.", "error");
    }
    setLoading(false);
  }

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 3500);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload() {
    return {
      email: form.email.trim(),
      password: form.password,
      role: form.role,
      status: form.status,
      companyId: form.companyId ? Number(form.companyId) : null,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      showMessage("Email and password are required.", "error");
      return;
    }

    setSaving(true);
    const response = await createUserAccount(buildPayload());
    if (response?.success) {
      showMessage(response.message || "Account created successfully.");
      setForm(emptyForm);
      await loadUsers();
    } else {
      showMessage(response?.message || "Failed to create account.", "error");
    }
    setSaving(false);
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-500">
            Only a super admin can create and view accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Create Account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Add portal users and manage account access.
            </p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {message && (
          <div
            className={`rounded-xl border p-4 text-sm font-medium ${
              messageType === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New Account</h2>
                <p className="text-xs text-slate-500">Password needs 8+ characters.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="user@company.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="Example@123"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Company
                </label>
                <select
                  value={form.companyId}
                  onChange={(event) => updateField("companyId", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">No company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Role
                  </label>
                  <select
                    value={form.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) => updateField("status", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="BLOCKED">Blocked</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Create Account
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>
                <p className="text-xs text-slate-500">{sortedUsers.length} saved account(s)</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading accounts...
              </div>
            ) : sortedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Users className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No accounts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {sortedUsers.map((account) => (
                      <tr key={account.id || account.email} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {account.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <ShieldCheck className="h-3 w-3" />
                            {normalizeRole(account.role) || "USER"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {companyById.get(Number(account.companyId))?.companyName || account.companyId || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(account.status)}`}
                          >
                            <CheckCircle className="h-3 w-3" />
                            {normalizeRole(account.status) || "ACTIVE"}
                          </span>
                        </td>
                      </tr>
                    ))}
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
